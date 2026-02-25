import $api from "../http/api";

const pickList = (data) =>
  data?.notifications || data?.notificationsAll || data?.data || [];

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
    const items = pickList(data);
    const unreadCount = items.filter((item) => !item?.isRead).length;
    return {
      ...data,
      items,
      unreadCount,
    };
  },

  async getById(id) {
    const { data } = await $api.get(`/notifications/get/${id}`);
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

