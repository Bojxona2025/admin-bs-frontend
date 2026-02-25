const normalizeBaseUrl = (baseUrl) => {
  if (!baseUrl) return "";
  return String(baseUrl).replace(/\/+$/, "");
};

const buildWsCandidates = () => {
  const explicit = normalizeBaseUrl(import.meta.env.VITE_NOTIFICATION_WS_URL);
  const apiBase = normalizeBaseUrl(import.meta.env.VITE_BASE_URL);

  if (explicit) return [explicit];
  if (!apiBase) return [];

  const origin = apiBase.replace(/\/api$/, "");
  const wsOrigin = origin.replace(/^http/, "ws");

  return [
    `${wsOrigin}/socket.io/?EIO=4&transport=websocket`,
    `${wsOrigin}/ws/notifications`,
    `${wsOrigin}/notifications/ws`,
  ];
};

const shouldRefreshByPayload = (payload) => {
  if (!payload) return false;
  const type = String(payload?.type || payload?.event || "").toLowerCase();
  const action = String(payload?.action || "").toLowerCase();

  if (type.includes("notification")) return true;
  if (action.includes("notification")) return true;
  if (payload?.notification || payload?.notificationId) return true;

  return false;
};

export const connectNotificationRealtime = ({ onRefresh, onPayload }) => {
  const wsEnabled =
    import.meta.env.VITE_ENABLE_NOTIFICATION_WS === "true" ||
    Boolean(import.meta.env.VITE_NOTIFICATION_WS_URL);
  if (!wsEnabled) {
    return () => {};
  }

  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");
  const wsCandidates = buildWsCandidates();
  let socket = null;
  let isClosed = false;
  let currentCandidateIndex = 0;
  let reconnectTimer = null;
  let failedAttempts = 0;
  const maxFailedAttempts = wsCandidates.length * 3;

  const scheduleReconnect = () => {
    if (isClosed || failedAttempts >= maxFailedAttempts) return;
    const delay = Math.min(15000, 2000 + failedAttempts * 1000);
    reconnectTimer = setTimeout(() => {
      connect();
    }, delay);
  };

  const connect = () => {
    if (isClosed || !wsCandidates.length) return;

    const base = wsCandidates[currentCandidateIndex % wsCandidates.length];
    currentCandidateIndex += 1;
    const separator = base.includes("?") ? "&" : "?";
    const url = token ? `${base}${separator}token=${token}` : base;

    try {
      socket = new WebSocket(url);
    } catch (error) {
      scheduleReconnect();
      return;
    }

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        onPayload?.(payload);
        if (shouldRefreshByPayload(payload)) {
          onRefresh?.();
        }
      } catch {
        // Non-JSON payload bo'lsa ham refresh qilish xavfsiz.
        onPayload?.(null);
        onRefresh?.();
      }
    };

    socket.onclose = () => {
      if (socket) socket = null;
      failedAttempts += 1;
      scheduleReconnect();
    };

    socket.onerror = () => {
      if (socket) {
        socket.close();
      }
    };
  };

  connect();

  return () => {
    isClosed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (socket) socket.close();
  };
};
