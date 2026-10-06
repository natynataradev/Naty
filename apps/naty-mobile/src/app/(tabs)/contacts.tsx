import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { SCHOOL_ID } from '@/constants/school';
import { useTheme } from '@/hooks/use-theme';
import { findOrCreateConversation } from '@/lib/conversations';
import { supabase } from '@/lib/supabase';
import type { ChatContact } from '@/types/chat';

export default function ContactsScreen() {
  const theme = useTheme();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    async function loadContacts() {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, phone')
        .eq('school_id', SCHOOL_ID)
        .order('name', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Error cargando contactos:', error);
        setLoading(false);
        return;
      }

      setContacts(data ?? []);
      setLoading(false);
    }

    loadContacts();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const name = (c.name ?? '').toLowerCase();
      const phone = c.phone.toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [contacts, query]);

  const handleOpenContact = useCallback(async (contact: ChatContact) => {
    if (openingId) return;
    setOpeningId(contact.id);
    try {
      const conversationId = await findOrCreateConversation(contact.id);
      router.push({
        pathname: '/chat/[conversationId]',
        params: {
          conversationId,
          contactName: contact.name ?? contact.phone,
        },
      });
    } catch (err) {
      console.error('Error abriendo conversación:', err);
    } finally {
      setOpeningId(null);
    }
  }, [openingId]);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText themeColor="textSecondary">Cargando contactos…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ThemedView style={styles.searchBar}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nombre o teléfono…"
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
        </ThemedView>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <ThemedView style={styles.center}>
              <ThemedText themeColor="textSecondary">
                {query ? 'Sin resultados.' : 'Sin contactos todavía.'}
              </ThemedText>
            </ThemedView>
          }
          renderItem={({ item }) => {
            const name = item.name ?? item.phone;
            const isOpening = openingId === item.id;
            return (
              <Pressable
                onPress={() => handleOpenContact(item)}
                disabled={!!openingId}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <ThemedView type="backgroundElement" style={styles.avatar}>
                  <ThemedText type="smallBold">{name.slice(0, 2).toUpperCase()}</ThemedText>
                </ThemedView>

                <ThemedView style={styles.rowBody}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.phone}
                  </ThemedText>
                </ThemedView>

                {isOpening && <ActivityIndicator color={theme.textSecondary} />}
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
  searchBar: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  searchInput: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 14,
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
});
