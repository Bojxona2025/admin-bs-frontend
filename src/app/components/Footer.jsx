"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import $api from "../http/api";

const Footer = () => {
  const { t, i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [footerCategories, setFooterCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const FOOTER_CATEGORY_IDS = [
    "689dc751e9443d84b885e458",
    "689dc8d8e9443d84b885e47e",
    "689dc9cbe9443d84b885e499",
  ];

  const getName = (item) => {
    const currentLang = i18n.language;
    if (currentLang === "ru") return item.name_ru || item.name;
    if (currentLang === "en") return item.name_en || item.name;
    return item.name;
  };

  const fetchFooterData = async () => {
    try {
      setLoading(true);

      const categoriesResponse = await $api.get("/categories/get/all", {
        params: { page: 1, limit: 50, sort: "asc" },
      });

      if (categoriesResponse.data.success) {
        const selectedCategories = categoriesResponse.data.data.filter(
          (category) => FOOTER_CATEGORY_IDS.includes(category._id)
        );

        const categoriesWithSubs = await Promise.all(
          selectedCategories.map(async (category) => {
            try {
              const subResponse = await $api.get(
                `/sub/types/get/by/category/${category._id}`
              );

              return {
                ...category,
                subCategories: subResponse.data.data || [],
              };
            } catch (error) {
              console.error(
                `Sub-kategoriyalarni yuklashda xato: ${category.name}`,
                error
              );
              return {
                ...category,
                subCategories: [],
              };
            }
          })
        );

        setFooterCategories(categoriesWithSubs);
      }
    } catch (error) {
      console.error("Footer ma'lumotlarini yuklashda xato:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchFooterData();
  }, []);

  if (!mounted) return null;

  return (
    <footer className="bg-white border-t border-gray-200 mt-16 max-[720px]:pb-24">
      <div className="max-w-[1240px] mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {loading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div key={index}>
                  <div className="h-6 bg-gray-200 rounded mb-4 animate-pulse"></div>
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-4 bg-gray-100 rounded animate-pulse"
                      ></div>
                    ))}
                  </div>
                </div>
              ))
            : footerCategories.map((category, index) => (
                <div key={category._id}>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                    {getName(category)}
                  </h3>
                  <ul className="space-y-2 sm:space-y-3">
                    {category.subCategories.slice(0, 4).map((subCategory) => (
                      <li key={subCategory._id}>
                        <Link
                          href={`/search?subType=${subCategory._id}`}
                          className="footer-link"
                        >
                          {getName(subCategory)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          <div className=" lg:col-span-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              {t("contact.title")}
            </h3>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[#ECF4FF] rounded-md flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-[#249B73]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <a
                  href="mailto:it.ideal.forest@gmail.com"
                  className="text-gray-600 hover:text-[#249B73] transition-colors text-sm break-words max-w-[220px]"
                >
                  it.ideal.forest@gmail.com
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[#ECF4FF] rounded-md flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-[#249B73]"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M22 2L2 11l5.5 2 2.5 7 3.5-3 5 4 2.5-17z" />
                  </svg>
                </div>
                <a
                  href="https://t.me/BsMarket_support_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-link"
                >
                  {t("contact.telegram")}
                </a>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-[#ECF4FF] rounded-md flex items-center justify-center mt-1 flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-[#249B73]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <address className="not-italic text-gray-600 text-sm leading-relaxed">
                  {t("contact.country")}
                  <br />
                  {t("contact.city")}
                </address>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0 items-start">
            <div className="flex space-x-3 sm:space-x-4 justify-center sm:justify-start">
              <a
                href="https://www.youtube.com/@bsmarketuz"
                className="w-10 h-10 bg-[#ECF4FF] rounded-md flex items-center justify-center hover:bg-[#dbeafe] transition-colors duration-200 group"
                aria-label="YouTube"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className="w-5 h-5 text-[#249B73] group-hover:scale-110 transition-transform"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M23.498 6.186a2.971 2.971 0 0 0-2.09-2.103C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.408.583a2.971 2.971 0 0 0-2.09 2.103C0 8.09 0 12 0 12s0 3.91.502 5.814a2.971 2.971 0 0 0 2.09 2.103C4.495 20.5 12 20.5 12 20.5s7.505 0 9.408-.583a2.971 2.971 0 0 0 2.09-2.103C24 15.91 24 12 24 12s0-3.91-.502-5.814zM9.75 15.568V8.432L15.818 12 9.75 15.568z" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61579159990235"
                className="w-10 h-10 bg-[#ECF4FF] rounded-md flex items-center justify-center hover:bg-[#dbeafe] transition-colors duration-200 group"
                aria-label="Facebook"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className="w-5 h-5 text-[#249B73] group-hover:scale-110 transition-transform"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.333v21.334C0 23.403.597 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.658-4.788 1.325 0 2.464.099 2.797.143v3.24l-1.92.001c-1.504 0-1.796.715-1.796 1.762v2.31h3.587l-.467 3.622h-3.12V24h6.116C23.403 24 24 23.403 24 22.667V1.333C24 .597 23.403 0 22.675 0z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-[#ECF4FF] rounded-md flex items-center justify-center hover:bg-[#dbeafe] transition-colors duration-200 group"
                aria-label="LinkedIn"
              >
                <svg
                  className="w-5 h-5 text-[#249B73] group-hover:scale-110 transition-transform"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/bsmarket_uz/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#ECF4FF] rounded-md flex items-center justify-center hover:bg-[#dbeafe] transition-colors duration-200 group"
                aria-label="Instagram"
              >
                <svg
                  className="w-5 h-5 text-[#249B73] group-hover:scale-110 transition-transform"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12.025 2.486c2.731 0 3.058.01 4.14.06 1.074.049 1.658.228 2.048.379.515.2.882.44 1.27.828.388.388.628.755.828 1.27.15.39.33.974.379 2.048.05 1.082.06 1.409.06 4.14s-.01 3.058-.06 4.14c-.049 1.074-.228 1.658-.379 2.048-.2.515-.44.882-.828 1.27-.388.388-.755.628-1.27.828-.39.15-.974.33-2.048.379-1.082.05-1.409.06-4.14.06s-3.058-.01-4.14-.06c-1.074-.049-1.658-.228-2.048-.379-.515-.2-.882-.44-1.27-.828-.388-.388-.628-.755-.828-1.27-.15-.39-.33-.974-.379-2.048-.05-1.082-.06-1.409-.06-4.14s.01-3.058.06-4.14c.049-1.074.228-1.658.379-2.048.2-.515.44-.882.828-1.27.388-.388.755-.628 1.27-.828.39-.15.974-.33 2.048-.379 1.082-.05 1.409-.06 4.14-.06M12.025 0c-2.782 0-3.131.012-4.22.063-1.087.05-1.831.219-2.48.468-.673.262-1.244.612-1.813 1.18-.568.569-.918 1.14-1.18 1.813-.249.649-.418 1.393-.468 2.48C2.012 6.894 2 7.243 2 10.025s.012 3.131.063 4.22c.05 1.087.219 1.831.468 2.48.262.673.612 1.244 1.18 1.813.569.568 1.14.918 1.813 1.18.649.249 1.393.418 2.48.468 1.089.051 1.438.063 4.22.063s3.131-.012 4.22-.063c1.087-.05 1.831-.219 2.48-.468.673-.262 1.244-.612 1.813-1.18.568-.569.918-1.14 1.18-1.813.249-.649.418-1.393.468-2.48.051-1.089.063-1.438.063-4.22s-.012-3.131-.063-4.22c-.05-1.087-.219-1.831-.468-2.48-.262-.673-.612-1.244-1.18-1.813-.569-.568-1.14-.918-1.813-1.18-.649-.249-1.393-.418-2.48-.468C15.156.012 14.807 0 12.025 0z" />
                  <path d="M12.025 5.848c-2.805 0-5.081 2.276-5.081 5.081s2.276 5.081 5.081 5.081 5.081-2.276 5.081-5.081-2.276-5.081-5.081-5.081zm0 8.378c-1.82 0-3.297-1.477-3.297-3.297s1.477-3.297 3.297-3.297 3.297 1.477 3.297 3.297-1.477 3.297-3.297 3.297z" />
                  <circle cx="17.338" cy="6.691" r="1.188" />
                </svg>
              </a>
              <a
                href="https://t.me/bsmarket_uz"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#ECF4FF] rounded-md flex items-center justify-center hover:bg-[#dbeafe] transition-colors duration-200 group"
                aria-label="Telegram"
              >
                <svg
                  className="w-5 h-5 text-[#249B73] group-hover:scale-110 transition-transform"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M22 2L2 11l5.5 2 2.5 7 3.5-3 5 4 2.5-17z" />
                </svg>
              </a>
            </div>

            <div className="text-sm text-gray-600 text-center sm:text-left">
              {t("newsletter.socail_media")}
            </div>
          </div>
        </div>

        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-200">
          <div className="flex items-center justify-between max-[820px]:flex-col max-[820px]:items-start max-[820px]:gap-4">
            <div className="">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                {t("newsletter.title")}
              </h4>
              <p className="text-gray-600 text-sm max-[820px]:mt-1">
                {t("newsletter.subtitle")}
              </p>
            </div>

            <div className="flex w-full sm:w-auto items-stretch sm:items-center gap-2 flex-col sm:flex-row">
              <input
                type="email"
                placeholder={t("newsletter.placeholder")}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-64"
              />
              <button className="px-6 py-2 bg-[#249B73] text-white rounded-lg text-sm cursor-pointer w-full sm:w-auto">
                {t("newsletter.button")}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center">
            <div className="flex flex-col sm:flex-row sm:items-center max-[420px]:mb-8">
              <div className="text-lg sm:text-xl font-bold">
                <span className="text-gray-800">BARAKA</span>
                <span className="text-[#249B73] ml-1">SAVDO</span>
              </div>
              <p className="text-gray-600 text-sm ml-2">© 2025 {t("rights")}</p>
            </div>

            <div className="flex sm:flex-row sm:space-x-6 text-sm mb-8 gap-4 mt-2 max-[430px]:gap-2 max-[420px]:hidden">
              <Link href="/#" className="footer-link">
                {t("policies.privacy")}
              </Link>
              <a
                href="/terms.pdf"
                rel="noopener noreferrer"
                className="footer-link"
              >
                {t("policies.terms")}
              </a>
              <Link href="/#" className="footer-link">
                {t("policies.cookies")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
