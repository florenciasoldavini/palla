import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

export async function registerForPushNotifications() {
  if (process.env.EXPO_OS === 'android') {
    await Notifications.setNotificationChannelAsync('session-updates', {
      importance: Notifications.AndroidImportance.HIGH,
      name: 'Session updates',
    });
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  let status = currentPermission.status;

  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }

  if (status !== 'granted') {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    throw new Error('An EAS project ID is required before requesting a push token.');
  }

  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}
