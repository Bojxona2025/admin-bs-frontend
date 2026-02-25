"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  Menu,
  Search,
  Bell,
  Heart,
  ShoppingCart,
  Mail,
  ShoppingBagIcon,
  User,
  MapPin,
  Download,
  HomeIcon,
  Loader2,
  NotebookPen,
  Shield
} from "lucide-react";
import { useCartStore } from "./hooks/cart";
import { useHomeLikes } from "./hooks/likes";
import CategoryList from "./CategoryList";
import NotificationModal from "./NotificationModal";
import { useNotificationsStore } from "../store/useNotificationsStore";
import $api from "../http/api";
import { useTranslation } from "react-i18next";
import i18next from "../../i18n/i18n";
import { getImageUrls } from "../utils/imageHelper";

export default function Navbar() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subCategoriesLoading, setSubCategoriesLoading] = useState(false);
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [open, setOpen] = useState(false);
  // Desktop search states
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchSuggestions, setSuggestions] = useState([]);

  // Mobile search states
  const [showMobileSearchDropdown, setShowMobileSearchDropdown] =
    useState(false);
  const [mobileSearchSuggestions, setMobileSuggestions] = useState([]);

  const [recentSearches, setRecentSearches] = useState([]);
  const [mounted, setMounted] = useState(false);
  const setNotifications = useNotificationsStore((state) => state.setNotifications);

  useEffect(() => {
    setMounted(true);
  }, []);

  const searchInputRef = useRef(null);
  const searchDropdownRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const mobileSearchDropdownRef = useRef(null);

  const handleLanguageChange = (lang) => {
    const languageMap = {
      UZ: "uz",
      RU: "ru",
      ENG: "en",
    };
    i18next.changeLanguage(languageMap[lang]);
    localStorage.setItem("language", languageMap[lang]);
  };

  const popularSearches = useMemo(
    () => [
      t("navbar.popular_searches_items.phone", "Telefon"),
      t("navbar.popular_searches_items.computer", "Kompyuter"),
      t("navbar.popular_searches_items.clothing", "Kiyim"),
      t("navbar.popular_searches_items.shoes", "Poyafzal"),
      t("navbar.popular_searches_items.book", "Kitob"),
      t("navbar.popular_searches_items.cosmetics", "Kosmetika"),
      t("navbar.popular_searches_items.appliances", "Maishiy texnika"),
      t("navbar.popular_searches_items.sport", "Sport tovarlari"),
    ],
    [t]
  );

  const syncAuthState = useCallback(() => {
    const userRaw = localStorage.getItem("user");
    const accessToken = localStorage.getItem("accessToken");

    if (!userRaw || !accessToken) {
      setIsAuthenticated(false);
      setIsAdminUser(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(userRaw);
      const hasIdentity = Boolean(
        parsedUser &&
          (parsedUser.phone_number ||
            parsedUser.phoneNumber ||
            parsedUser.id ||
            parsedUser._id)
      );
      const role = parsedUser?.role || parsedUser?.user?.role;
      const normalizedRole =
        typeof role === "string" ? role.trim().toUpperCase() : "";
      const adminByRole =
        normalizedRole === "ADMIN" || normalizedRole === "SUPERADMIN";

      setIsAuthenticated(hasIdentity);
      setIsAdminUser(hasIdentity && adminByRole);
    } catch (error) {
      console.error("User data parsing error:", error);
      localStorage.removeItem("user");
      setIsAuthenticated(false);
      setIsAdminUser(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  const fetchSearchSuggestions = async (query, isMobile = false) => {
    if (!query.trim()) {
      if (isMobile) {
        setMobileSuggestions([]);
      } else {
        setSuggestions([]);
      }
      return;
    }

    try {
      const searchParams = {
        name: query,
        q: query,
        limit: 10,
      };

      const res = await $api.get("/products/get/query", {
        params: searchParams,
      });

      let products = [];

      if (res.data && res.data.results && Array.isArray(res.data.results)) {
        products = res.data.results;
      } else if (res.data && Array.isArray(res.data)) {
        products = res.data;
      } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
        products = res.data.data;
      }

      const suggestions = products.map((product) => ({
        _id: product._id,
        name: getProductName(product),
        shortDescription: getProductDescription(product),
        mainImage: product.mainImage,
        price:
          product.variants && product.variants[0]
            ? product.variants[0].price
            : null,
      }));

      if (isMobile) {
        setMobileSuggestions(suggestions);
      } else {
        setSuggestions(suggestions);
      }
    } catch (err) {
      console.error("Search API error:", err);
      if (isMobile) {
        setMobileSuggestions([]);
      } else {
        setSuggestions([]);
      }
    }
  };

  const getProductName = (product) => {
    switch (i18next.language) {
      case "ru":
        return product.name_ru || product.name;
      case "en":
        return product.name_en || product.name;
      default:
        return product.name;
    }
  };

  const getProductDescription = (product) => {
    switch (i18next.language) {
      case "ru":
        return product.shortDescription_ru || product.shortDescription;
      case "en":
        return product.shortDescription_en || product.shortDescription;
      default:
        return product.shortDescription;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSearchSuggestions(searchQuery, false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSearchSuggestions(mobileSearchQuery, true);
    }, 300);

    return () => clearTimeout(timer);
  }, [mobileSearchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Desktop search dropdown
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSearchDropdown(false);
      }

      // Mobile search dropdown
      if (
        mobileSearchDropdownRef.current &&
        !mobileSearchDropdownRef.current.contains(event.target) &&
        mobileSearchInputRef.current &&
        !mobileSearchInputRef.current.contains(event.target)
      ) {
        setShowMobileSearchDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (query, isMobile = false) => {
    const searchTerm = query || (isMobile ? mobileSearchQuery : searchQuery);
    if (searchTerm.trim()) {
      const updated = [
        searchTerm,
        ...recentSearches.filter((s) => s !== searchTerm),
      ].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("recentSearches", JSON.stringify(updated));

      router.push(`/search?name=${encodeURIComponent(searchTerm)}`);

      if (isMobile) {
        setMobileSearchQuery("");
        setShowMobileSearchDropdown(false);
      } else {
        setSearchQuery("");
        setShowSearchDropdown(false);
      }
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    handleSearchSubmit(null, false);
  };

  const handleMobileSearch = (e) => {
    e.preventDefault();
    handleSearchSubmit(null, true);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
  };

  const { cart } = useCartStore();
  const { likes } = useHomeLikes();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await $api.get("/categories/get/all", {
          params: {
            page: 1,
            limit: 50,
            sort: "asc",
          },
        });
        if (response.data.success) {
          setCategories(response.data.data);
          if (response.data.data.length > 0) {
            setSelectedCategory(response.data.data[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchSubCategories = async () => {
      if (!selectedCategory?._id || !isOpen) return;

      try {
        setSubCategoriesLoading(true);
        const response = await $api.get(
          `/sub/types/get/by/category/${selectedCategory._id}`
        );

        if (response.data.status === 200 && response.data.data) {
          setSubCategories(response.data.data || []);
        } else {
          setSubCategories([]);
        }
      } catch (error) {
        console.error("Error fetching subcategories:", error);
        setSubCategories([]);
      } finally {
        setSubCategoriesLoading(false);
      }
    };

    fetchSubCategories();
  }, [selectedCategory, isOpen]);

  useEffect(() => {
    syncAuthState();

    const handleStorageChange = (e) => {
      if (
        e.key === "accessToken" ||
        e.key === "user" ||
        e.key === "admin_token"
      ) {
        syncAuthState();
      }
    };

    const handleAuthChange = () => {
      setTimeout(syncAuthState, 50);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("auth-changed", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("auth-changed", handleAuthChange);
    };
  }, [syncAuthState]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "unset";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    setExpandedGroups({});
    setExpandedGroup(null);
  }, [selectedCategory]);

  const toggleDropdown = () => {
    if (isOpen) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsAnimating(false);
      });
    } else {
      setIsOpen(true);
    }
  };

  const inputRef = useRef(null);
  const mobileInputRef = useRef(null);

  const handleIconClick = () => {
    inputRef.current?.focus();
  };

  const handleMobileIconClick = () => {
    mobileInputRef.current?.focus();
  };

  const notifications = useNotificationsStore((state) => state.notifications);
  const unreadCount = useMemo(
    () =>
      Array.isArray(notifications)
        ? notifications.filter((n) => !(n.read || n.readAt || n.is_read)).length
        : 0,
    [notifications]
  );

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await $api.get("/notifications/my", { _silentError: true });
      const payload = res?.data;
      const incoming = Array.isArray(payload?.notifications)
        ? payload.notifications
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
        ? payload
        : [];
      setNotifications(incoming);
    } catch {
      // background refresh uchun jim o'tkazamiz
    }
  }, [setNotifications]);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;

    fetchNotifications();

    const intervalId = window.setInterval(fetchNotifications, 10000);
    const onFocus = () => fetchNotifications();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [mounted, isAuthenticated, fetchNotifications]);

  const handleCategoryClick = (category) => {
    if (selectedCategory && selectedCategory._id === category._id) {
      router.push(`/search?category=${category._id}`);
      setIsOpen(false);
      return;
    }

    setSelectedCategory(category);
    setSubCategories([]);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        !event.target.closest(".catalog-dropdown") &&
        !event.target.closest(".catalog-btn")
      ) {
        toggleDropdown();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

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

  const getCategoryImageUrls = (category) => {
    if (!category || !category.category_img) return [];
    return getImageUrls(category.category_img);
  };

  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm || !text) return text;

    const regex = new RegExp(`(${searchTerm})`, "gi");
    const parts = text.split(regex);

    return parts
      .map((part, index) => {
        if (regex.test(part)) {
          return `<span style="color:#000; font-weight:bold;">${part}</span>`;
        }
        return part;
      })
      .join("");
  };

  const removeRecentSearch = (searchToRemove) => {
    const updated = recentSearches.filter(
      (search) => search !== searchToRemove
    );
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  const SearchDropdown = ({
    isVisible,
    query,
    suggestions,
    isMobile = false,
    dropdownRef,
  }) => {
    if (!isVisible) return null;

    return (
      <div
        ref={dropdownRef}
        className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto"
      >
        {query && suggestions.length > 0 && (
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 px-3 py-2 uppercase tracking-wide">
              {mounted ? t("navbar.search_results") : null}
            </div>
            {suggestions.map((product) => (
              <button
                key={product._id}
                onClick={() => handleSearchSubmit(product.name, isMobile)}
                className="w-full cursor-pointer text-left px-3 py-2 hover:bg-gray-50 rounded-md flex items-center gap-3 transition-colors"
              >
                <Search size={16} className="text-gray-400" />
                <span
                  className="text-gray-700"
                  dangerouslySetInnerHTML={{
                    __html: highlightSearchTerm(product.name, query),
                  }}
                />
              </button>
            ))}
          </div>
        )}

        {!query && recentSearches.length > 0 && (
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {mounted ? t("navbar.recent_searches") : null}
              </span>
              <button
                onClick={clearRecentSearches}
                className="text-xs text-[#249B73] hover:text-[#249B73]cursor-pointer font-medium"
              >
                {mounted ? t("navbar.clear_searches") : null}
              </button>
            </div>
            {recentSearches.map((search, index) => (
              <div
                key={index}
                className="group flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-md transition-colors"
              >
                <button
                  onClick={() => handleSearchSubmit(search, isMobile)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-gray-700">{search}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecentSearch(search);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 hover:bg-gray-200 rounded-full"
                  title="Remove from recent searches"
                >
                  <X
                    size={14}
                    className="text-gray-400 cursor-pointer hover:text-gray-600"
                  />
                </button>
              </div>
            ))}
          </div>
        )}

        {!query && (
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 px-3 py-2 uppercase tracking-wide">
              {mounted ? t("navbar.popular_searches") : null}
            </div>
            {popularSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => handleSearchSubmit(search, isMobile)}
                className="w-full text-left px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-md flex items-center gap-3 transition-colors"
              >
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                <span className="text-gray-500">{search}</span>
              </button>
            ))}
          </div>
        )}

        {query && suggestions.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            <Search size={24} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">{mounted ? t("navbar.no_results") : null}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <header className="sticky top-0 w-full mx-auto rounded-lg shadow-lg z-50 py-2 bg-white/95 backdrop-blur-sm max-[1260px]:px-4">
        <div className="flex mx-auto justify-between max-w-[1240px] gap-10">
          <a
            href="https://www.google.com/maps/place/Yunusabad"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:underline 
             text-base max-[500px]:text-sm max-[500px]:gap-0.5"
          >
            <MapPin className="text-[#249B73] max-[500px]:w-4 max-[500px]:h-4" />
            <>{mounted ? t("navbar.location") : null}</>
          </a>

          <div className="flex gap-10">
            <a
              href="mailto:it.ideal.forest@gmail.com"
              className="flex items-center gap-3 cursor-pointer max-[500px]:hidden text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Mail className="text-[#249B73]" />
              <span>{mounted ? t("navbar.contact") : null}</span>
            </a>
            <select
              value={
                i18next.language === "uz"
                  ? "UZ"
                  : i18next.language === "ru"
                    ? "RU"
                    : "ENG"
              }
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="border border-gray-200 rounded-lg cursor-pointer px-2 py-1 max-[500px]:px-[2px] max-[500px]:py-[1px] bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="UZ">UZ</option>
              <option value="RU">RU</option>
              <option value="ENG">ENG</option>
            </select>
          </div>
        </div>

        <div className="max-w-[1240px] w-full flex items-start justify-between pt-3 mx-auto max-[670px]:pt-0">
          <button
            onClick={() => router.push("/")}
            className="cursor-pointer text-2xl leading-6 font-bold flex flex-col hover:opacity-80 transition-opacity max-[670px]:hidden"
          >
            <span className="text-gray-800 tracking-[7px]">BARAKA</span>
            <span className="text-[#249B73] text-xs text-center tracking-[16px]">
              SAVDO
            </span>
          </button>

          <div className="relative max-[670px]:hidden">
            <button
              onClick={toggleDropdown}
              disabled={loading}
              className={`catalog-btn bg-gradient-to-r from-[#249B73] max-[1050px]:hidden to-[#249B73] w-[150px] text-white px-4 py-3 rounded-lg flex items-center gap-2 shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:scale-105 ${isOpen ? "bg-gradient-to-r from-[#249B73] to-[#249B73]" : ""
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : isOpen ? (
                <X size={20} />
              ) : (
                <Menu size={20} />
              )}
              <span className="font-semibold">
                {mounted ? t("navbar.catalog") : null}
              </span>
            </button>
          </div>

          {/* Desktop Search */}
          <div className="relative w-1/3 max-[670px]:hidden">
            <form onSubmit={handleSearch} className="relative w-full">
              <label htmlFor="search" className="sr-only">
                {mounted ? t("navbar.search_placeholder") : null}
              </label>
              <input
                id="search"
                ref={searchInputRef}
                type="text"
                autoComplete="off"
                placeholder={mounted ? t("navbar.search_placeholder") : null}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchDropdown(true)}
                className="border border-gray-200 rounded-lg px-4 py-3 w-full outline-none transition-all bg-white pr-12 focus:ring-2 focus:ring-[#249B73] focus:border-[#249B73] shadow-sm"
              />
              <button
                type="submit"
                className="absolute inset-y-0 right-0 bg-[#249B73] hover:bg-[#249B73] cursor-pointer text-white px-4 rounded-r-lg transition-all duration-200"
              >
                <Search size={20} />
              </button>
            </form>

            <SearchDropdown
              isVisible={showSearchDropdown}
              query={searchQuery}
              suggestions={searchSuggestions}
              isMobile={false}
              dropdownRef={searchDropdownRef}
            />
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => setOpen(true)}
              className="relative flex flex-col items-center cursor-pointer group"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-[#ECF4FF] rounded-md group-hover:bg-[#dbeafe] transition-colors relative">
                <Bell size={20} className="text-[#249B73]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-600 pt-1">
                {mounted ? t("navbar.notifications") : null}
              </span>
            </button>

            <NotificationModal open={open} setOpen={setOpen} />

            <button
              onClick={() => router.push("/wishes")}
              className="flex flex-col items-center cursor-pointer relative group"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-[#ECF4FF] rounded-md relative group-hover:bg-[#dbeafe] transition-colors">
                <Heart size={20} className="text-[#249B73]" />
                {likes.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {likes.length}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-600 pt-1">
                {mounted ? t("navbar.wishlist") : null}
              </span>
            </button>

            <button
              onClick={() => router.push("/cart")}
              className="flex flex-col items-center cursor-pointer relative group"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-[#ECF4FF] rounded-md relative group-hover:bg-[#dbeafe] transition-colors">
                <ShoppingCart size={20} className="text-[#249B73]" />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {cart.length}
                  </span>
                )}
              </div>

              <span className="text-xs text-gray-600 pt-1">
                {mounted ? t("navbar.cart") : null}
              </span>
            </button>

            {isAdminUser && (
              <button
                onClick={() => router.push("/admin")}
                className="flex flex-col items-center cursor-pointer group"
                title="Admin panel"
              >
                <div className="w-10 h-10 flex items-center justify-center bg-[#ECF4FF] rounded-md group-hover:bg-[#dbeafe] transition-colors">
                  <Shield size={20} className="text-[#249B73]" />
                </div>
                <span className="text-xs text-gray-600 pt-1">
                  {mounted ? t("navbar.admin") : null}
                </span>
              </button>
            )}

            {isAuthenticated ? (
              <Link href="/profile">
                <button className="flex flex-col items-center cursor-pointer group">
                  <div className="w-10 h-10 flex items-center justify-center bg-[#ECF4FF] rounded-md group-hover:bg-[#dbeafe] transition-colors">
                    <User className="w-6 h-6 text-[#249B73]" />
                  </div>
                  <span className="text-xs text-gray-600 pt-1">
                    {mounted ? t("navbar.profile") : null}
                  </span>
                </button>
              </Link>
            ) : (
              <Link className="self-start" href="/register">
                <button className="px-8 py-3 text-white rounded-md cursor-pointer bg-[#249B73] from-[#EED3DC] to-[#CDD6FD] hover:from-[#e6c7d3] hover:to-[#c4cefb] transition-all duration-200 transform hover:scale-105">
                  {mounted ? t("navbar.login") : null}
                </button>
              </Link>
            )}
          </div>
        </div>

        <div className="relative w-full mt-4 hidden max-[670px]:block max-w-[1240px] mx-auto">
          <form onSubmit={handleMobileSearch} className="relative w-full">
            <label htmlFor="mobile-search" className="sr-only">
              {mounted ? t("navbar.search_placeholder") : null}
            </label>
            <input
              id="mobile-search"
              ref={mobileSearchInputRef}
              type="text"
              autoComplete="off"
              placeholder={mounted ? t("navbar.search_placeholder") : null}
              value={mobileSearchQuery}
              onChange={(e) => setMobileSearchQuery(e.target.value)}
              onFocus={() => setShowMobileSearchDropdown(true)}
              className="border border-gray-200 rounded-lg px-4 py-2 w-full outline-none transition-all bg-gray-50 pr-12 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="absolute inset-y-0 right-0 bg-[#249B73] cursor-pointer text-white px-4 rounded-r-lg transition-all hover:bg-[#249B73]"
            >
              <Search size={20} />
            </button>
          </form>

          <SearchDropdown
            isVisible={showMobileSearchDropdown}
            query={mobileSearchQuery}
            suggestions={mobileSearchSuggestions}
            isMobile={true}
            dropdownRef={mobileSearchDropdownRef}
          />
        </div>

        {!isOpen && <CategoryList onMoreClick={toggleDropdown} />}
      </header>

      <div
        className={`catalog-dropdown fixed top-[120px] left-0 right-0 z-40 transition-all duration-300 ${isOpen
            ? "opacity-100 visible translate-y-0"
            : "opacity-0 invisible -translate-y-4"
          } ${isAnimating ? "pointer-events-none" : ""}`}
      >
        <div className="bg-white max-w-full h-auto">
          <div className="max-w-[1250px] mx-auto border border-gray-100 overflow-hidden">
            <div className="flex h-[88vh]">
              <div className="w-[280px] bg-gradient-to-b from-gray-50 to-white border-r border-gray-100">
                <div className="py-4 px-2 space-y-1 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="animate-spin w-8 h-8 text-green-500" />
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Kategoriyalar topilmadi
                    </div>
                  ) : (
                    categories.map((category, index) => {
                      const isSelected = selectedCategory?._id === category._id;
                      const imageUrls = getCategoryImageUrls(category);
                      const imageUrl = imageUrls[0] || null;

                      return (
                        <div
                          key={category._id || index}
                          onClick={() => handleCategoryClick(category)}
                          className={`py-3 px-4 rounded-lg cursor-pointer transition-all duration-200 text-sm font-medium relative group ${isSelected
                              ? "bg-gradient-to-r from-green-50 to-green-100 text-[#249B73] shadow-sm border-l-4 border-green-500"
                              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            }`}
                          title={
                            isSelected
                              ? `${getCategoryName(category)} products`
                              : `View ${getCategoryName(
                                category
                              )} subcategories`
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={getCategoryName(category)}
                                  data-image-index="0"
                                  loading="lazy"
                                  decoding="async"
                                  className="w-6 h-6 rounded-full mr-2 object-contain"
                                  onError={(e) => {
                                    const currentIndex = Number(
                                      e.currentTarget.dataset.imageIndex || 0
                                    );
                                    const nextImage = imageUrls[currentIndex + 1];
                                    if (nextImage) {
                                      e.currentTarget.dataset.imageIndex = String(
                                        currentIndex + 1
                                      );
                                      e.currentTarget.src = nextImage;
                                      return;
                                    }
                                    console.error(
                                      "Image load error for category:",
                                      category.name,
                                      imageUrl
                                    );
                                    e.target.style.display = "none";
                                    const iconElement =
                                      e.target.parentElement.querySelector(
                                        ".fallback-icon"
                                      );
                                    if (iconElement) {
                                      iconElement.style.display =
                                        "inline-block";
                                    }
                                  }}
                                />
                              ) : null}
                              <ShoppingBagIcon
                                className="w-4 h-4 mr-2 fallback-icon"
                                style={{
                                  display: imageUrl ? "none" : "inline-block",
                                }}
                              />
                              <span className="truncate">
                                {getCategoryName(category)}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <svg
                                className={`w-4 h-4 transition-transform duration-200 ${isSelected
                                    ? "text-green-500 rotate-90"
                                    : "text-gray-400"
                                  }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-full p-6 bg-white">
                <h2 className="text-2xl font-bold text-[#1e7d5d] mb-6">
                  {selectedCategory
                    ? getCategoryName(selectedCategory)
                    : mounted
                      ? t("navbar.select_category")
                      : null}
                </h2>

                {subCategoriesLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="animate-spin w-8 h-8 text-green-500" />
                  </div>
                ) : subCategories.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    {selectedCategory
                      ? mounted
                        ? t("navbar.no_subcategories")
                        : t("navbar.select_category")
                      : null}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {subCategories.map((subCategory, idx) => {
                      const getSubCategoryName = (subCat) => {
                        switch (i18next.language) {
                          case "ru":
                            return subCat.name_ru || subCat.name;
                          case "en":
                            return subCat.name_en || subCat.name;
                          default:
                            return subCat.name;
                        }
                      };

                      return (
                        <div
                          key={subCategory._id || idx}
                          className="p-4 bg-white rounded-xl hover:border-green-400 transition-all duration-300 cursor-pointer group"
                        >
                          <a
                            href={`/search?subType=${subCategory._id}`}
                            className="block"
                          >
                            <h3 className="font-medium text-gray-800 group-hover:text-[#249B73]  transition-colors duration-300 leading-relaxed">
                              {getSubCategoryName(subCategory)}
                            </h3>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full z-50 bg-white border-t border-gray-200 px-4 py-2 flex justify-between items-center md:hidden">
        <button
          onClick={() => router.push("/")}
          className="flex flex-col items-center text-gray-600"
        >
          <HomeIcon size={20} className="text-[#249B73]" />
          <span className="text-xs max-[500px]:text-[10px]">
            {mounted ? t("navbar.home") : null}
          </span>
        </button>
        <button
          onClick={() => router.push("/katalog")}
          className="flex flex-col items-center text-gray-600"
        >
          <NotebookPen size={20} className="text-[#249B73]" />
          <span className="text-xs max-[500px]:text-[10px]">
            {mounted ? t("navbar.katalog") : null}
          </span>
        </button>

        <button
          onClick={() => router.push("/wishes")}
          className="flex flex-col items-center text-gray-600 relative"
        >
          <div className="relative">
            <Heart size={20} className="text-[#249B73]" />
            {likes.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {likes.length > 9 ? "9+" : likes.length}
              </span>
            )}
          </div>
          <span className="text-xs max-[500px]:text-[10px]">
            {mounted ? t("navbar.wishlist") : null}
          </span>
        </button>

        <button
          onClick={() => router.push("/cart")}
          className="flex flex-col items-center text-gray-600 relative"
        >
          <div className="relative">
            <ShoppingCart size={20} className="text-[#249B73]" />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {cart.length > 9 ? "9+" : cart.length}
              </span>
            )}
          </div>
          <span className="text-xs max-[500px]:text-[10px]">
            {mounted ? t("navbar.cart") : null}
          </span>
        </button>

        {isAdminUser && (
          <button
            onClick={() => router.push("/admin")}
            className="flex flex-col items-center text-gray-600"
          >
            <Shield size={20} className="text-[#249B73]" />
            <span className="text-xs max-[500px]:text-[10px]">
              {mounted ? t("navbar.admin") : null}
            </span>
          </button>
        )}

        {isAuthenticated ? (
          <button
            onClick={() => router.push("/profile")}
            className="flex flex-col items-center text-gray-600"
          >
            <User size={20} className="text-[#249B73]" />
            <span className="text-xs max-[500px]:text-[10px]">
              {mounted ? t("navbar.profile") : null}
            </span>
          </button>
        ) : (
          <button
            onClick={() => router.push("/register")}
            className="flex flex-col items-center text-gray-600"
          >
            <User size={20} className="text-[#249B73]" />
            <span className="text-xs max-[500px]:text-[10px]">
              {mounted ? t("navbar.login") : null}
            </span>
          </button>
        )}
      </div>
      <div className="w-full h-[1px] bg-gray-300"></div>
    </>
  );
}
