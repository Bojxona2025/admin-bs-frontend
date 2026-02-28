import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BASE_URL ||
  "http://localhost:5342/api";
const REFRESH_ENDPOINT = "/auth/refresh/token";
const DEVICE_ID_KEY = "stable_device_id";
const AUTH_LOGOUT_REASON_KEY = "auth_logout_reason";
const REQUEST_TIMEOUT_MS = 15000;
const RATE_LIMIT_WINDOW_MS = 2000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const DUPLICATE_GUARD_MS = 700;
const RETRYABLE_METHODS = new Set(["get", "head", "options"]);
const MAX_429_RETRIES = 3;
const REQUEST_GUARD_BYPASS_PATHS = ["/emu/create/express-order"];
let backendDownEmitted = false;
const BLOCKED_SQL_PATTERNS = [
  /(\bunion\b\s+\bselect\b)/i,
  /(\bdrop\b\s+\btable\b)/i,
  /(\binsert\b\s+\binto\b)/i,
  /(\bdelete\b\s+\bfrom\b)/i,
  /(--|#|\/\*)/,
];
const requestTimestamps = [];
const recentRequestMap = new Map();
const createStableDeviceId = () => {
  try {
    const fromStorage =
      localStorage.getItem(DEVICE_ID_KEY) ||
      localStorage.getItem("device_id") ||
      localStorage.getItem("current_device_id") ||
      "";
    if (fromStorage) return fromStorage;
    const generated = `web-${Math.random().toString(36).slice(2, 12)}-${Date.now()
      .toString(36)
      .slice(-6)}`;
    localStorage.setItem(DEVICE_ID_KEY, generated);
    localStorage.setItem("device_id", generated);
    localStorage.setItem("current_device_id", generated);
    localStorage.setItem("currentDeviceId", generated);
    return generated;
  } catch {
    return `web-${Date.now()}`;
  }
};

const readAccessToken = () => {
  const accessToken = localStorage.getItem("accessToken") || "";
  const accessTokenLegacy = localStorage.getItem("access_token") || "";
  const fallbackToken = localStorage.getItem("token") || "";
  const raw = accessToken || accessTokenLegacy || fallbackToken || "";
  if (accessToken && !accessTokenLegacy) {
    localStorage.setItem("access_token", accessToken);
  } else if (!accessToken && accessTokenLegacy) {
    localStorage.setItem("accessToken", accessTokenLegacy);
  }
  return String(raw).replace(/^"+|"+$/g, "").trim();
};
const saveAccessToken = (token) => {
  if (!token) return;
  localStorage.setItem("accessToken", token);
  localStorage.setItem("access_token", token);
};
const clearAuthStorage = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  localStorage.removeItem("user_profile_cache");
  localStorage.removeItem("user_role");
  localStorage.removeItem("role");
  localStorage.removeItem("userRole");
};
const getResponseMessage = (payload) => {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  return String(payload.message || payload.msg || "").trim();
};
const getLogoutMessageByBackend = (rawMessage) => {
  const lowered = String(rawMessage || "").toLowerCase();
  if (lowered === "user is inactive") {
    return "Akkauntingiz nofaol holatga o'tkazilgan. BS MARKET ga murojaat qiling.";
  }
  if (lowered === "company is inactive") {
    return "Kompaniyangiz nofaol. BS MARKET ga murojaat qiling.";
  }
  return "Sessiya muddati tugadi. Qayta tizimga kiring.";
};
const RATE_LIMIT_USER_MESSAGE =
  "Juda ko'p so'rov yuborildi, birozdan keyin urinib ko'ring";
