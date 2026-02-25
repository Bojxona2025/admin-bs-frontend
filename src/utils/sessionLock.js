const LOCK_UNTIL_KEY = "session_revoked_until";
const LOCK_REASON_KEY = "session_revoked_reason";
const LOCK_DURATION_MS = 30 * 60 * 1000;
const ENABLE_SESSION_LOCK = true;

export const setSessionRevokedLock = (
  reason = "Sessiyangiz boshqa qurilmadan o'chirildi",
  durationMs = LOCK_DURATION_MS
) => {
  if (!ENABLE_SESSION_LOCK) return 0;
  const existingUntil = Number(localStorage.getItem(LOCK_UNTIL_KEY) || 0);
  if (existingUntil && existingUntil > Date.now()) {
    // Mavjud lock bo'lsa, timerni qayta 30:00 ga reset qilmaymiz.
    return existingUntil;
  }
  const until = Date.now() + durationMs;
  localStorage.setItem(LOCK_UNTIL_KEY, String(until));
  localStorage.setItem(LOCK_REASON_KEY, reason);
  return until;
};

export const getSessionLock = () => {
  if (!ENABLE_SESSION_LOCK) {
    localStorage.removeItem(LOCK_UNTIL_KEY);
    localStorage.removeItem(LOCK_REASON_KEY);
    return { locked: false, remainingMs: 0, reason: "" };
  }
  const untilRaw = localStorage.getItem(LOCK_UNTIL_KEY);
  const reason = localStorage.getItem(LOCK_REASON_KEY) || "";
  const until = Number(untilRaw || 0);
  if (!until || Number.isNaN(until)) {
    return { locked: false, remainingMs: 0, reason: "" };
  }
  const remainingMs = until - Date.now();
  if (remainingMs <= 0) {
    localStorage.removeItem(LOCK_UNTIL_KEY);
    localStorage.removeItem(LOCK_REASON_KEY);
    return { locked: false, remainingMs: 0, reason: "" };
  }
  return { locked: true, remainingMs, reason };
};

export const clearSessionLock = () => {
  localStorage.removeItem(LOCK_UNTIL_KEY);
  localStorage.removeItem(LOCK_REASON_KEY);
};
