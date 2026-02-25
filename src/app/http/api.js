import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_PROXY_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "/api";
const AUTH_ENDPOINTS = ["/auth/phone", "/auth/verify", "/auth/refresh/token"];
let lastAuthNotificationAt = 0;

const isBrowser = () => typeof window !== "undefined";
const getAccessTokenFromStorage = () => {
  if (!isBrowser()) return null;
  return localStorage.getItem("accessToken") || localStorage.getItem("access_token");
};

const emitClientEvent = (name, detail) => {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
};

const getBackendMessage = (payload) => {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  if (typeof payload.message === "string") return payload.message;
  if (typeof payload.error === "string") return payload.error;
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const firstError = payload.errors[0];
    if (typeof firstError === "string") return firstError;
    if (typeof firstError?.message === "string") return firstError.message;
  }
  return "";
};

const normalizeApiMessage = (error) => {
  const status = error?.response?.status;
  const backendMessage = getBackendMessage(error?.response?.data);

  if (backendMessage) return backendMessage;

  if (error?.code === "ECONNABORTED") {
    return "So'rov vaqti tugadi. Iltimos, qayta urinib ko'ring.";
  }

  if (error?.code === "ERR_NETWORK") {
    return "Server bilan aloqa o'rnatilmadi. Internetni tekshirib qayta urinib ko'ring.";
  }

  switch (status) {
    case 400:
      return "So'rov noto'g'ri yuborildi. Kiritilgan ma'lumotlarni tekshiring.";
    case 401:
      return "Sessiya muddati tugadi. Qayta ro'yxatdan o'ting.";
    case 403:
      return "Bu amal uchun ruxsat yo'q.";
    case 404:
      return "So'ralgan ma'lumot topilmadi.";
    case 409:
      return "Bu ma'lumot allaqachon mavjud.";
    case 422:
      return "Kiritilgan ma'lumotlar tekshiruvdan o'tmadi.";
    case 429:
      return "Juda ko'p so'rov yuborildi. Birozdan keyin urinib ko'ring.";
    case 500:
      return "Serverda xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko'ring.";
    case 502:
    case 503:
    case 504:
      return "Server vaqtincha ishlamayapti. Birozdan keyin urinib ko'ring.";
    default:
      return "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.";
  }
};

const isAuthError = (error) => {
  const status = error?.response?.status;
  const url = error?.config?.url || "";

  if (AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint))) {
    return false;
  }

  return status === 401 || status === 403;
};

const $api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

$api.interceptors.request.use(
  (config) => {
    if (!isBrowser()) {
      return config;
    }

    const token = getAccessTokenFromStorage();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

$api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = normalizeApiMessage(error);
    const status = error?.response?.status || null;
    const url = error?.config?.url || "";

    error.userMessage = message;

    if (!error?.config?._silentError) {
      emitClientEvent("app:api-error", {
        type: status && status < 500 ? "warning" : "error",
        status,
        url,
        message,
      });
    }

    if (isAuthError(error) && isBrowser()) {
      const now = Date.now();
      if (now - lastAuthNotificationAt > 2000) {
        lastAuthNotificationAt = now;
        localStorage.removeItem("accessToken");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("admin_token");
        localStorage.removeItem("user");

        emitClientEvent("auth-changed", {});
        emitClientEvent("app:auth-required", {
          message: "Token muddati tugagan. Davom etish uchun qayta ro'yxatdan o'ting.",
          redirectTo: "/register",
        });
      }
    }

    return Promise.reject(error);
  }
);

export default $api;