const forceLogoutToLogin = (reasonText) => {
  if (isSessionLocked()) return;
  clearAuthStorage();
  if (reasonText) {
    localStorage.setItem(AUTH_LOGOUT_REASON_KEY, reasonText);
  }
  window.dispatchEvent(new Event("auth-changed"));
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};
const emitBrowserEvent = (name, detail = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
};
const now = () => Date.now();
const trimRateWindow = () => {
  const border = now() - RATE_LIMIT_WINDOW_MS;
  while (requestTimestamps.length && requestTimestamps[0] < border) {
    requestTimestamps.shift();
  }
};
const canSendRequest = () => {
  trimRateWindow();
  if (requestTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) return false;
  requestTimestamps.push(now());
  return true;
};
const cleanupRecentRequests = () => {
  const border = now() - DUPLICATE_GUARD_MS;
  for (const [key, ts] of recentRequestMap.entries()) {
    if (ts < border) {
      recentRequestMap.delete(key);
    }
  }
};
const sanitizeString = (value) =>
  String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
const hasSqlLikePayload = (value) => {
  const text = sanitizeString(value).toLowerCase();
  if (!text) return false;
  return BLOCKED_SQL_PATTERNS.some((pattern) => pattern.test(text));
};
const sanitizePayload = (input) => {
  if (input == null) return input;
  if (typeof FormData !== "undefined" && input instanceof FormData) return input;
  if (Array.isArray(input)) return input.map((item) => sanitizePayload(item));
  if (typeof input === "object") {
    const next = {};
    Object.entries(input).forEach(([key, value]) => {
      next[key] = sanitizePayload(value);
    });
    return next;
  }
  if (typeof input === "string") return sanitizeString(input);
  return input;
};
const checkPayloadForSqlLikeStrings = (input) => {
  if (input == null) return false;
  if (typeof FormData !== "undefined" && input instanceof FormData) {
    for (const [, value] of input.entries()) {
      if (typeof value === "string" && hasSqlLikePayload(value)) return true;
    }
    return false;
  }
  if (Array.isArray(input)) {
    return input.some((item) => checkPayloadForSqlLikeStrings(item));
  }
  if (typeof input === "object") {
    return Object.values(input).some((value) => checkPayloadForSqlLikeStrings(value));
  }
  if (typeof input === "string") {
    return hasSqlLikePayload(input);
  }
  return false;
};
const buildRequestSignature = (config) => {
  const method = String(config?.method || "get").toLowerCase();
  const url = String(config?.url || "");
  const paramsPart = (() => {
    try {
      return JSON.stringify(config?.params || {});
    } catch {
      return "";
    }
  })();
  const dataPart = (() => {
    try {
      if (typeof FormData !== "undefined" && config?.data instanceof FormData) {
        return "formdata";
      }
      return JSON.stringify(config?.data || {});
    } catch {
      return "";
    }
  })();
  return `${method}:${url}:${paramsPart}:${dataPart}`;
};
const shouldBypassRequestGuards = (config) => {
  const rawUrl = String(config?.url || "");
  if (!rawUrl) return false;
  return REQUEST_GUARD_BYPASS_PATHS.some((path) => rawUrl.includes(path));
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const extractAccessToken = (data) =>
  data?.access_token ||
  data?.accessToken ||
  data?.token ||
  data?.data?.access_token ||
  data?.data?.accessToken ||
  data?.data?.token ||
  "";
const isSessionLocked = () => {
  const until = Number(localStorage.getItem("session_revoked_until") || 0);
  return Boolean(until && until > Date.now());
};

const $api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
});

// Refresh jarayonini kuzatish uchun flag
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

