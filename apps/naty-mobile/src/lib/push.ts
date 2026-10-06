import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPush(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Mensajes',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[push] permiso negado');
      return;
    }

    console.log('[push] permiso concedido');

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.log('[push] error: falta extra.eas.projectId en la configuración de la app');
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[push] token obtenido:', token.slice(0, 12));

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { token, platform: 'android', updated_at: new Date().toISOString() },
        { onConflict: 'token' }
      );

    if (error) {
      console.log('[push] error:', error);
      return;
    }

    console.log('[push] guardado correcto');
  } catch (err) {
    console.log('[push] error:', err);
  }
}
