import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Tabs, router } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { registerForPush } from '@/lib/push';
import { supabase } from '@/lib/supabase';

export default function TabsLayout() {
  const theme = useTheme();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
        return;
      }
      void registerForPush();
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  return (
    <Tabs screenOptions={{ tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="index" options={{ title: 'Chats' }} />
    </Tabs>
  );
}
