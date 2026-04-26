let Notifications: typeof import('expo-notifications') | null = null;
try {
  // If the current binary was built before expo-notifications was added,
  // requiring it can fail with missing native module errors.
  const notificationsModule = require('expo-notifications') as typeof import('expo-notifications');
  Notifications = notificationsModule;
  notificationsModule.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  Notifications = null;
}

export { Notifications };
