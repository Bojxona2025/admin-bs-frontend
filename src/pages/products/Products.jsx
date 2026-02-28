"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  RefreshCcw,
  Search,
  Settings,
  Plus,
  X,
  Grid,
  List,
  Star,
  Eye,
  Zap,
  TrendingUp,
  Award,
  Package,
  Menu,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import productsApi from "../../http/products";
import { NavLink, useNavigate } from "react-router-dom";
import LazyImage from "../../components/image/LazyImage";
import { getProductImageUrl } from "../../utils/imageUrl";

export const InventoryManagement = () => {
  const navigate = useNavigate();
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(30);
  const [dataLoad, setDataLoad] = useState(false);
  const settingsButtonRef = useRef(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, right: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [sortBy, setSortBy] = useState("name");

  const [products, setProducts] = useState({
    productData: [],
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const debounceRef = useRef(null);

  // Debounce funksiyasi - foydalanuvchi yozishni to'xtatgandan keyin search qiladi
  const debouncedSetSearch = useCallback((value) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearchTerm(value);
    }, 500); // 500ms kutadi
  }, []);

  // Search input o'zgarganda
  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchTerm(value);
      debouncedSetSearch(value);
    },
    [debouncedSetSearch]
  );

  // Search inputni tozalash
  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
  }, []);

  // Yangilash tugmasi bosilganda
  const handleRefresh = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setProducts((prev) => ({ ...prev, currentPage: 1 }));
    fetchProducts(1);
  }, []);

  const handleProductClick = useCallback((product) => {
    navigate(`/products/detail/${product._id}`);
  }, [navigate]);

  const handleAddProduct = () => {
    navigate("/products/create");
  };

  const handleSettingsClick = () => {
    setShowColumnSettings(true);
  };

  const handlePageChange = (page) => {
    setProducts((prev) => ({ ...prev, currentPage: page }));
    fetchProducts(page, debouncedSearchTerm);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevPage = () => {
    if (products.currentPage > 1) {
      const prevPage = products.currentPage - 1;
      handlePageChange(prevPage);
    }
  };

  const handleNextPage = () => {
    if (products.currentPage < products.totalPages) {
      const nextPage = products.currentPage + 1;
      handlePageChange(nextPage);
    }
  };

  // Birinchi yuklanganda va rowsPerPage o'zgarganda
  useEffect(() => {
    setProducts((prev) => ({ ...prev, currentPage: 1 }));
    fetchProducts(1, debouncedSearchTerm);
  }, [rowsPerPage]);

  // Search termi o'zgarganda
  useEffect(() => {
    if (debouncedSearchTerm !== undefined) {
      setProducts((prev) => ({ ...prev, currentPage: 1 }));
      fetchProducts(1, debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    setProducts((prev) => ({ ...prev, currentPage: 1 }));
    fetchProducts(1, debouncedSearchTerm);
  }, [sortBy]);

  async function fetchProducts(page = products.currentPage, search = "") {
    try {
      setDataLoad(true);

      if (search && search.trim() !== "") {
        const { data } = await productsApi.searchByQuery({
          name: search,
          limit: rowsPerPage,
          page,
          sortBy,
        });
        console.log("API javob:", data);
        setProducts({
          productData: data.results || data.productData || data.data || [],
          currentPage: data.page || page,
          totalPages:
            data.totalPages || Math.ceil((data.total || 0) / rowsPerPage) || 1,
          totalItems: data.total || data.totalItems || 0,
        });
        return;
      } else {
        const { data } = await productsApi.listAll({
          limit: rowsPerPage,
          page,
          sortBy,
        });
        console.log("API javob:", data);
        setProducts({
          productData: data.productData || data.data || [],
          currentPage: page,
          totalPages: data.totalPages || 1,
          totalItems: data.totalItems || data.total || 0,
        });
        return;
      }
    } catch (error) {
      console.error("Mahsulotlarni yuklashda xatolik:", error);
      setProducts({
        productData: [],
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
      });
    } finally {
      setDataLoad(false);
    }
  }

  const extractCompanyId = useCallback((product) => {
    const raw = product?.companyId ?? product?.company?._id ?? product?.company;
    if (typeof raw === "string") return raw;
    if (raw && typeof raw === "object" && typeof raw._id === "string") return raw._id;
    return "";
  }, []);

  const getCardStatus = useCallback((product) => {
    const raw = String(product?.status || "").trim().toLowerCase();
    if (raw) return raw;
    const variantRaw = String(product?.variants?.[0]?.saleStatus || "").trim().toLowerCase();
    return variantRaw;
  }, []);

  const handleStatusUpdate = useCallback(async (productId, newStatus, e) => {
    e.stopPropagation();

    try {
      const target = products.productData.find((p) => p._id === productId);
      const fd = new FormData();
      fd.append("status", newStatus);
      const companyId = extractCompanyId(target);
      if (companyId) fd.append("companyId", companyId);
      await productsApi.update(productId, fd);

      setProducts((prevProducts) => ({
        ...prevProducts,
        productData: prevProducts.productData.filter(
          (product) => product._id !== productId
        ),
        totalItems: prevProducts.totalItems - 1,
      }));

      console.log(`Mahsulot holati ${newStatus}ga o'zgartirildi`);
    } catch (error) {
      console.error("Mahsulot holatini o'zgartirishda xatolik:", error);
    }

    setActiveDropdown(null);
  }, [extractCompanyId, products.productData]);

  const toggleDropdown = useCallback((productId, e) => {
    e.stopPropagation();
    setActiveDropdown((prev) => (prev === productId ? null : productId));
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null);
    };

    if (activeDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [activeDropdown]);

  const Pagination = () => {
    const { currentPage, totalPages } = products;

    const getVisiblePages = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      for (
        let i = Math.max(2, currentPage - delta);
        i <= Math.min(totalPages - 1, currentPage + delta);
        i++
      ) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, "...");
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push("...", totalPages);
      } else if (totalPages > 1) {
        rangeWithDots.push(totalPages);
      }

      return rangeWithDots;
    };

    if (totalPages <= 1) return null;


    return (
      <div className="flex items-center justify-end mt-6 sm:mt-8 space-x-1 sm:space-x-2">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
            currentPage === 1
              ? "text-gray-400 cursor-not-allowed bg-gray-50"
              : "text-gray-600 hover:text-white hover:bg-[#2db789] bg-white border border-gray-200 hover:border-[#2db789] cursor-pointer"
          }`}
        >
          <ChevronLeft size={16} className="sm:w-5 sm:h-5" />
        </button>

        <div className="flex items-center space-x-1">
          {getVisiblePages().map((page, index) => {
            if (page === "...") {
              return (
                <span
                  key={`dots-${index}`}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 text-gray-500 text-sm sm:text-base"
                >
                  ...
                </span>
              );
            }

            return (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 cursor-pointer ${
                  currentPage === page
                    ? "bg-[#2db789] text-white shadow-lg"
                    : "bg-white text-gray-600 hover:text-white hover:bg-[#2db789] border border-gray-200 hover:border-[#2db789]"
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
            currentPage === totalPages
              ? "text-gray-400 cursor-not-allowed bg-gray-50"
              : "text-gray-600 hover:text-white hover:bg-[#2db789] bg-white border border-gray-200 hover:border-[#2db789] cursor-pointer"
          }`}
        >
          <ChevronRight size={16} className="sm:w-5 sm:h-5" />
        </button>
      </div>
    );
  };

  const ProductCard = useCallback(({ product, index }) => (
    <div
      className={`group relative bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer ${
        viewMode === "grid"
          ? "h-full"
          : "flex flex-col lg:flex-row h-auto"
      }`}
      style={{
        animationDelay: `${index * 70}ms`,
      }}
      onClick={() => handleProductClick(product)}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-emerald-50/30 to-slate-50/10" />

      <div className="absolute top-3 left-3 right-3 z-20 flex justify-between items-start">
        <div className="flex flex-col gap-1">
          {product.variants[0]?.discount !== 0 && (
            <div className="bg-red-500 text-white px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-sm flex items-center gap-1">
              <Zap size={10} />
              <span>CHEGIRMA</span>
            </div>
          )}

          {product.variants[0]?.averageRating > 4 && (
            <div className="bg-amber-500 text-white px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-sm flex items-center gap-1">
              <TrendingUp size={10} />
              <span>MASHHUR</span>
            </div>
          )}
        </div>


        <div className="flex flex-col gap-2 items-end">
          <div className="relative">
            <button
              type="button"
              onClick={(e) => toggleDropdown(product._id, e)}
              className="p-1.5 bg-white/95 cursor-pointer text-slate-600 hover:text-slate-900 rounded-full shadow-sm transition-all duration-200"
            >
              <MoreVertical size={14} />
            </button>

            {activeDropdown === product._id && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-[140px] z-30">
                <button
                  onClick={(e) =>
                    handleStatusUpdate(product._id, "inactive", e)
                  }
                  className="w-full px-3 cursor-pointer py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2 transition-colors duration-200"
                >
                  <Package size={14} />
                  Arxivlash
                </button>
              </div>
            )}
          </div>

          <div
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              getCardStatus(product) === "active"
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            {getCardStatus(product) === "active" ? "Faol" : "Nofaol"}
          </div>
        </div>
      </div>

      <div
        className={`relative overflow-hidden ${
          viewMode === "grid"
            ? "aspect-square"
            : "w-full lg:w-72 h-52 lg:h-auto"
        }`}
      >
        <LazyImage
          src={getProductImageUrl(product) || "/avatar-placeholder.svg"}
          alt={product.name}
          onError={(e) => {
            e.currentTarget.src = "/avatar-placeholder.svg";
          }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 select-none"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute inset-0 flex items-center justify-center gap-1 sm:gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleProductClick(product);
            }}
            className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-semibold shadow-md transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300 hover:bg-slate-50 flex items-center gap-2 text-sm cursor-pointer"
          >
            <Eye size={14} />
            <span>Ko'rish</span>
          </button>
        </div>

        <div className="absolute bottom-3 left-3 bg-white/95 px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1">
          <Star
            size={12}
            className="fill-yellow-400 text-yellow-400"
          />
          <span className="text-xs font-semibold text-slate-700">
            {product.variants[0]?.averageRating || 0}
          </span>
        </div>
      </div>


      <div
        className={`p-4 lg:p-5 relative z-10 ${
          viewMode === "list" ? "flex-1 flex flex-col justify-between" : ""
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-2.5 gap-2">
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 truncate">
              {product.category?.name}
            </span>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <span>{product.reviewsCount || 0} sharh</span>
            </div>
          </div>

          <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-emerald-700 transition-colors duration-200 text-base leading-tight">
            {product.name}
          </h3>

          <div className="flex flex-col gap-1 mb-2.5">
            <span className="text-sm text-slate-400 line-through font-semibold min-h-5">
              {product.variants[0].price === product.variants[0].discountedPrice
                ? null
                : product.variants[0].price.toLocaleString("ru-Ru")}
            </span>
            <span className="text-xl font-black text-slate-900">
              {product.variants[0].discountedPrice.toLocaleString("ru-RU")} so'm
            </span>
          </div>

          <p className="text-sm text-slate-600 mb-3 line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          <div className="text-xs text-slate-500 space-y-1">
            <div className="flex items-center gap-2">
              <Package size={12} />
              <span className="truncate">Egasi: {product.owner}</span>
            </div>
            <div className="flex items-center gap-2">
              <Award size={12} />
              <span>
                Sana: {new Date(product.createdAt).toLocaleDateString("uz-UZ")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  ), [activeDropdown, getCardStatus, handleProductClick, handleStatusUpdate, toggleDropdown, viewMode]);

  const sortedProducts = [...(products.productData || [])].sort((a, b) => {
    if (sortBy === "price") {
      const aPrice = Number(a?.variants?.[0]?.discountedPrice ?? a?.variants?.[0]?.price ?? 0);
      const bPrice = Number(b?.variants?.[0]?.discountedPrice ?? b?.variants?.[0]?.price ?? 0);
      return aPrice - bPrice;
    }
    if (sortBy === "rating") {
      const aRating = Number(a?.variants?.[0]?.averageRating ?? 0);
      const bRating = Number(b?.variants?.[0]?.averageRating ?? 0);
      return bRating - aRating;
    }
    if (sortBy === "date") {
      const aDate = new Date(a?.createdAt || 0).getTime();
      const bDate = new Date(b?.createdAt || 0).getTime();
      return bDate - aDate;
    }
    return String(a?.name || "").localeCompare(String(b?.name || ""), "uz");
  });

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)] w-full p-3 sm:p-5 lg:p-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-5 mb-4 sm:mb-6">
        <div className="py-1">
          <div className="flex items-center justify-between mb-3 sm:mb-6">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900">
                Mahsulotlar
              </h1>
              <RefreshCcw
                size={10}
                className="sm:w-[14px] sm:h-[14px] text-slate-500 cursor-pointer hover:text-emerald-700 transition-colors"
                onClick={handleRefresh}
              />
            </div>

            <div className="flex items-center space-x-1.5 sm:space-x-4">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="sm:hidden cursor-pointer p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                <Menu size={16} />
              </button>

              {/* Desktop qo'shish tugmasi */}
              <button
                onClick={handleAddProduct}
                className="hidden sm:flex items-center cursor-pointer space-x-2 px-4 py-2 bg-[#249B73] text-white rounded-lg hover:bg-[#1f8966] focus:ring-2 focus:ring-[#2db789] focus:ring-offset-2 transition-colors duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Mahsulot qo'shish</span>
              </button>

              <button
                onClick={handleAddProduct}
                className="sm:hidden p-1.5 cursor-pointer bg-[#249B73] text-white rounded-md hover:bg-[#1f8966] transition-colors"
              >
                <Plus size={16} />
              </button>


              {/* Desktop search */}
              <div className="hidden sm:block relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Mahsulot qidirish..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10 pr-10 py-2.5 border outline-none border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-48 lg:w-64"
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute cursor-pointer right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mobil menyu */}
          {showMobileMenu && (
            <div className="sm:hidden mb-4 p-4 bg-white/90 rounded-xl border border-slate-200 backdrop-blur-sm">
              {/* Mobil search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Mahsulot qidirish..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10 pr-10 py-2 border outline-none border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-full text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute cursor-pointer right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Mobil qo'shish tugmasi */}
              <button
                onClick={handleAddProduct}
                className="w-full flex items-center cursor-pointer justify-center space-x-2 px-4 py-2 bg-[#2db789] text-white rounded-lg hover:bg-[#2db789] transition-colors duration-200 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Mahsulot qo'shish</span>
              </button>
            </div>
          )}


<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                ref={settingsButtonRef}
                onClick={handleSettingsClick}
                className="flex items-center cursor-pointer gap-2 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all duration-200 font-semibold text-slate-700 text-sm"
              >
                <Settings size={15} />
                <span>Sozlamalar</span>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    viewMode === "grid"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white"
                  }`}
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-all cursor-pointer duration-200 ${
                    viewMode === "list"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white"
                  }`}
                >
                  <List size={14} />
                </button>
              </div>
              <NavLink
                to="/products"
                end
                className={({ isActive }) =>
                  `cursor-pointer rounded-lg px-4 py-2 font-medium transition ${
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
                  `cursor-pointer rounded-lg px-4 py-2 font-medium transition ${
                    isActive
                    ? "bg-[#249B73] text-white border border-[#249B73]"
                    : "bg-white text-[#249B73] border border-[#249B73]"
                  }`
                }
              >
                Kategorialar
              </NavLink>
              <NavLink
                to="/archive"
                className={({ isActive }) =>
                  `cursor-pointer rounded-lg px-4 py-2 font-medium transition ${
                    isActive
                      ? "bg-[#249B73] text-white border border-[#249B73]"
                      : "bg-white text-[#249B73] border border-[#249B73]"
                  }`
                }
              >
                Arxiv
              </NavLink>
            </div>
          </div>

          <div className="pt-2 sm:pt-4 text-[10px] sm:text-sm text-slate-600 font-medium">
            <span className="font-bold text-slate-900">
              {products.totalItems}
            </span>
            ta mahsulot topildi
          </div>
        </div>
      </div>

      {dataLoad && (
        <div className="flex justify-center items-center py-16 sm:py-32">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-green-600 border-t-transparent"></div>
          </div>
        </div>
      )}


