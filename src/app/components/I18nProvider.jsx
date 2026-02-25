"use client";
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18next from "../i18n/i18n";

export default function I18nProvider({ children }) {
  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") || "uz";
    i18next.changeLanguage(savedLanguage);
  }, []);

  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
}
