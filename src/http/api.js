import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BASE_URL ||
  "http://localhost:5342/api";
const REFRESH_ENDPOINT = "/auth/refresh/token";
const DEVICE_ID_KEY = "stable_device_id";
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
  localStorage.removeItem("user_profile_cache");
  localStorage.removeItem("user_role");
  localStorage.removeItem("role");
  localStorage.removeItem("userRole");
};
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
    const token = readAccessToken();
    const stableDeviceId = createStableDeviceId();
    config.headers = config.headers || {};
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (stableDeviceId) {
      config.headers["x-device-id"] = stableDeviceId;
    }
    config.headers["x-platform"] = "web";

    config.withCredentials = true;
    return config;
  },
  (error) => Promise.reject(error)
);

$api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config || {};
    const requestUrl = String(originalRequest?.url || "");
    const isRefreshCall = requestUrl.includes(REFRESH_ENDPOINT);

    // Login sahifasida bo'lsak, redirect qilmaymiz
    if (window.location.pathname === "/login") {
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
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
        if (!isSessionLocked()) {
          clearAuthStorage();
        }

        // Faqat login sahifasida bo'lmaganda redirect qilamiz
        if (window.location.pathname !== "/login" && !isSessionLocked()) {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default $api;
