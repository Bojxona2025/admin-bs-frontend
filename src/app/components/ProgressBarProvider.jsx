"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

NProgress.configure({ showSpinner: false });

export default function ProgressBarProvider({ children }) {
  const pathname = usePathname();

  // Sayt birinchi yuklanganda
  useEffect(() => {
    NProgress.start();
    const timer = setTimeout(() => {
      NProgress.done();
    }, 500); // loading effekt (yarim sekund)

    return () => clearTimeout(timer);
  }, []);

  // Page → Page o‘tishda
  useEffect(() => {
    if (!pathname) return;
    NProgress.start();
    const timer = setTimeout(() => {
      NProgress.done();
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname]);

  return children;
}
