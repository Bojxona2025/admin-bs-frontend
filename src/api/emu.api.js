import $api from "../http/api";

const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/[_\s]/g, "");

const isSuperAdminRole = (role) => normalizeRole(role) === "superadmin";

const resolveSuperAdminCompanyId = ({ role, companyId }) =>
  isSuperAdminRole(role) ? companyId || undefined : undefined;
const toArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value && typeof value === "object") return Object.values(value).filter(Boolean);
  return [];
};

const pickEmuOrders = (data) => {
  const source = data?.json?.orders?.order || data?.json?.order || [];
  return toArray(source);
};

const pickLocalOrders = (data) => {
  const source =
    data?.orders ||
    data?.data?.orders ||
    data?.data?.data?.orders ||
    data?.data?.data ||
    data?.data ||
    data?.ordersData ||
    [];
  return toArray(source);
};

const pickOrders = (data) => {
  const emuOrders = pickEmuOrders(data);
  if (emuOrders.length) return emuOrders;
  const localOrders = pickLocalOrders(data);
  if (localOrders.length) return localOrders;
  const fallback = data?.json?.orders || data?.json || [];
  const source = fallback?.order || fallback;
  if (Array.isArray(source)) return source.filter(Boolean);
  if (source && typeof source === "object") {
    if (Array.isArray(source?.order)) return source.order.filter(Boolean);
    return Object.values(source).filter(Boolean);
  }
  return [];
};

const emuApi = {
  async getRegions() {
    const { data } = await $api.get("/emu/get/regions");
    return data;
  },

  async getPvz({ region }) {
    const { data } = await $api.post("/emu/get/pvz", { region });
    return data;
  },

  async getUzbekistanPvz(params = {}) {
    const { data } = await $api.get("/emu/get/uzbekistan/pvz", {
      params: {
        page: params?.page || 1,
        limit: params?.limit || 200,
      },
    });
    return data;
  },

  async calculateDelivery(payload) {
    const { data } = await $api.post("/emu/calculate/delivery", payload);
    return data;
  },

  async createExpressOrder(payload, actor = {}) {
    const companyId = resolveSuperAdminCompanyId({
      role: actor?.role,
      companyId: payload?.companyId,
    });

    const body = { ...(payload || {}) };
    if (companyId) body.companyId = companyId;
    else delete body.companyId;

    const { data } = await $api.post("/emu/create/express-order", body);
    return data;
  },

  async getOrders(filters = {}, actor = {}) {
    const companyId = resolveSuperAdminCompanyId({
      role: actor?.role,
      companyId: filters?.companyId,
    });

    const params = {
      datefrom: filters?.datefrom || undefined,
      dateto: filters?.dateto || undefined,
      limit: Number(filters?.limit) || 100,
      done: filters?.done || "Пусто",
      companyId,
    };

    let { data } = await $api.get("/emu/get/orders", { params });
    let orders = pickOrders(data);

    // Backend implementatsiyalarida ba'zan done/date filter bilan bo'sh qaytadi.
    // Shunda minimal query bilan qayta urinamiz.
    if (!orders.length) {
      const fallbackParams = { limit: Number(filters?.limit) || 100, companyId };
      const fallback = await $api.get("/emu/get/orders", { params: fallbackParams });
      data = fallback.data;
      orders = pickOrders(data);
    }
    const emuOrders = pickEmuOrders(data);
    const localOrders = pickLocalOrders(data);
    const resolvedOrders = emuOrders.length ? emuOrders : localOrders;
    return {
      ...data,
      orders: resolvedOrders.length ? resolvedOrders : orders,
      emuOrders,
      localOrders,
      totalOrders: Number(data?.totalOrders || 0),
      statusSummary: data?.statusSummary || {},
      source: data?.source || "",
      emuCount: Number(data?.emuCount || 0),
    };
  },

  async getOrdersLive(filters = {}, actor = {}) {
    const params = {
      datefrom: filters?.datefrom || undefined,
      dateto: filters?.dateto || undefined,
      limit: Number(filters?.limit) || 200,
      done: filters?.done || "Пусто",
      sync: filters?.sync ? true : undefined,
      _ts: Date.now(),
    };

    const { data } = await $api.get("/emu/get/orders/live", {
      params,
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    const emuOrders = pickEmuOrders(data);
    const localOrders = pickLocalOrders(data);
    const orders = emuOrders.length ? emuOrders : localOrders;
    return {
      ...data,
      orders,
      emuOrders,
      localOrders,
      totalOrders: Number(data?.totalOrders || orders.length || 0),
      statusSummary: data?.statusSummary || {},
      source: data?.source || "live",
      emuCount: Number(data?.emuCount || emuOrders.length || 0),
    };
  },

  async getOrdersAnalytics(filters = {}, actor = {}) {
    const companyId = resolveSuperAdminCompanyId({
      role: actor?.role,
      companyId: filters?.companyId,
    });

    const params = {
      datefrom: filters?.datefrom || undefined,
      dateto: filters?.dateto || undefined,
      limit: Number(filters?.limit) || 100,
      done: filters?.done || "Пусто",
      companyId,
    };

    const { data } = await $api.get("/emu/get/orders/analytics", { params });
    return {
      ...data,
      companies: Array.isArray(data?.companies) ? data.companies : [],
      totalOrders: Number(data?.totalOrders || 0),
      totalStatusSummary: data?.totalStatusSummary || {},
    };
  },

  async getOrderStatus(orderno, actor = {}) {
    const companyId = resolveSuperAdminCompanyId({
      role: actor?.role,
      companyId: actor?.companyId,
    });

    const params = companyId ? { companyId } : undefined;
    const { data } = await $api.get(`/emu/get/order-status/${orderno}`, { params });
    return data;
  },
};

export default emuApi;
