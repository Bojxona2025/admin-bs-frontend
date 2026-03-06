const SOCKET_IO_CDN = "https://cdn.socket.io/4.7.5/socket.io.min.js";

let socketIoScriptPromise = null;

const normalizeBaseUrl = (baseUrl) =>
  String(baseUrl || "")
    .trim()
    .replace(/\/+$/, "");

const getAccessToken = () =>
  localStorage.getItem("accessToken") ||
  localStorage.getItem("access_token") ||
  localStorage.getItem("token") ||
  "";

const resolveSocketBaseUrl = () => {
  const explicit =
    normalizeBaseUrl(import.meta.env.VITE_NOTIFICATION_SOCKET_URL) ||
    normalizeBaseUrl(import.meta.env.VITE_NOTIFICATION_WS_URL);
  if (explicit) return explicit;

  const apiBase = normalizeBaseUrl(import.meta.env.VITE_BASE_URL);
  if (apiBase) return apiBase.replace(/\/api$/i, "");

  return "https://bsmarket.uz";
};

const loadSocketIoClient = () => {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.io) return Promise.resolve(window.io);
  if (socketIoScriptPromise) return socketIoScriptPromise;

  socketIoScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-socket-io-cdn="${SOCKET_IO_CDN}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.io), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = SOCKET_IO_CDN;
    script.async = true;
    script.defer = true;
    script.dataset.socketIoCdn = SOCKET_IO_CDN;
    script.onload = () => resolve(window.io);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return socketIoScriptPromise;
};

const notifyPayload = ({ eventName, payload, onPayload, onRefresh }) => {
  const envelope = {
    event: eventName,
    notification: payload?.notification || payload?.data || payload || null,
    raw: payload || null,
  };
  onPayload?.(envelope);
  if (eventName === "notifications:new" || eventName === "notifications:push") {
    onRefresh?.();
  }
};

export const connectNotificationRealtime = ({ onRefresh, onPayload, onStatus }) => {
  const wsEnabled = import.meta.env.VITE_ENABLE_NOTIFICATION_WS !== "false";
  if (!wsEnabled) return () => {};

  const token = getAccessToken();
  if (!token) return () => {};

  let socket = null;
  let disposed = false;

  loadSocketIoClient()
    .then((io) => {
      if (!io || disposed) return;

      socket = io(resolveSocketBaseUrl(), {
        transports: ["websocket", "polling"],
        auth: { token },
        query: { token },
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
      });

      socket.on("connect", () => {
        onStatus?.({ type: "connected", socketId: socket.id });
      });

      socket.on("connect_error", (error) => {
        onStatus?.({
          type: "connect_error",
          message: error?.message || "Socket ulanish xatosi",
        });
      });

      socket.on("disconnect", (reason) => {
        onStatus?.({ type: "disconnected", reason: reason || "unknown" });
      });

      socket.on("notifications:connected", (payload) => {
        notifyPayload({ eventName: "notifications:connected", payload, onPayload, onRefresh });
      });

      socket.on("notifications:new", (payload) => {
        notifyPayload({ eventName: "notifications:new", payload, onPayload, onRefresh });
      });

      socket.on("notifications:push", (payload) => {
        notifyPayload({ eventName: "notifications:push", payload, onPayload, onRefresh });
      });
    })
    .catch(() => {
      onStatus?.({ type: "script_error", message: "socket.io client yuklanmadi" });
    });

  return () => {
    disposed = true;
    if (socket) {
      socket.off("notifications:connected");
      socket.off("notifications:new");
      socket.off("notifications:push");
      socket.disconnect();
    }
  };
};
