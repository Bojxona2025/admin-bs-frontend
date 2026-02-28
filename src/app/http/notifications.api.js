import $api from "./api";

const unwrap = (response) => response?.data ?? {};

const getItems = (payload) => {
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  if (Array.isArray(payload?.notificationsAll)) return payload.notificationsAll;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const getInnerPayload = (item) =>
  item?.notificationId && typeof item.notificationId === "object"
    ? item.notificationId
    : item;

const normalizeNotificationId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value !== "object") return "";
  return (
    value?.notificationId?._id ||
    value?.notificationId?.id ||
    (typeof value?.notificationId === "string" ? value.notificationId : "") ||
    value?._notificationId ||
    value?._id ||
    value?.id ||
    ""
  );
};

const isReadItem = (item) => {
  const payload = getInnerPayload(item);
  return Boolean(
    item?.isRead ||
      item?.read ||
      item?.is_read ||
      item?.readAt ||
      payload?.isRead ||
      payload?.read ||
      payload?.is_read ||
      payload?.readAt
  );
};

const getUnreadCount = (payload, notifications) => {
  if (typeof payload?.unreadCount === "number") return payload.unreadCount;
  return notifications.filter((n) => !isReadItem(n)).length;
};

const notificationsApi = {
  async getAll({ page = 1, limit = 10, query = "" } = {}) {
    const response = await $api.get("/notifications/all", {
      params: { page, limit, query: query || undefined },
    });
    const payload = unwrap(response);
    return {
      ...payload,
      notifications: getItems(payload),
    };
  },

  async getMy() {
    const response = await $api.get("/notifications/my");
    const payload = unwrap(response);
    const notifications = getItems(payload).map((item) => ({
      ...(item || {}),
      _notificationId: normalizeNotificationId(item),
      _isRead: isReadItem(item),
    }));
    return {
      ...payload,
      notifications,
      unreadCount: getUnreadCount(payload, notifications),
    };
  },

  async getById(id) {
    const normalizedId = normalizeNotificationId(id);
    if (!normalizedId) {
      throw new Error("Notification ID topilmadi");
    }
    const response = await $api.get(`/notifications/get/${normalizedId}`);
    return unwrap(response);
  },

  async create(payload) {
    const response = await $api.post("/notifications/create", payload);
    return unwrap(response);
  },

  async update(id, payload) {
    const normalizedId = normalizeNotificationId(id);
    const response = await $api.patch(`/notifications/update/${normalizedId}`, payload);
    return unwrap(response);
  },

  async remove(id) {
    const normalizedId = normalizeNotificationId(id);
    const response = await $api.delete(`/notifications/delete/${normalizedId}`);
    return unwrap(response);
  },

  async sendFcmToUser(payload) {
    const response = await $api.post("/notifications/fcm/send", payload);
    return unwrap(response);
  },

  async sendFcmToAll(payload) {
    const response = await $api.post("/notifications/fcm/send/all", payload);
    return unwrap(response);
  },
};

export default notificationsApi;
