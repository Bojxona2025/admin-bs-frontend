import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_PROXY_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "/api";
const REFRESH_ENDPOINT = "/auth/refresh/token";
const AUTH_ENDPOINTS = ["/auth/phone", "/auth/verify", "/auth/system/login", REFRESH_ENDPOINT];
let lastAuthNotificationAt = 0;
let isRefreshing = false;
let refreshQueue = [];
const RATE_LIMIT_MESSAGE = "Juda ko'p so'rov yuborildi. Iltimos, biroz kutib qayta urinib ko'ring.";
let backendDownEmitted = false;

const isBrowser = () => typeof window !== "undefined";
const getAccessTokenFromStorage = () => {
  if (!isBrowser()) return null;
  return localStorage.getItem("accessToken") || localStorage.getItem("access_token");
};
const getOrCreateDeviceId = () => {
  if (!isBrowser()) return "";
  const existing =
    localStorage.getItem("device_id") ||
    localStorage.getItem("current_device_id") ||
    localStorage.getItem("stable_device_id");
  if (existing) return existing;
  const generated =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem("device_id", generated);
  localStorage.setItem("current_device_id", generated);
  localStorage.setItem("stable_device_id", generated);
  return generated;
};
let inMemoryAccessToken = getAccessTokenFromStorage();

const setAccessToken = (token) => {
  const next = String(token || "").trim();
  inMemoryAccessToken = next || null;
  if (!isBrowser()) return;
  if (next) {
    localStorage.setItem("accessToken", next);
    localStorage.setItem("access_token", next);
  } else {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("access_token");
  }
};
const clearAuthStorage = () => {
  if (!isBrowser()) return;
  setAccessToken(null);
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("admin_token");
  localStorage.removeItem("user");
};
const extractAccessToken = (payload) =>
  payload?.accessToken || payload?.access_token || payload?.token || payload?.data?.accessToken || payload?.data?.access_token || payload?.data?.token || "";
const processRefreshQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
};
const requestRefreshToken = async () => {
  const deviceId = getOrCreateDeviceId();
  const response = await axios.post(
    `${API_BASE_URL}${REFRESH_ENDPOINT}`,
    {},
    {
      withCredentials: true,
      timeout: 15000,
      headers: {
        Accept: "application/json",
        ...(deviceId ? { "x-device-id": deviceId } : {}),
      },
    }
  );
  const token = extractAccessToken(response?.data);
  if (!token) {
    throw new Error("Refresh javobida access token topilmadi");
  }
  setAccessToken(token);
  return token;
};
const isRefreshRequest = (url) => String(url || "").includes(REFRESH_ENDPOINT);

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
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.onLine === false) {
      return "Internetga ulanilmagan. Iltimos, internetni tekshiring.";
    }
    return "Server bilan aloqa o'rnatilmadi. Iltimos, server va tarmoqli sozlamalarni (CORS/URL) tekshiring.";
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

    const deviceId = getOrCreateDeviceId();
    const token = inMemoryAccessToken || getAccessTokenFromStorage();
    config.headers = config.headers || {};
    if (deviceId) {
      config.headers["x-device-id"] = deviceId;
    }
    if (token && !isRefreshRequest(config?.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

$api.interceptors.response.use(
  (response) => {
    if (backendDownEmitted) {
      backendDownEmitted = false;
      emitClientEvent("app:backend-up", {
        type: "success",
        message: "Server bilan aloqa tiklandi.",
      });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error?.config || {};
    const requestUrl = String(originalRequest?.url || "");
    const status = Number(error?.response?.status || 0);
    const shouldTryRefresh =
      isBrowser() &&
      status === 401 &&
      !originalRequest?._retry &&
      !originalRequest?._skipAuthRetry &&
      !isRefreshRequest(requestUrl);

    if (shouldTryRefresh) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return $api(originalRequest);
          })
          .catch((refreshErr) => Promise.reject(refreshErr));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await requestRefreshToken();
        processRefreshQueue(null, newToken);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return $api(originalRequest);
      } catch (refreshError) {
        processRefreshQueue(refreshError, null);
        clearAuthStorage();
        emitClientEvent("auth-changed", {});
        emitClientEvent("app:auth-required", {
          message: "Token muddati tugagan. Davom etish uchun qayta ro'yxatdan o'ting.",
          redirectTo: "/register",
        });
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const message = normalizeApiMessage(error);
    const safeStatus = error?.response?.status || null;
    const url = error?.config?.url || "";
    const retryAfterRaw = error?.response?.headers?.["retry-after"];
    const retryAfter = Number(retryAfterRaw);

    error.userMessage = safeStatus === 429 ? RATE_LIMIT_MESSAGE : message;

    if (!error?.config?._silentError) {
      const isBackendDownLike =
        error?.code === "ERR_NETWORK" ||
        error?.code === "ECONNABORTED" ||
        safeStatus === 502 ||
        safeStatus === 503 ||
        safeStatus === 504;
      if (isBackendDownLike && !backendDownEmitted) {
        backendDownEmitted = true;
        emitClientEvent("app:backend-down", {
          type: "error",
          status: safeStatus,
          url,
          message:
            "Server bilan aloqa uzildi. Iltimos, backend holatini tekshiring.",
        });
      }
      if (safeStatus === 429) {
        emitClientEvent("app:rate-limit", {
          type: "warning",
          status: 429,
          url,
          retryAfter: Number.isFinite(retryAfter) ? retryAfter : null,
          message: RATE_LIMIT_MESSAGE,
        });
      }
      emitClientEvent("app:api-error", {
        type: safeStatus && safeStatus < 500 ? "warning" : "error",
        status: safeStatus,
        url,
        message: safeStatus === 429 ? RATE_LIMIT_MESSAGE : message,
      });
    }

    if (isAuthError(error) && isBrowser()) {
      const now = Date.now();
      if (now - lastAuthNotificationAt > 2000) {
        lastAuthNotificationAt = now;
        clearAuthStorage();

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
