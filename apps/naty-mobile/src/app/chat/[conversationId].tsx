import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { SCHOOL_ID } from '@/constants/school';
import { useTheme } from '@/hooks/use-theme';
import { formatMessageTime } from '@/lib/format';
import { sendTextMessage } from '@/lib/messages-api';
import { isWithinServiceWindow } from '@/lib/service-window';
import { supabase } from '@/lib/supabase';
import type { Message, Template } from '@/types/chat';

function interpolateTemplate(body: string, contactName: string): string {
  return body.replace(/\{\{nombre\}\}/gi, contactName);
}

export default function ChatScreen() {
  const theme = useTheme();
  const { conversationId, contactName } = useLocalSearchParams<{
    conversationId: string;
    contactName?: string;
  }>();
  const displayName = contactName || 'Chat';

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [contactId, setContactId] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const hasLoadedOnce = useRef(false);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templatesFetched, setTemplatesFetched] = useState(false);
  const [sendingTemplateId, setSendingTemplateId] = useState<string | null>(null);

  const withinWindow = isWithinServiceWindow(messages);

  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, direction, content, type, timestamp, status')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error cargando mensajes:', error);
      return;
    }

    setMessages(data ?? []);
  }, [conversationId]);

  // POST /messages/send necesita el contactId (no viaja como parámetro de navegación).
  useEffect(() => {
    let cancelled = false;

    supabase
      .from('conversations')
      .select('contact_id')
      .eq('id', conversationId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Error obteniendo contact_id de la conversación:', error);
          return;
        }
        setContactId(data.contact_id);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useFocusEffect(
    useCallback(() => {
      loadMessages().finally(() => {
        hasLoadedOnce.current = true;
        setLoading(false);
      });
    }, [loadMessages])
  );

  // Mensajes nuevos de esta conversación aparecen solos vía Supabase Realtime.
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on<Message>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('[realtime] mensaje recibido:', payload.new.id);
          const newMessage = payload.new;
          setMessages((prev) =>
            prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]
          );
        }
      )
      .subscribe((status, err) => {
        console.log('[realtime] estado:', status, err ?? '');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Mientras está fuera de la ventana de 24h, sondea cada 15s por si el
  // contacto responde y la conversación pasa a texto libre — no hay
  // Supabase Realtime configurado todavía, esto es el sustituto simple.
  useEffect(() => {
    if (loading || withinWindow) return;
    const interval = setInterval(() => {
      loadMessages();
    }, 15000);
    return () => clearInterval(interval);
  }, [loading, withinWindow, loadMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    }
  }, [messages.length]);

  // Solo se cargan plantillas cuando de verdad se necesitan (fuera de la ventana de 24h).
  useEffect(() => {
    if (loading || withinWindow || templatesFetched) return;

    let cancelled = false;
    setLoadingTemplates(true);

    supabase
      .from('templates')
      .select('id, name, body')
      .eq('school_id', SCHOOL_ID)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Error cargando plantillas:', error);
        } else {
          setTemplates(data ?? []);
        }
        setTemplatesFetched(true);
        setLoadingTemplates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loading, withinWindow, templatesFetched]);

  async function handleSend() {
    const content = draft.trim();
    if (!content || sending) return;

    if (!contactId) {
      setSendError('No se pudo determinar el contacto de esta conversación. Intenta de nuevo.');
      return;
    }

    setSending(true);
    setSendError('');
    setDraft('');

    try {
      await sendTextMessage(contactId, content);
      await loadMessages();
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      setDraft(content);
      setSendError((err as Error).message || 'No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  }

  async function handleSendTemplate(template: Template) {
    if (sendingTemplateId) return;
    setSendingTemplateId(template.id);

    const content = interpolateTemplate(template.body, displayName);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        direction: 'outbound',
        content,
        type: 'template',
        status: 'sent',
      })
      .select('id, conversation_id, direction, content, type, timestamp, status')
      .single();

    setSendingTemplateId(null);

    if (error) {
      console.error('Error enviando plantilla:', error);
      return;
    }

    setMessages((prev) => [...prev, data]);
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: displayName, headerBackTitle: 'Chats' }} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <SafeAreaView style={styles.flex} edges={['bottom']}>
          {loading ? (
            <ThemedView style={styles.center}>
              <ThemedText themeColor="textSecondary">Cargando mensajes…</ThemedText>
            </ThemedView>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <ThemedView style={styles.center}>
                  <ThemedText themeColor="textSecondary">Sin mensajes todavía.</ThemedText>
                </ThemedView>
              }
              renderItem={({ item }) => {
                const isOutbound = item.direction === 'outbound';
                return (
                  <ThemedView
                    style={[styles.bubbleRow, isOutbound ? styles.bubbleRowRight : styles.bubbleRowLeft]}
                  >
                    <ThemedView
                      type={isOutbound ? 'backgroundSelected' : 'backgroundElement'}
                      style={[styles.bubble, isOutbound ? styles.bubbleOutbound : styles.bubbleInbound]}
                    >
                      {item.type === 'template' && (
                        <ThemedText type="small" themeColor="textSecondary" style={styles.templateTag}>
                          PLANTILLA
                        </ThemedText>
                      )}
                      <ThemedText style={styles.bubbleText}>{item.content}</ThemedText>
                      <ThemedView
                        type={isOutbound ? 'backgroundSelected' : 'backgroundElement'}
                        style={styles.bubbleMeta}
                      >
                        <ThemedText type="small" themeColor="textSecondary">
                          {formatMessageTime(item.timestamp)}
                        </ThemedText>
                        {isOutbound && (
                          <ThemedText type="small" themeColor="textSecondary" style={styles.ticks}>
                            {item.status === 'read' || item.status === 'delivered' ? '✓✓' : '✓'}
                          </ThemedText>
                        )}
                      </ThemedView>
                    </ThemedView>
                  </ThemedView>
                );
              }}
            />
          )}

          {!loading && !withinWindow ? (
            <ThemedView type="backgroundElement" style={styles.templatePicker}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.templatePickerHint}>
                Han pasado más de 24h desde el último mensaje del contacto (o nunca ha escrito). WhatsApp
                exige usar una plantilla pre-aprobada para el siguiente envío.
              </ThemedText>

              {loadingTemplates ? (
                <ActivityIndicator color={theme.textSecondary} style={styles.templateLoading} />
              ) : templates.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No hay plantillas creadas todavía. Créalas desde el panel web (/templates).
                </ThemedText>
              ) : (
                <ScrollView contentContainerStyle={styles.templateList} showsVerticalScrollIndicator={false}>
                  {templates.map((template) => (
                    <Pressable
                      key={template.id}
                      onPress={() => handleSendTemplate(template)}
                      disabled={!!sendingTemplateId}
                      style={({ pressed }) => [
                        styles.templateCard,
                        { borderColor: theme.backgroundSelected },
                        pressed && styles.templateCardPressed,
                      ]}
                    >
                      <ThemedText type="smallBold">{template.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                        {interpolateTemplate(template.body, displayName)}
                      </ThemedText>
                      {sendingTemplateId === template.id && (
                        <ActivityIndicator color={theme.textSecondary} style={styles.templateLoading} />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </ThemedView>
          ) : (
            <ThemedView type="backgroundElement" style={styles.inputBarWrapper}>
              {sendError ? (
                <ThemedText type="small" style={styles.sendError}>
                  {sendError}
                </ThemedText>
              ) : null}
              <ThemedView type="backgroundElement" style={styles.inputBar}>
                <TextInput
                  value={draft}
                  onChangeText={(text) => {
                    setDraft(text);
                    if (sendError) setSendError('');
                  }}
                  placeholder="Escribe un mensaje…"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text }]}
                  multiline
                />
                <Pressable
                  onPress={handleSend}
                  disabled={!draft.trim() || sending}
                  style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
                >
                  <ThemedText style={styles.sendButtonText}>Enviar</ThemedText>
                </Pressable>
              </ThemedView>
            </ThemedView>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: Spacing.one,
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  bubbleInbound: {
    borderBottomLeftRadius: Spacing.half,
  },
  bubbleOutbound: {
    borderBottomRightRadius: Spacing.half,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  templateTag: {
    marginBottom: 2,
    letterSpacing: 0.5,
    fontSize: 10,
  },
  bubbleMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ticks: {
    marginLeft: 2,
  },
  inputBarWrapper: {
    gap: Spacing.one,
  },
  sendError: {
    color: '#f87171',
    paddingHorizontal: Spacing.three,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 15,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  sendButton: {
    backgroundColor: '#22c55e',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  templatePicker: {
    maxHeight: 320,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  templatePickerHint: {
    lineHeight: 16,
  },
  templateList: {
    gap: Spacing.two,
  },
  templateCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: 2,
  },
  templateCardPressed: {
    opacity: 0.6,
  },
  templateLoading: {
    marginTop: Spacing.one,
  },
});
