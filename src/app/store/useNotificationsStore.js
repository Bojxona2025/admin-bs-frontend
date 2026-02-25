import { create } from "zustand";

const getNotificationId = (notification) =>
  notification?.id || notification?._id || notification?.notificationId;

const isReadNotification = (notification) =>
  Boolean(notification?.read || notification?.readAt || notification?.is_read);

const normalizeNotification = (notification) => {
  const normalized = notification && typeof notification === "object" ? notification : {};
  return {
    ...normalized,
    id: getNotificationId(normalized) || Date.now(),
    read: isReadNotification(normalized),
  };
};

export const useNotificationsStore = create((set, get) => ({
  notifications: [],

  setNotifications: (newNotifications) => {
    set({
      notifications: Array.isArray(newNotifications)
        ? newNotifications.map(normalizeNotification)
        : [],
    });
  },

  addNotification: (notification) => {
    const currentNotifications = get().notifications;
    const safeNotifications = Array.isArray(currentNotifications)
      ? currentNotifications
      : [];

    set({
      notifications: [
        ...safeNotifications,
        normalizeNotification(notification),
      ],
    });
  },

  markAsRead: (id) => {
    const currentNotifications = get().notifications;
    const safeNotifications = Array.isArray(currentNotifications)
      ? currentNotifications
      : [];

    set({
      notifications: safeNotifications.map((notif) =>
        getNotificationId(notif) === id
          ? { ...notif, read: true, is_read: true, readAt: notif.readAt || new Date().toISOString() }
          : notif
      ),
    });
  },

  markAllAsRead: () => {
    const currentNotifications = get().notifications;
    const safeNotifications = Array.isArray(currentNotifications)
      ? currentNotifications
      : [];

    set({
      notifications: safeNotifications.map((notif) => ({
        ...notif,
        read: true,
        is_read: true,
        readAt: notif.readAt || new Date().toISOString(),
      })),
    });
  },

  deleteNotification: (id) => {
    const currentNotifications = get().notifications;
    const safeNotifications = Array.isArray(currentNotifications)
      ? currentNotifications
      : [];

    set({
      notifications: safeNotifications.filter(
        (notif) => getNotificationId(notif) !== id
      ),
    });
  },

  getUnreadCount: () => {
    const currentNotifications = get().notifications;
    const safeNotifications = Array.isArray(currentNotifications)
      ? currentNotifications
      : [];
    return safeNotifications.filter((notif) => !isReadNotification(notif)).length;
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },
}));
