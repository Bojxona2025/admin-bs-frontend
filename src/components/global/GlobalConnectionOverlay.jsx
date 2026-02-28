import { useEffect, useMemo, useState } from "react";
import { ServerCrash, WifiOff, RotateCcw } from "lucide-react";

const checkOnlineStatus = () =>
  typeof navigator !== "undefined" ? navigator.onLine !== false : true;
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BASE_URL ||
  "http://localhost:5342/api";
const PROBE_INTERVAL_MS = 5000;
const PROBE_TIMEOUT_MS = 3000;

const probeBackend = async () => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(API_BASE_URL, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
};

export function GlobalConnectionOverlay() {
  const [isOffline, setIsOffline] = useState(!checkOnlineStatus());
  const [backendDown, setBackendDown] = useState(false);
  const [backendMessage, setBackendMessage] = useState(
    "Server bilan aloqa uzildi. Iltimos, backend holatini tekshirib qayta urinib ko'ring."
  );

  useEffect(() => {
    const onOffline = () => setIsOffline(true);
    const onOnline = () => setIsOffline(false);
    const onBackendDown = (event) => {
      setBackendMessage(
        event?.detail?.message ||
          "Server bilan aloqa uzildi. Iltimos, backend holatini tekshirib qayta urinib ko'ring."
      );
      setBackendDown(true);
    };
    const onBackendUp = () => {
      setBackendDown(false);
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    window.addEventListener("api:backend-down", onBackendDown);
    window.addEventListener("api:backend-up", onBackendUp);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("api:backend-down", onBackendDown);
      window.removeEventListener("api:backend-up", onBackendUp);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const runProbe = async () => {
      if (cancelled) return;
      if (!backendDown || !checkOnlineStatus()) {
        timer = window.setTimeout(runProbe, PROBE_INTERVAL_MS);
        return;
      }
      const ok = await probeBackend();
      if (cancelled) return;
      if (ok) {
        setBackendDown(false);
      }
      timer = window.setTimeout(runProbe, PROBE_INTERVAL_MS);
    };

    runProbe();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [backendDown]);

  const showingBackendDown = backendDown && !isOffline;
  const visible = isOffline || showingBackendDown;
  const title = useMemo(() => {
    if (showingBackendDown) return "Server bilan aloqa yo'q";
    if (isOffline) return "Internet bilan aloqa yo'q";
    return "Server bilan aloqa yo'q";
  }, [isOffline, showingBackendDown]);
  const description = showingBackendDown
    ? backendMessage
    : "Internet ulanishingizni tekshiring va qayta urinib ko'ring.";
  const Icon = showingBackendDown ? ServerCrash : WifiOff;
  const statusText = showingBackendDown ? "BACKEND UCHGAN" : "INTERNET UZILGAN";
  const badgeTone = showingBackendDown
    ? "bg-orange-500/20 text-orange-200 border-orange-400/30"
    : "bg-red-500/20 text-red-300 border-red-400/30";
  const iconTone = showingBackendDown ? "text-orange-300" : "text-red-400";

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-[radial-gradient(ellipse_at_top,rgba(18,18,18,.65),rgba(0,0,0,.94))] backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-zinc-950/95 text-white shadow-2xl p-6">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
            <Icon className={`w-8 h-8 ${iconTone}`} />
          </div>
        </div>
        <div className="flex justify-center mb-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide border ${badgeTone}`}>
            {statusText}
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-semibold mb-3">{title}</h2>
        <p className="text-base text-white/85 leading-6">{description}</p>
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-white text-zinc-900 font-medium hover:bg-zinc-200 transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Qayta urinish
          </button>
        </div>
      </div>
    </div>
  );
}
