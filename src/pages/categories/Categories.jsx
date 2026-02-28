import React, { useEffect, useState } from "react";
import {
  Search,
  Info,
  Plus,
  ChevronLeft,
  ChevronRight,
  Star,
  Edit,
  FolderPlus,
  MoreVertical,
  Eye,
  X,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import $api from "../../http/api";
import { CreateCategoryModal } from "./CreateCategoryModal";
import { UpdateCategoryModal } from "./UpdateCategoryModal";
import { CreateSubCategoryModal } from "./CreateSubtypeModal";
import { useSelector } from "react-redux";

export const Categories = () => {
  const { user } = useSelector((state) => state.user);
  const actorRole = String(user?.role || "").toLowerCase().replace(/[_\s]/g, "");
  const isSuperAdmin = actorRole === "superadmin";

  const API_ORIGIN = (import.meta.env.VITE_BASE_URL || "")
    .replace(/\/api\/?$/i, "")
    .replace(/\/+$/, "");

  const toCategoryImageUrl = (imgPath) => {
    if (!imgPath) return "";

    const raw = String(imgPath).trim().replace(/\\/g, "/");
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return encodeURI(raw);

    const normalized = raw.startsWith("/")
      ? raw
      : raw.startsWith("uploads/")
      ? `/${raw}`
      : raw.startsWith("categories/")
      ? `/uploads/${raw}`
      : `/uploads/categories/${raw}`;

    return encodeURI(`${API_ORIGIN}${normalized}`);
  };

  const normalizeCategory = (item) => {
    const rawImage =
      item?.category_img || item?.image || item?.categoryImage || "";
    const normalizedImage = String(rawImage || "")
      .trim()
      .replace(/\\/g, "/");

    return {
      ...item,
      name: String(item?.name || "").trim(),
      name_ru: String(item?.name_ru || "").trim(),
      name_en: String(item?.name_en || "").trim(),
      category_img: normalizedImage,
    };
  };

  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryData, setCategoryData] = useState([]);
  const [activeTab, setActiveTab] = useState("catalog");
  const [paginationData, setPaginationData] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isCreateSubCategoryModalOpen, setIsCreateSubCategoryModalOpen] =
    useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    category: null,
  });
  const [showSubtypesMenu, setShowSubtypesMenu] = useState(null);
  const [subtypesData, setSubtypesData] = useState({});
  const [loadingSubtypes, setLoadingSubtypes] = useState({});

  const [filters, setFilters] = useState({
    name: "",
    top: null,
    page: 1,
    limit: 12,
    sort: "desc",
  });

  useEffect(() => {
    fetchCategories();
  }, [filters]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.name) {
        setFilters((prev) => ({
          ...prev,
          name: searchTerm,
          page: 1, // Reset to first page when searching
        }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-menu")) {
        setShowSubtypesMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const handleDeleteCategory = async (categoryId) => {
    if (!isSuperAdmin) return;
    try {
      await $api.delete(`/categories/delete/${categoryId}`);
      await fetchCategories();
      setDeleteConfirmModal({ isOpen: false, category: null });
    } catch (error) {
      console.error("O'chirishda xatolik:", error);
    }
  };
  async function fetchCategories() {
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();

      if (filters.name) params.append("name", filters.name);
      if (filters.top !== null) params.append("top", filters.top);
      params.append("page", filters.page);
      params.append("limit", filters.limit);
      params.append("sort", filters.sort);

      const { data } = await $api.get(
        `/categories/get/all?${params.toString()}`
      );
      console.log("Fetched data:", data);

      const categories = Array.isArray(data?.data)
        ? data.data.map(normalizeCategory)
        : [];

      setPaginationData({
        currentPage: data.currentPage || 1,
        totalItems: data.totalItems || categories.length,
        totalPages: data.totalPages || 1,
      });

      setCategoryData(categories);
    } catch (error) {
      console.log("Category fetch error:", error);
      setCategoryData([]);
      setPaginationData({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  // Fetch subtypes for a specific category
  const fetchSubtypes = async (categoryId) => {
    if (subtypesData[categoryId]) {
      // If subtypes already loaded, just show the menu
      setShowSubtypesMenu(categoryId);
      return;
    }

    setLoadingSubtypes((prev) => ({ ...prev, [categoryId]: true }));

    try {
      const { data } = await $api.get(
        `/sub/types/get/by/category/${categoryId}`
      );
      console.log("Fetched subtypes:", data);

      setSubtypesData((prev) => ({
        ...prev,
        [categoryId]: data?.data || [],
      }));

      setShowSubtypesMenu(categoryId);
    } catch (error) {
      console.log("Subtypes fetch error:", error);
      setSubtypesData((prev) => ({
        ...prev,
        [categoryId]: [],
      }));
      setShowSubtypesMenu(categoryId);
    } finally {
      setLoadingSubtypes((prev) => ({ ...prev, [categoryId]: false }));
    }
  };

  const handleSaveCategory = async (formData) => {
    if (!isSuperAdmin) return;
    console.log("Kategoriya saqlash:", formData);
    try {
      const response = await $api.post("/categories/create", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log("Kategoriya yaratildi:", response.data);
      // Refresh categories after creating
      await fetchCategories();
    } catch (error) {
      console.error("Xatolik:", error);
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Kategoriya muvaffaqiyatli yaratildi!");
  };

  const handleUpdateCategory = async (formData, categoryId) => {
    if (!isSuperAdmin) return;
    if (!categoryId) {
      console.error("Category ID is missing!");
      throw new Error("Category ID is required for update");
    }

    try {
      const response = await $api.patch(
        `/categories/update/${categoryId}`,
        formData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      await fetchCategories();
    } catch (error) {
      console.error("Yangilashda xatolik:", error);
      throw error;
    }
  };

  const handleSaveSubCategory = async (formData, categoryId) => {
    if (!isSuperAdmin) return;
    try {
      const response = await $api.post("/sub/types/create", formData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("Sub-kategoriya yaratildi:", response.data);
      // Refresh categories and clear cached subtypes for this category
      await fetchCategories();
      setSubtypesData((prev) => {
        const updated = { ...prev };
        delete updated[categoryId];
        return updated;
      });
    } catch (error) {
      console.error("Sub-kategoriya yaratishda xatolik:", error);
      throw error;
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= paginationData.totalPages) {
      setFilters((prev) => ({ ...prev, page: newPage }));
    }
  };

  // Handle top filter toggle
  const handleTopFilter = (value) => {
    setFilters((prev) => ({
      ...prev,
      top: prev.top === value ? null : value,
      page: 1,
    }));
  };

  // Handle sort change
  const handleSortChange = (sortValue) => {
    setFilters((prev) => ({
      ...prev,
      sort: sortValue,
      page: 1,
    }));
  };

  const categories = [
    { name: "Все решения", path: "/solutions/all" },
    { name: "Популярное", path: "/solutions/popular" },
    { name: "Для Беларуси", path: "/solutions/belarus" },
    { name: "Для Казахстана", path: "/solutions/kazakhstan" },
    { name: "Для Узбекистана", path: "/solutions/uzbekistan" },
    { name: "Новые", path: "/solutions/new" },
    { name: "CMS, конструкторы сайтов и соцсети", path: "/solutions/cms" },
    { name: "CRM", path: "/solutions/crm" },
    { name: "Email, SMS, мессенджеры", path: "/solutions/messaging" },
    { name: "Автоматизация", path: "/solutions/automation" },
    { name: "Аналитика", path: "/solutions/analytics" },
    { name: "Банки", path: "/solutions/banks" },
    { name: "Бухгалтерия", path: "/solutions/accounting" },
    { name: "Доставка", path: "/solutions/delivery" },
    { name: "Другое", path: "/solutions/other" },
    { name: "Заказы, счета и отгрузки", path: "/solutions/orders" },
    { name: "Контрагенты", path: "/solutions/contractors" },
    { name: "Маркетплейсы", path: "/solutions/marketplaces" },
    { name: "Мобильные приложения", path: "/solutions/mobile" },
    { name: "Онлайн-кассы", path: "/solutions/online-cash" },
    { name: "Оплата по QR-коду в рознице", path: "/solutions/qr-payment" },
    { name: "Платежные системы", path: "/solutions/payment" },
    { name: "Программы лояльности", path: "/solutions/loyalty" },
  ];

  const getCurrentCategoryTitle = () => {
    const currentCategory = categories.find(
      (cat) => cat.path === location.pathname
    );
    return currentCategory ? currentCategory.name : "Kategoriyalar";
  };

  const handleEdit = (solution) => {
    if (!isSuperAdmin) return;
    setSelectedCategory(solution);
    setIsUpdateModalOpen(true);
  };

  const handleCreateSubCategory = (category) => {
    if (!isSuperAdmin) return;
    setSelectedCategoryForSub(category);
    setIsCreateSubCategoryModalOpen(true);
  };

  // Generate page numbers for pagination
  const getVisiblePages = () => {
    const { currentPage, totalPages } = paginationData;
    const visiblePages = [];
    const maxVisible = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      visiblePages.push(i);
    }

    return visiblePages;
  };

  const SubtypesDropdown = ({ categoryId, categoryName }) => {
    const subtypes = subtypesData[categoryId] || [];
    const isLoading = loadingSubtypes[categoryId];

    return (
      <div className="dropdown-menu absolute top-10 right-0 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Sub kategoriyalar</h4>
            <button
              onClick={() => setShowSubtypesMenu(null)}
              className="text-gray-400 cursor-pointer hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Kategoriya nomi:{" "}
            <span className="text-[15px] font-medium text-gray-900">
              {categoryName}
            </span>
          </p>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2db789] mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Yuklanmoqda...</p>
            </div>
          ) : subtypes.length > 0 ? (
            subtypes.map((subtype) => (
              <div
                key={subtype._id}
                className="p-3 hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 text-sm truncate">
                      {subtype.name}
                    </h5>
                    {subtype.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {subtype.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500">
                Sub kategoriyalar topilmadi
              </p>
            </div>
          )}
        </div>

        {isSuperAdmin && (
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={() => {
                setShowSubtypesMenu(null);
                handleCreateSubCategory({ _id: categoryId, name: categoryName });
              }}
              className="w-full cursor-pointer flex items-center justify-center px-3 py-2 bg-[#2db789] text-white rounded-lg hover:bg-[#1a6691] transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Yangi sub kategoriya
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-3 sm:p-5 lg:p-6">
      <div className="bg-gradient-to-r from-white to-emerald-50/40 border border-emerald-100 rounded-2xl p-3 sm:p-5 mb-4 sm:mb-6 shadow-sm">
        <div className="py-1">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3 sm:mb-6">
            <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900">Kategoriyalar</h1>
              <Info className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
              {isSuperAdmin && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center justify-center cursor-pointer space-x-2 px-4 py-2 bg-[#249B73] text-white rounded-lg hover:bg-[#1f8966] focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yangi kategoriya</span>
                </button>
              )}
              <div className="flex items-center w-full sm:w-auto">
                <div className="relative w-full sm:w-[280px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Kategoriya qidirish..."
                    className="w-full pl-10 pr-4 py-2.5 border outline-none border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-6">
            <div className="flex flex-wrap items-center gap-2"></div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <NavLink
                to="/products"
                end
                className={({ isActive }) =>
                  `cursor-pointer rounded-lg px-4 py-2 font-medium transition text-center flex-1 sm:flex-none ${
                    isActive
                      ? "bg-[#249B73] text-white border border-[#249B73]"
                      : "bg-white text-[#249B73] border border-[#249B73]"
                  }`
                }
              >
                Mahsulotlar
              </NavLink>
              <NavLink
                to="/products/categories/all"
                className={({ isActive }) =>
                  `cursor-pointer rounded-lg px-4 py-2 font-medium transition text-center flex-1 sm:flex-none ${
                    isActive
                      ? "bg-[#249B73] text-white border border-[#249B73]"
                      : "bg-white text-[#249B73] border border-[#249B73]"
                  }`
                }
              >
                Kategorialar
              </NavLink>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <div className="flex flex-col lg:flex-row gap-4 pb-2">
          <div className="lg:w-72 lg:sticky lg:top-20 h-fit">
            <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Filtrlar</h3>
            </div>

            {/* Filters Section */}
            <div className="mt-3 bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-700 mb-2 block">
                  Mashhur
                </label>
                <div className="space-y-1">
                  <button
                    onClick={() => handleTopFilter(true)}
                    className={`block w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                      filters.top === true
                        ? "bg-emerald-100 text-emerald-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Faqat mashhur
                  </button>
                  <button
                    onClick={() => handleTopFilter(false)}
                    className={`block w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                      filters.top === false
                        ? "bg-emerald-100 text-emerald-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Muntazam
                  </button>
                </div>
              </div>

              {/* Sort Filter */}
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-700 mb-2 block">
                  Saralash
                </label>
                <select
                  value={filters.sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="desc">Yangi katagoriyalar</option>
                  <option value="asc">Birinchi katagoriyalar</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                {getCurrentCategoryTitle()} ({paginationData.totalItems})
              </h2>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2db789]"></div>
                <span className="ml-2 text-slate-600">Yuklanmoqda...</span>
              </div>
            )}

            {/* Categories Grid */}
            {!loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {categoryData.map((category) => (
                  <div
                    key={category._id}
                    className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-visible border border-emerald-100 relative"
                  >
                    {/* Three dots menu */}
                    <div className="absolute top-3 right-3 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchSubtypes(category._id);
                        }}
                        className="p-2 bg-white/95 hover:bg-white rounded-full shadow-sm border border-slate-200 transition-all"
                      >
                        <MoreVertical className="w-4 h-4 text-slate-600" />
                      </button>

                      {/* Subtypes Dropdown */}
                      {showSubtypesMenu === category._id && (
                        <SubtypesDropdown
                          categoryId={category._id}
                          categoryName={category.name}
                        />
                      )}
                    </div>

                    {/* Image */}
                    <div className="relative overflow-hidden h-44 bg-gradient-to-br from-slate-100 to-slate-200 rounded-t-2xl">
                      <img
                        src={toCategoryImageUrl(category.category_img) || "/avatar-placeholder.svg"}
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/avatar-placeholder.svg";
                        }}
                      />
                      {category.top && (
                        <div className="absolute top-3 left-3 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center">
                          <Star className="w-3 h-3 mr-1" />
                          Top
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col gap-3">
                      <h3 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 min-h-[56px]">
                        {category.name}
                      </h3>

                      <p className="text-slate-600 text-sm min-h-[20px]">
                        {category.top
                          ? "⭐ Mashhur kategoriya"
                          : "Standart kategoriya"}
                      </p>

                      {/* Actions */}
                      {isSuperAdmin ? (
                        <div className="grid grid-cols-1 gap-2 mt-auto">
                          <button
                            onClick={() => handleEdit(category)}
                            className="cursor-pointer flex items-center justify-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Tahrirlash
                          </button>
                          <button
                            onClick={() => handleCreateSubCategory(category)}
                            className="cursor-pointer flex items-center justify-center px-4 py-2 bg-[#249B73] text-white rounded-lg transition-colors text-sm font-medium hover:bg-[#1f8966]"
                          >
                            <FolderPlus className="w-4 h-4 mr-2" />
                            Sub kategoriya qo'shish
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                          Faqat ko'rish rejimi
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && categoryData.length === 0 && (
              <div className="text-center py-12">
                <div className="text-slate-400 mb-2">
                  <Search className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">
                  Hech qanday toifa topilmadi
                </h3>
                <p className="text-slate-600">
                  Qidiruv parametrlari yoki filtrlarini oʻzgartirib koʻring.
                </p>
              </div>
            )}

            {/* Pagination */}
            {!loading && paginationData.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
                <div className="text-sm text-slate-700">
                  Ko'rsatildi{" "}
                  {(paginationData.currentPage - 1) * filters.limit + 1} -{" "}
                  {Math.min(
                    paginationData.currentPage * filters.limit,
                    paginationData.totalItems
                  )}{" "}
                  / {paginationData.totalItems}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      handlePageChange(paginationData.currentPage - 1)
                    }
                    disabled={paginationData.currentPage === 1}
                    className="p-2 rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {getVisiblePages().map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        page === paginationData.currentPage
                          ? "bg-[#249B73] text-white"
                          : "text-slate-700 hover:bg-slate-50 border border-slate-300"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() =>
                      handlePageChange(paginationData.currentPage + 1)
                    }
                    disabled={
                      paginationData.currentPage === paginationData.totalPages
                    }
                    className="p-2 rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-black opacity-30"
            onClick={() =>
              setDeleteConfirmModal({ isOpen: false, category: null })
            }
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-lg shadow-2xl">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Kategoriyani o'chirish
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Haqiqatan ham "{deleteConfirmModal.category?.name}"
                  kategoriyasini o'chirmoqchimisiz? Bu amalni bekor qilib
                  bo'lmaydi.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() =>
                      setDeleteConfirmModal({ isOpen: false, category: null })
                    }
                    className="flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteCategory(deleteConfirmModal.category._id)
                    }
                    className="flex-1 px-4 py-2 cursor-pointer text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    O'chirish
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <CreateCategoryModal
        isOpen={isSuperAdmin && isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSaveCategory}
      />

      <UpdateCategoryModal
        isOpen={isSuperAdmin && isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false);
          setSelectedCategory(null);
        }}
        onSave={handleUpdateCategory}
        categoryData={selectedCategory}
        onDelete={(category) => {
          setIsUpdateModalOpen(false);
          setDeleteConfirmModal({ isOpen: true, category });
        }}
      />

      <CreateSubCategoryModal
        isOpen={isSuperAdmin && isCreateSubCategoryModalOpen}
        onClose={() => {
          setIsCreateSubCategoryModalOpen(false);
          setSelectedCategoryForSub(null);
        }}
        onSave={handleSaveSubCategory}
        categoryId={selectedCategoryForSub?._id}
        categoryName={selectedCategoryForSub?.name}
      />
    </div>
  );
};
