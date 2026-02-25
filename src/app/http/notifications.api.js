import $api from "./api";

const unwrap = (response) => response?.data ?? {};

const getItems = (payload) => {
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const getUnreadCount = (payload, notifications) => {
  if (typeof payload?.unreadCount === "number") return payload.unreadCount;
  return notifications.filter((n) => !(n?.read || n?.readAt || n?.is_read)).length;
};

const notificationsApi = {
  async getAll({ page = 1, limit = 10, query = "" } = {}) {
    const response = await $api.get("/notifications", {
      params: { page, limit, query },
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
    const notifications = getItems(payload);
    return {
      ...payload,
      notifications,
      unreadCount: getUnreadCount(payload, notifications),
    };
  },

  async getById(id) {
    const response = await $api.get(`/notifications/${id}`);
    return unwrap(response);
  },

  async create(payload) {
    const response = await $api.post("/notifications", payload);
    return unwrap(response);
  },

  async update(id, payload) {
    const response = await $api.patch(`/notifications/${id}`, payload);
    return unwrap(response);
  },

  async remove(id) {
    const response = await $api.delete(`/notifications/${id}`);
    return unwrap(response);
  },

  async sendFcmToUser(payload) {
    const response = await $api.post("/notifications/send-fcm/user", payload);
    return unwrap(response);
  },

  async sendFcmToAll(payload) {
    const response = await $api.post("/notifications/send-fcm/all", payload);
    return unwrap(response);
  },
};

export default notificationsApi;
