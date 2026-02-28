import $api from "../http/api";

const pickList = (data) =>
  data?.notifications || data?.notificationsAll || data?.data || [];

const pickReadPayload = (item) =>
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

const isReadItem = (item) =>
  Boolean(
    item?.isRead ||
      item?.read ||
      item?.is_read ||
      item?.readAt ||
      pickReadPayload(item)?.isRead ||
      pickReadPayload(item)?.read ||
      pickReadPayload(item)?.is_read ||
      pickReadPayload(item)?.readAt
  );

const notificationsApi = {
  async getAll({ page = 1, limit = 10, query = "" } = {}) {
    const { data } = await $api.get("/notifications/all", {
      params: { page, limit, query: query || undefined },
    });
    return {
      ...data,
      items: pickList(data),
    };
  },

  async getMy({ page = 1, limit = 100 } = {}) {
    const { data } = await $api.get("/notifications/my", {
      params: { page, limit },
    });
    const items = pickList(data).map((item) => ({
      ...(item || {}),
      _notificationId: normalizeNotificationId(item),
      _isRead: isReadItem(item),
    }));
    const unreadCount = items.filter((item) => !isReadItem(item)).length;
    return {
      ...data,
      items,
      unreadCount,
    };
  },

  async getById(id) {
    const normalizedId = normalizeNotificationId(id);
    if (!normalizedId) {
      throw new Error("Notification ID topilmadi");
    }
    const { data } = await $api.get(`/notifications/get/${normalizedId}`);
    return data;
  },

  async create(payload) {
    const { data } = await $api.post("/notifications/create", payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await $api.patch(`/notifications/update/${id}`, payload);
    return data;
  },

  async remove(id) {
    const { data } = await $api.delete(`/notifications/delete/${id}`);
    return data;
  },

  async sendFcmToUser(payload) {
    const { data } = await $api.post("/notifications/fcm/send", payload);
    return data;
  },

  async sendFcmToAll(payload) {
    const { data } = await $api.post("/notifications/fcm/send/all", payload);
    return data;
  },
};

export default notificationsApi;
