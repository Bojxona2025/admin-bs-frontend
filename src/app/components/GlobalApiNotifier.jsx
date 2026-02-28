"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const TOAST_DURATION = 5000;

const typeStyles = {
  error: "bg-red-600 text-white",
  warning: "bg-amber-500 text-white",
  success: "bg-emerald-600 text-white",
  info: "bg-sky-600 text-white",
};

export default function GlobalApiNotifier() {
  const [toasts, setToasts] = useState([]);
  const [rateLimitOverlay, setRateLimitOverlay] = useState(null);
  const [backendDownOverlay, setBackendDownOverlay] = useState(null);
  const pathname = usePathname();
  const router = useRouter();
  const authRedirectInProgressRef = useRef(false);
  const rateLimitTimerRef = useRef(null);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((payload) => {
    const message = payload?.message;
    if (!message) return;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const toast = {
      id,
      type: payload?.type || "error",
      message,
    };

    setToasts((prev) => [toast, ...prev].slice(0, 5));
    window.setTimeout(() => removeToast(id), TOAST_DURATION);
  }, [removeToast]);

  useEffect(() => {
    window.toast = (message, type = "error") => {
      pushToast({ message, type });
    };

    const handleApiError = (event) => {
      pushToast(event.detail || {});
    };

    const handleAuthRequired = (event) => {
      const message =
        event?.detail?.message ||
        "Sessiya muddati tugadi. Qayta ro'yxatdan o'ting.";
      pushToast({ type: "warning", message });

      if (pathname === "/register" || authRedirectInProgressRef.current) {
        return;
      }

      authRedirectInProgressRef.current = true;
      window.setTimeout(() => {
        router.push("/register");
        authRedirectInProgressRef.current = false;
      }, 300);
    };

    const handleRateLimit = (event) => {
      const payload = event?.detail || {};
      const retryAfter = Number(payload?.retryAfter);
      const message =
        payload?.message ||
        "Juda ko'p so'rov yuborildi. Iltimos, biroz kutib qayta urinib ko'ring.";

      setRateLimitOverlay({
        message,
        retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
      });

      if (rateLimitTimerRef.current) {
        window.clearTimeout(rateLimitTimerRef.current);
      }
      const durationMs =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 7000;
      rateLimitTimerRef.current = window.setTimeout(() => {
        setRateLimitOverlay(null);
      }, durationMs);
    };

    const handleBackendDown = (event) => {
      const payload = event?.detail || {};
      setBackendDownOverlay({
        message:
          payload?.message ||
          "Server bilan aloqa uzildi. Iltimos, birozdan keyin qayta urinib ko'ring.",
      });
    };

    const handleBackendUp = (event) => {
      setBackendDownOverlay(null);
      const message = event?.detail?.message || "Server yana ishlayapti.";
      pushToast({ type: "success", message });
    };

    window.addEventListener("app:api-error", handleApiError);
    window.addEventListener("app:auth-required", handleAuthRequired);
    window.addEventListener("app:rate-limit", handleRateLimit);
    window.addEventListener("app:backend-down", handleBackendDown);
    window.addEventListener("app:backend-up", handleBackendUp);

    return () => {
      window.removeEventListener("app:api-error", handleApiError);
      window.removeEventListener("app:auth-required", handleAuthRequired);
      window.removeEventListener("app:rate-limit", handleRateLimit);
      window.removeEventListener("app:backend-down", handleBackendDown);
      window.removeEventListener("app:backend-up", handleBackendUp);
      if (rateLimitTimerRef.current) {
        window.clearTimeout(rateLimitTimerRef.current);
      }
      delete window.toast;
    };
  }, [pathname, pushToast, router]);

  return (
    <>
      {backendDownOverlay ? (
        <div className="fixed inset-0 z-[10060] bg-black/90 backdrop-blur-[3px] flex items-center justify-center px-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/20 bg-zinc-950 text-white shadow-2xl p-6">
            <p className="text-2xl sm:text-3xl font-semibold mb-3">Server bilan aloqa yo'q</p>
            <p className="text-white/85 text-base leading-6">{backendDownOverlay.message}</p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-white text-zinc-900 font-medium hover:bg-zinc-200 cursor-pointer"
              >
                Qayta urinish
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {rateLimitOverlay ? (
        <div className="fixed inset-0 z-[10050] bg-black/85 backdrop-blur-[2px] flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-zinc-950 text-white shadow-2xl p-6">
            <p className="text-2xl font-semibold mb-3">So'rovlar limiti oshdi</p>
            <p className="text-white/85 text-base leading-6">{rateLimitOverlay.message}</p>
            {rateLimitOverlay.retryAfter ? (
              <p className="text-white/70 text-sm mt-3">
                Qayta urinish vaqti: taxminan {rateLimitOverlay.retryAfter} soniya.
              </p>
            ) : null}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setRateLimitOverlay(null)}
                className="px-4 py-2 rounded-lg bg-white text-zinc-900 font-medium hover:bg-zinc-200 cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="fixed top-4 right-4 z-[10000] w-[340px] max-w-[calc(100vw-2rem)] space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <div
              className={`w-full rounded-lg shadow-lg px-4 py-3 ${typeStyles[toast.type] || typeStyles.error}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-5">{toast.message}</p>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-white/90 hover:text-white cursor-pointer"
                  aria-label="Close notification"
                >
                  x
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