{!dataLoad && (
        <div className="pb-3">
          <div
            className={`${
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4"
                : "space-y-4"
            }`}
          >
            {sortedProducts.map((product, index) => (
              <ProductCard key={product._id} product={product} index={index} />
            ))}
          </div>

          {products.productData?.length === 0 && !dataLoad && (
            <div className="bg-white border border-slate-200 rounded-2xl text-center py-16 sm:py-20 px-4">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                <Search size={34} className="text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2.5">
                Mahsulot topilmadi
              </h3>
              <p className="text-slate-600 text-base max-w-md mx-auto">
                Qidiruv so'zini yoki filtrlarni o'zgartirib ko'ring
              </p>
            </div>
          )}
          <Pagination />
        </div>
      )}

      {showColumnSettings && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setShowColumnSettings(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                    Sahifa Sozlamalari
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowColumnSettings(false)}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Sahifada mahsulotlar soni:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[6, 12, 18, 24, 30, 36].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setRowsPerPage(num);
                          setShowColumnSettings(false);
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all cursor-pointer ${
                          rowsPerPage === num
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Tartiblash:
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-700"
                  >
                    <option value="name">Nomi bo'yicha</option>
                    <option value="price">Narxi bo'yicha</option>
                    <option value="rating">Reyting bo'yicha</option>
                    <option value="date">Sana bo'yicha</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setShowColumnSettings(false)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Yopish
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};
