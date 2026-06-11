import * as Notifications from 'expo-notifications';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { registerForPushNotificationsAsync } from '../utils/usePushNotifications';

interface NotificationContextType {
  expoPushToken: string | null;
  devicePushToken: string | null;
  notification: Notifications.Notification | null;
  error: Error | null;
  isRegistering: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [devicePushToken, setDevicePushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isRegistering, setIsRegistering] = useState(true);

  useEffect(() => {
    registerForPushNotificationsAsync().then(
      (token) => {
        setExpoPushToken(token);
        setIsRegistering(false);
      },
      (err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsRegistering(false);
      },
    );

    Notifications.getDevicePushTokenAsync().then(
      (devicePushToken) => {
        console.log({ devicePushToken });
        setDevicePushToken(devicePushToken.data);
      },
      (error) => {
        setError(error);
      },
    );

    //TODO: Handle notification when device is open
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('🔔 Notification Received: ', notification);
      setNotification(notification);
    });

    //TODO: Handle user tapping a notification
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('🔔 Notification Response: ', response);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{ expoPushToken, devicePushToken, notification, error, isRegistering }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
