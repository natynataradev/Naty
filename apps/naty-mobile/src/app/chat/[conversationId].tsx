import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { SCHOOL_ID } from '@/constants/school';
import { useTheme } from '@/hooks/use-theme';
import { formatMessageTime, getInitials } from '@/lib/format';
import { sendTextMessage } from '@/lib/messages-api';
import { isWithinServiceWindow } from '@/lib/service-window';
import { supabase } from '@/lib/supabase';
import type { Message, Template } from '@/types/chat';

// Ya no se usan plantillas en esta pantalla — fuera de la ventana de 24h el
// envío simplemente se deshabilita. Se dejan estas funciones sin usar por si
// se necesitan más adelante.
const TEMPLATES_ENABLED = false;

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
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [keyboardPadding, setKeyboardPadding] = useState(0);
  const listRef = useRef<FlatList<Message>>(null);
  const containerRef = useRef<View>(null);
  const hasLoadedOnce = useRef(false);
  // En un FlatList invertido, offset 0 = pegado al mensaje más nuevo (visualmente
  // abajo). Estos dos refs llevan la cuenta de si el usuario está ahí o leyendo
  // mensajes viejos más arriba, para decidir si un mensaje nuevo mueve la lista.
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templatesFetched, setTemplatesFetched] = useState(false);
  const [sendingTemplateId, setSendingTemplateId] = useState<string | null>(null);

  const withinWindow = isWithinServiceWindow(messages);

  // FlatList con inverted necesita los datos más nuevos primero (índice 0).
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

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

  // POST /messages/send necesita el contactId (no viaja como parámetro de
  // navegación). Se aprovecha la misma consulta para traer el teléfono del
  // contacto, que tampoco viaja como parámetro y se usa en el encabezado.
  useEffect(() => {
    let cancelled = false;

    supabase
      .from('conversations')
      .select('contact_id, contact:contacts ( phone )')
      .eq('id', conversationId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Error obteniendo contact_id de la conversación:', error);
          return;
        }
        setContactId(data.contact_id);
        const contact = Array.isArray(data.contact) ? data.contact[0] : data.contact;
        setContactPhone(contact?.phone ?? null);
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
          const newMessage = payload.new;
          setMessages((prev) =>
            prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]
          );
        }
      )
      .subscribe();

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

  // Con la lista invertida, abrir la conversación ya deja el mensaje más nuevo
  // visible solo (offset 0 es el reposo natural) — no hace falta scroll aquí.
  // Solo bajamos manualmente cuando llegan mensajes nuevos Y el usuario ya
  // estaba viendo el final; si está leyendo mensajes viejos, no lo movemos.
  useEffect(() => {
    const isInitialLoad = prevMessageCountRef.current === 0 && messages.length > 0;
    const grew = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (!grew || isInitialLoad) return;
    if (isNearBottomRef.current) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [messages.length]);

  function handleListScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    isNearBottomRef.current = event.nativeEvent.contentOffset.y <= 150;
  }

  // Cuando aparece el teclado, el último mensaje debe seguir visible.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const subscription = Keyboard.addListener(showEvent, () => {
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
    });
    return () => subscription.remove();
  }, []);

  // Espacio extra debajo de la barra de envío mientras el teclado está abierto.
  // Se mide a mano (en vez de KeyboardAvoidingView) porque este contenedor no
  // tiene encabezado y el sistema a veces ya redimensiona la pantalla solo —
  // si ya lo hizo, la medición da 0 y no se duplica el espacio.
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      requestAnimationFrame(() => {
        containerRef.current?.measureInWindow((x, y, width, height) => {
          const screenY = e.endCoordinates.screenY;
          const padding = Math.max(0, y + height - screenY);
          setKeyboardPadding(padding);
        });
      });
    });

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardPadding(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Ya no se usan plantillas (fuera de la ventana de 24h ahora solo se deshabilita el
  // envío). Se conserva esta consulta por si se vuelve a necesitar, pero no se ejecuta.
  useEffect(() => {
    if (!TEMPLATES_ENABLED || loading || withinWindow || templatesFetched) return;

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

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  // Si el contacto no tiene nombre, el título ya es su teléfono (ver
  // (tabs)/index.tsx) — en ese caso no lo repetimos como subtítulo.
  const showPhoneSubtitle = !!contactPhone && contactPhone !== displayName;

  return (
    <View
      ref={containerRef}
      collapsable={false}
      style={[styles.container, { backgroundColor: theme.background, paddingBottom: keyboardPadding }]}
    >
      <Stack.Screen options={{ title: displayName, headerBackTitle: 'Chats' }} />

      <View style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <ThemedView type="backgroundElement" style={styles.header}>
            <Pressable onPress={handleBack} hitSlop={8} style={styles.backButton}>
              <ThemedText style={styles.backButtonText}>‹</ThemedText>
            </Pressable>
            <ThemedView type="backgroundSelected" style={styles.headerAvatar}>
              <ThemedText type="smallBold">{getInitials(displayName)}</ThemedText>
            </ThemedView>
            <View style={styles.headerInfo}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {displayName}
              </ThemedText>
              {showPhoneSubtitle && (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {contactPhone}
                </ThemedText>
              )}
            </View>
          </ThemedView>

          {loading ? (
            <ThemedView style={styles.center}>
              <ThemedText themeColor="textSecondary">Cargando mensajes…</ThemedText>
            </ThemedView>
          ) : (
            <FlatList
              ref={listRef}
              inverted
              data={reversedMessages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              onScroll={handleListScroll}
              scrollEventThrottle={100}
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

          <ThemedView style={styles.inputBarWrapper}>
            {!withinWindow ? (
              <ThemedText type="small" style={styles.windowClosedNotice}>
                Pasaron más de 24 horas desde el último mensaje de este contacto. WhatsApp no permite
                escribirle desde aquí. Escríbele desde la app de WhatsApp.
              </ThemedText>
            ) : sendError ? (
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
                editable={withinWindow}
                placeholder="Escribe un mensaje…"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text }, !withinWindow && styles.inputDisabled]}
                multiline
              />
              <Pressable
                onPress={handleSend}
                disabled={!withinWindow || !draft.trim() || sending}
                style={[
                  styles.sendButton,
                  (!withinWindow || !draft.trim() || sending) && styles.sendButtonDisabled,
                ]}
              >
                <ThemedText style={styles.sendButtonText}>Enviar</ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 12,
    gap: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.backgroundSelected,
  },
  backButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 32,
    lineHeight: 34,
  },
  headerAvatar: {
    height: 44,
    width: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
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
  windowClosedNotice: {
    paddingHorizontal: Spacing.three,
    lineHeight: 16,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.dark.backgroundSelected,
    padding: Spacing.one,
    marginHorizontal: 12,
    marginBottom: Spacing.two,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 15,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
  },
  inputDisabled: {
    opacity: 0.4,
  },
  sendButton: {
    backgroundColor: '#22c55e',
    borderRadius: 999,
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
