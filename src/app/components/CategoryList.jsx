"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import $api from "../http/api";
import i18next from "../../i18n/i18n";
import { useTranslation } from "react-i18next";
import Link from "next/link";

export default function CategoryList({ onMoreClick }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await $api.get("/categories/get/all", {
          params: { page: 1, limit: 50, sort: "asc" },
        });
        if (response.data.success) setCategories(response.data.data);
      } catch (error) {
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [mounted]);
  const getCategoryName = (category) => {
    if (!category) return "";

    switch (i18next.language) {
      case "ru":
        return category.name_ru || category.name;
      case "en":
        return category.name_en || category.name;
      default:
        return category.name;
    }
  };

  const previewCategories = categories.slice(0, 8);
  if (!mounted) return null;
  return (
    <div className="max-w-[1240px] w-full flex items-start justify-between pt-1 mx-auto max-[670px]:pt-0">
      <div className="bg-white py-2 px-4 flex gap-10 items-center overflow-x-auto no-scrollbar max-[1100px]:hidden">
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="animate-spin w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600">
              {t("categories.loading")}
            </span>
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-gray-500">{t("categories.notFound")}</p>
        ) : (
          <>
            {previewCategories.map((cat, index) => (
              <Link
                key={cat._id || index}
                href={`/search?category=${cat._id}`}
                className="group flex flex-col items-center justify-center min-w-[80px] cursor-pointer hover:scale-105 transition-transform duration-200"
              >
                <span className="text-sm text-center whitespace-nowrap text-gray-700 group-hover:text-[#249B73] transition-colors duration-200">
                  {getCategoryName(cat)}
                </span>
              </Link>
            ))}

            <button
              onClick={onMoreClick}
              className="text-[#249B73] font-semibold hover:underline whitespace-nowrap cursor-pointer"
            >
              {t("categories.more")} →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
