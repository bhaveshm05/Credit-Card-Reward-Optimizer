import * as Haptics from "expo-haptics";

export const showUINotification = (
  title: string,
  message: string
) => {
  // Phone vibration
  Haptics.notificationAsync(
    Haptics.NotificationFeedbackType.Success
  );

  // Simple in-app alert
  alert(`${title}\n\n${message}`);
};