$api.interceptors.request.use(
  (config) => {
    const bypassGuards = shouldBypassRequestGuards(config);
    if (!bypassGuards) {
      if (!canSendRequest()) {
        return Promise.reject(
          new Error("Juda ko'p so'rov yuborildi. Biroz kutib qayta urinib ko'ring.")
        );
      }
      cleanupRecentRequests();
      const signature = buildRequestSignature(config);
      const prev = recentRequestMap.get(signature) || 0;
      if (now() - prev < DUPLICATE_GUARD_MS) {
        return Promise.reject(
          new Error("Bir xil so'rov juda tez takrorlandi. Biroz kutib qayta yuboring.")
        );
      }
      recentRequestMap.set(signature, now());
    }

    const sanitizedParams = sanitizePayload(config?.params);
    const sanitizedData = sanitizePayload(config?.data);
    if (checkPayloadForSqlLikeStrings(sanitizedParams) || checkPayloadForSqlLikeStrings(sanitizedData)) {
      return Promise.reject(
        new Error("Xavfli formatdagi so'rov aniqlandi. Ma'lumotni tekshirib qayta yuboring.")
      );
    }

    const token = readAccessToken();
    const stableDeviceId = createStableDeviceId();
    config.headers = config.headers || {};
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (stableDeviceId) {
      config.headers["x-device-id"] = stableDeviceId;
    }
    config.headers["x-request-id"] = `${stableDeviceId}-${now()}`;
    config.headers["x-platform"] = "web";
    config.params = sanitizedParams;
    config.data = sanitizedData;
    config.withCredentials = true;
    if (!config.timeout) {
      config.timeout = REQUEST_TIMEOUT_MS;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

$api.interceptors.response.use(
  (response) => {
    if (backendDownEmitted) {
      backendDownEmitted = false;
      emitBrowserEvent("api:backend-up", {
        message: "Server bilan aloqa tiklandi.",
      });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error?.config || {};
    const requestUrl = String(originalRequest?.url || "");
    const isRefreshCall = requestUrl.includes(REFRESH_ENDPOINT);
    const status = Number(error?.response?.status || 0);
    const backendMessage = getResponseMessage(error?.response?.data);
    const requestMethod = String(originalRequest?.method || "get").toLowerCase();

    // Login sahifasida bo'lsak, redirect qilmaymiz
    if (window.location.pathname === "/login") {
      return Promise.reject(error);
    }

    if (
      status === 403 &&
      (backendMessage === "User is inactive" || backendMessage === "Company is inactive")
    ) {
      forceLogoutToLogin(getLogoutMessageByBackend(backendMessage));
      return Promise.reject(error);
    }

    if (status === 429) {
      if (error?.response?.data && typeof error.response.data === "object") {
        error.response.data.message = RATE_LIMIT_USER_MESSAGE;
        error.response.data.msg = RATE_LIMIT_USER_MESSAGE;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("api:rate-limit", {
            detail: { message: RATE_LIMIT_USER_MESSAGE },
          })
        );
      }

      const retryCount = Number(originalRequest?._retry429Count || 0);
      const canRetry = RETRYABLE_METHODS.has(requestMethod) && retryCount < MAX_429_RETRIES;
      if (canRetry) {
        originalRequest._retry429Count = retryCount + 1;
        const delayMs = 1000 * 2 ** retryCount; // 1s -> 2s -> 4s
        await wait(delayMs);
        return $api(originalRequest);
      }
      return Promise.reject(error);
    }

    const isBackendDownLike =
      error?.code === "ERR_NETWORK" ||
      error?.code === "ECONNABORTED" ||
      status === 502 ||
      status === 503 ||
      status === 504;
    if (isBackendDownLike && !backendDownEmitted) {
      backendDownEmitted = true;
      emitBrowserEvent("api:backend-down", {
        message:
          "Server bilan aloqa uzildi. Iltimos, backend holatini tekshirib qayta urinib ko'ring.",
      });
    }

    if (
      status === 401 &&
      !originalRequest._retry &&
      !isRefreshCall
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return $api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          `${API_BASE_URL}${REFRESH_ENDPOINT}`,
          {},
          {
            headers: {
              "x-device-id": createStableDeviceId(),
              "x-platform": "web",
            },
            withCredentials: true,
          }
        );

        const newToken = extractAccessToken(res.data);
        if (newToken) {
          saveAccessToken(newToken);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          processQueue(null, newToken);
          return $api(originalRequest);
        }
        throw new Error("Refresh javobida access token topilmadi");
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);

        processQueue(refreshError, null);
        const refreshMessage = getResponseMessage(refreshError?.response?.data);
        forceLogoutToLogin(getLogoutMessageByBackend(refreshMessage));

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 401 && !isRefreshCall) {
      forceLogoutToLogin("Sessiya muddati tugadi. Qayta tizimga kiring.");
    }

    return Promise.reject(error);
  }
);

export default $api;
