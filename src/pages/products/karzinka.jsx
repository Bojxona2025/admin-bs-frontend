"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  RefreshCcw,
  Search,
  Settings,
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
  Trash2,
  RotateCcw,
} from "lucide-react";
import productsApi from "../../http/products";
import { useNavigate } from "react-router-dom";
import Pagination from "./pagination";
import DeleteModal from "./deletemodal";
import LazyImage from "../../components/image/LazyImage";
import { getProductImageUrl } from "../../utils/imageUrl";

export const TrashProducts = () => {
  const navigate = useNavigate();
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(1);
  const [dataLoad, setDataLoad] = useState(false);
  const settingsButtonRef = useRef(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, right: 0 });
  const [viewMode, setViewMode] = useState("grid");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const [paginationData, setPaginationData] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 30,
  });

  const debounceRef = useRef(null);

  const debouncedSetSearch = useCallback((value) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearchTerm(value);
    }, 500);
  }, []);

  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchTerm(value);
      debouncedSetSearch(value);
    },
    [debouncedSetSearch]
  );

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
  }, []);

  const handleSettingsClick = () => {
    if (settingsButtonRef.current && !showColumnSettings) {
      const rect = settingsButtonRef.current.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const viewportWidth = window.innerWidth;

      const modalWidth = 320;
      let rightPosition = viewportWidth - rect.left - 60;

      if (viewportWidth < 640) {
        rightPosition = 20;
      } else if (rightPosition + modalWidth > viewportWidth - 20) {
        rightPosition = viewportWidth - modalWidth - 20;
      }

      setModalPosition({
        top: rect.bottom + scrollTop - 5,
        right: rightPosition,
      });
    }
    setShowColumnSettings(!showColumnSettings);
  };

  const handleProductClick = useCallback(
    (product) => {
      navigate(`/products/detail/${product._id}`);
    },
    [navigate]
  );

  const handleRefresh = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setPaginationData((prev) => ({ ...prev, currentPage: 1 }));
    fetchProducts();
  }, []);

  const [products, setProducts] = useState({
    data: [],
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  useEffect(() => {
    fetchProducts();
  }, [rowsPerPage, paginationData.currentPage]);

  async function fetchProducts() {
    try {
      setDataLoad(true);
      const { data } = await productsApi.getDeleted({
        page: paginationData.currentPage,
        limit: 30,
      });
      setProducts({
        data: data.data,
        currentPage: data.page,
        totalPages: data.totalPages,
        totalItems: data.total,
      });
    } catch (error) {
      console.log(error);
    } finally {
      setDataLoad(false);
    }
  }

  const handleRestoreProduct = useCallback(async (productId, e) => {
    e.stopPropagation();

    try {
      await productsApi.update(productId, {
        status: "active",
      });

      setProducts((prevProducts) => ({
        ...prevProducts,
        data: prevProducts.data.filter((product) => product._id !== productId),
        totalItems: prevProducts.totalItems - 1,
      }));
    } catch (error) {
      console.error("Mahsulotni tiklashda xatolik:", error);
    }

    setActiveDropdown(null);
  }, []);

  const handleDeleteProduct = useCallback(async (productId, e) => {
    e.stopPropagation();
    setProductToDelete(productId);
    setShowDeleteModal(true);
    setActiveDropdown(null);
  }, []);

  const confirmDelete = async () => {
    if (productToDelete) {
      try {
        await productsApi.remove(productToDelete);

        setProducts((prevProducts) => ({
          ...prevProducts,
          data: prevProducts.data.filter(
            (product) => product._id !== productToDelete
          ),
          totalItems: prevProducts.totalItems - 1,
        }));
      } catch (error) {
        console.error("Mahsulotni o'chirishda xatolik:", error);
      }
    }

    setShowDeleteModal(false);
    setProductToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setProductToDelete(null);
  };

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

  const ProductCard = useCallback(
    ({ product, index }) => (
      <div
        className={`group relative bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer ${
          viewMode === "grid"
            ? "h-full"
            : "flex flex-col lg:flex-row h-auto"
        }`}
        style={{ animationDelay: `${index * 70}ms` }}
        onClick={() => handleProductClick(product)}
      >
        <div className="absolute top-3 left-3 right-3 z-20 flex justify-between items-start">
          <div className="flex flex-col gap-1">
            {product.variants[0]?.discount !== 0 && (
              <div className="bg-red-500 text-white px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-sm flex items-center gap-1">
                <Zap size={10} />
                <span>SALE</span>
              </div>
            )}

            {product.variants[0]?.averageRating > 4 && (
              <div className="bg-amber-500 text-white px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-sm flex items-center gap-1">
                <TrendingUp size={10} />
                <span>HOT</span>
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
                <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-[150px] z-30">
                  <button
                    onClick={(e) => handleRestoreProduct(product._id, e)}
                    className="w-full px-3 cursor-pointer py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 transition-colors duration-200"
                  >
                    <RotateCcw size={14} />
                    Tiklash
                  </button>
                  <button
                    onClick={(e) => handleDeleteProduct(product._id, e)}
                    className="w-full px-3 cursor-pointer py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors duration-200"
                  >
                    <Trash2 size={14} />
                    O'chirish
                  </button>
                </div>
              )}
            </div>

            <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200">
              o'chirilgan
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
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 select-none"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleProductClick(product);
              }}
              className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-semibold shadow-md transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300 hover:bg-slate-50 flex items-center gap-2 text-sm cursor-pointer"
            >
              <Eye size={15} />
              <span>Ko'rish</span>
            </button>
          </div>

          <div className="absolute bottom-3 left-3 bg-white/95 px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1">
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-semibold text-slate-700"></span>
          </div>
        </div>

        <div
          className={`p-4 lg:p-5 relative z-10 ${
            viewMode === "list" ? "flex-1 flex flex-col justify-between" : ""
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2.5 gap-2">
              <span className="text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100 truncate">
                {product.category?.name || "Kategoriya yo'q"}
              </span>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <span>{product.reviewsCount}</span>
              </div>
            </div>

            <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-red-700 transition-colors duration-200 text-base leading-tight">
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
                <span>Sana: {product.createdAt}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    [
      activeDropdown,
      handleDeleteProduct,
      handleProductClick,
      handleRestoreProduct,
      toggleDropdown,
      viewMode,
    ]
  );

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)] w-full p-3 sm:p-5 lg:p-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-5 mb-4 sm:mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900">
                Korzinka
              </h1>
              <RefreshCcw
                size={14}
                className="text-slate-500 cursor-pointer hover:text-red-700 transition-colors"
                onClick={handleRefresh}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="sm:hidden cursor-pointer p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Menu size={16} />
              </button>

              <div className="hidden sm:block relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Korzinkadan qidirish"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10 pr-10 py-2.5 border outline-none border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 w-52 lg:w-72"
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                ref={settingsButtonRef}
                onClick={handleSettingsClick}
                className="flex items-center cursor-pointer gap-2 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all duration-200 font-semibold text-slate-700 text-sm"
              >
                <Settings size={15} />
                <span>Sozlamalar</span>
              </button>

              <div className="sm:hidden relative grow min-w-[210px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Korzinkadan qidirish"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-9 pr-9 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
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
            </div>
          </div>

          <div className="pt-1 text-sm text-slate-600 font-medium">
            <span className="font-bold text-slate-900">{paginationData.totalItems}</span>
            ta o'chirilgan mahsulot topildi
          </div>
        </div>
      </div>

      {dataLoad && (
        <div className="flex justify-center items-center py-20">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
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
            {products.data.map((product, index) => (
              <ProductCard key={product._id} product={product} index={index} />
            ))}
          </div>

          {products.data.length === 0 && !dataLoad && (
            <div className="bg-white border border-slate-200 rounded-2xl text-center py-16 sm:py-20 px-4">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                <Trash2 size={34} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2.5">Korzinka bo'sh</h3>
              <p className="text-slate-600 text-base max-w-md mx-auto">
                Hozircha o'chirilgan mahsulotlar yo'q
              </p>
            </div>
          )}
        </div>
      )}

      {showColumnSettings && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setShowColumnSettings(false)}
          />

          <div
            className="fixed bg-white/95 left-15 backdrop-blur-xl border border-slate-200 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden w-[calc(100vw-2rem)] max-w-sm z-50 transform transition-all duration-300"
            style={{
              top: window.innerWidth < 640 ? "50%" : `${modalPosition.top}px`,
              right:
                window.innerWidth < 640 ? "50%" : `${modalPosition.right}px`,
              transform:
                window.innerWidth < 640 ? "translate(50%, -50%)" : "none",
            }}
          >
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900 text-lg sm:text-xl">
                  Sahifa Sozlamalari
                </h3>
                <button
                  onClick={() => setShowColumnSettings(false)}
                  className="p-2 text-slate-400 cursor-pointer hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors sm:hidden"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6 sm:mb-8">
                <label className="block text-sm font-semibold text-slate-700 mb-4">
                  Sahifada mahsulotlar soni:
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[6, 11, 16, 21, 26, 31].map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        setRowsPerPage(num);
                        setShowColumnSettings(false);
                      }}
                      className={`px-3 sm:px-4 py-2 sm:py-3 cursor-pointer text-sm rounded-lg sm:rounded-xl border-2 font-semibold transition-all duration-300 hover:scale-105 ${
                        rowsPerPage === num
                          ? "bg-red-600 text-white border-transparent shadow-lg"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6 sm:mb-8">
                <label className="block text-sm font-semibold text-slate-700 mb-4">
                  Tartiblash:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setShowColumnSettings(false);
                  }}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-slate-700 font-medium"
                >
                  <option value="name">Nomi bo'yicha</option>
                  <option value="price">Narxi bo'yicha</option>
                  <option value="rating">Reyting bo'yicha</option>
                  <option value="date">Sana bo'yicha</option>
                </select>
              </div>

              <button
                onClick={() => setShowColumnSettings(false)}
                className="w-full px-6 py-3 cursor-pointer bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors duration-200 font-semibold"
              >
                Yopish
              </button>
            </div>
          </div>
        </>
      )}

      <Pagination
        currentPage={products.currentPage}
        totalPages={products.totalPages}
        totalItems={products.totalItems}
        rowsPerPage={30}
        onPageChange={(page) =>
          setProducts((prev) => ({ ...prev, currentPage: page }))
        }
      />

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Mahsulotni butunlay o'chirish"
        message="Mahsulotni butunlay o'chirishga ishonchingiz komilmi? Bu amalni bekor qilib bo'lmaydi."
      />

      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};
