/**
 * Represents a notification to be displayed to the user.
 */
export interface Notification {
  /**
   * The type of notification (e.g., 'request_approved', 'new_announcement').
   */
  type: string;
  /**
   * The content of the notification.
   */
  content: string;
}

/**
 * Sends a notification to a specific user.
 *
 * @param userId The ID of the user to send the notification to.
 * @param notification The notification object to send.
 * @returns A promise that resolves when the notification is successfully sent.
 */
export async function sendNotification(
  userId: string,
  notification: Notification
): Promise<void> {
  // TODO: Implement this by calling an API.
  console.log(`Sending notification to user ${userId}:`, notification);
}

/**
 * Retrieves all notifications for a given user.
 *
 * @param userId The ID of the user to retrieve notifications for.
 * @returns A promise that resolves to an array of Notification objects.
 */
export async function getNotifications(userId: string): Promise<Notification[]> {
  // TODO: Implement this by calling an API.
  return [
    {
      type: 'request_approved',
      content: 'Your gear request has been approved.',
    },
    {
      type: 'new_announcement',
      content: 'New company-wide announcement: Please read!',
    },
  ];
}
