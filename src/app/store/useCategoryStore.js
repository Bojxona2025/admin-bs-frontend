"use client";
import { create } from "zustand";
import $api from "../http/api";

const useCategoryStore = create((set) => ({
  categories: [],
  loading: true,
  error: null,
  language: "UZ",

  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const response = await $api.get("/catalogs/all");
      set({
        categories: Array.isArray(response.data.data) ? response.data.data : response.data,
        loading: false,
      });
    } catch (err) {
      const errorMessage = err.response
        ? err.response.data.message || "Server xatosi"
        : "Internet aloqasi bilan muammo";
      set({
        error: errorMessage,
        loading: false,
      });
      console.error("API Error:", err.message, err.response?.data);
    }
  },

  setLanguage: (lang) => set({ language: lang }),

  getCategoryName: (category) => {
    if (!category || typeof category !== "object") return "No Name";
    const { language } = useCategoryStore.getState();
    switch (language) {
      case "UZ":
        return category.name_uzb || category.name || "No Name";
      case "RU":
        return category.name_rus || category.name || "No Name";
      case "ENG":
        return category.name_eng || category.name || "No Name";
      default:
        return category.name_uzb || category.name || "No Name";
    }
  },
}));

export default useCategoryStore;
