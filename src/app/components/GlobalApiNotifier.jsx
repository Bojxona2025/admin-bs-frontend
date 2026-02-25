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
  const pathname = usePathname();
  const router = useRouter();
  const authRedirectInProgressRef = useRef(false);

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

    window.addEventListener("app:api-error", handleApiError);
    window.addEventListener("app:auth-required", handleAuthRequired);

    return () => {
      window.removeEventListener("app:api-error", handleApiError);
      window.removeEventListener("app:auth-required", handleAuthRequired);
      delete window.toast;
    };
  }, [pathname, pushToast, router]);

  return (
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
  );
}
