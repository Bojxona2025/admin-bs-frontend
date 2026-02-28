import { useEffect, useState, useRef } from "react";

const DEFAULT_PING_PATH = "/favicon.ico";
const DEFAULT_TIMEOUT = 3000;

const ping = (url, timeout = DEFAULT_TIMEOUT) => {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve(false);
    }, timeout);

    fetch(url, { method: "GET", cache: "no-store" })
      .then((res) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        // If fetch resolved (even with 404), network is reachable — treat as success.
        resolve(true);
      })
      .catch(() => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(false);
      });
  });
};

export default function useNetworkStatus({ pingPath = DEFAULT_PING_PATH } = {}) {
  const [isOnline, setIsOnline] = useState(true);
  const verifyingRef = useRef(false);

  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const check = async () => {
      if (verifyingRef.current) return;
      verifyingRef.current = true;
      try {
        // If browser reports offline, try a quick same-origin ping to confirm
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          const ok = await ping(`${origin}${pingPath}`);
          setIsOnline(Boolean(ok));
        } else {
          // browser thinks online — still do a light verification to avoid false positives
          const ok = await ping(`${origin}${pingPath}`);
          setIsOnline(Boolean(ok));
        }
      } catch {
        setIsOnline(false);
      } finally {
        verifyingRef.current = false;
      }
    };

    const onOnline = () => {
      check();
    };
    const onOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // initial check
    check();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [pingPath]);

  return { isOnline };
}
