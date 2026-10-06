import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useNavigation } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { SCHOOL_ID } from '@/constants/school';
import { useTheme } from '@/hooks/use-theme';
import { formatMessageTime, getInitials } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { ConversationListItem } from '@/types/chat';

export default function ChatsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select(
        `
        id,
        last_message_at,
        status,
        contact:contacts ( id, name, phone ),
        messages ( content, timestamp )
      `
      )
      .eq('school_id', SCHOOL_ID)
      .order('last_message_at', { ascending: false })
      .order('timestamp', { foreignTable: 'messages', ascending: false })
      .limit(1, { foreignTable: 'messages' });

    if (error) {
      console.error('Error cargando conversaciones:', error);
      return;
    }

    const items: ConversationListItem[] = (data ?? []).map((row: any) => ({
      id: row.id,
      last_message_at: row.last_message_at,
      status: row.status,
      contact: row.contact ?? null,
      lastMessage: row.messages?.[0] ?? null,
    }));

    setConversations(items);
  }, []);

  useEffect(() => {
    loadConversations().finally(() => setLoading(false));
  }, [loadConversations]);

  // La lista se refresca sola cuando llega cualquier mensaje nuevo (no se
  // puede filtrar por conversación aquí: esta pantalla cubre todas).
  useEffect(() => {
    const channel = supabase
      .channel('chats-list-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleSignOut} hitSlop={12} style={{ marginRight: Spacing.three }}>
          <ThemedText type="linkPrimary">Salir</ThemedText>
        </Pressable>
      ),
    });
  }, [navigation]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText themeColor="textSecondary">Cargando conversaciones…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.text} />
          }
          ListEmptyComponent={
            <ThemedView style={styles.center}>
              <ThemedText themeColor="textSecondary">Sin conversaciones todavía.</ThemedText>
            </ThemedView>
          }
          renderItem={({ item }) => {
            const name = item.contact?.name ?? item.contact?.phone ?? 'Sin nombre';
            return (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/chat/[conversationId]',
                    params: { conversationId: item.id, contactName: name },
                  })
                }
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <ThemedView type="backgroundElement" style={styles.avatar}>
                  <ThemedText type="smallBold">{getInitials(name)}</ThemedText>
                </ThemedView>

                <ThemedView style={styles.rowBody}>
                  <ThemedView style={styles.rowHeader}>
                    <ThemedText type="smallBold" numberOfLines={1} style={styles.rowName}>
                      {name}
                    </ThemedText>
                    {item.lastMessage && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatMessageTime(item.lastMessage.timestamp)}
                      </ThemedText>
                    )}
                  </ThemedView>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {item.lastMessage?.content ?? 'Sin mensajes'}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  rowPressed: {
    opacity: 0.6,
  },
  avatar: {
    height: 44,
    width: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowName: {
    flex: 1,
  },
});
