"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "./ProductCard";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import $api from "../http/api";
import { useTranslation } from "react-i18next";
import i18next from "../../i18n/i18n";
import ProductCardItems from "./ProductCardItems";
import { getImageUrl } from "../utils/imageHelper";

export default function SearchResults() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("name") || "";
  const subType = searchParams.get("subType") || "";
  const category = searchParams.get("category") || "";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [mounted, setMounted] = useState(false);

  const PRODUCTS_PER_PAGE = 60;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (searchQuery || subType || category) {
      setCurrentPage(1);
      fetchProducts(1);
    }
  }, [searchQuery, subType, category]);

  useEffect(() => {
    if ((searchQuery || subType || category) && currentPage >= 1) {
      fetchProducts(currentPage);
    }
  }, [currentPage]);

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

  const transformProductData = (apiProduct) => {
    const mainImage = getImageUrl(apiProduct.mainImage);

    let price = 0;
    let discountedPrice = null;

    if (apiProduct.variants && apiProduct.variants.length > 0) {
      const firstVariant = apiProduct.variants[0];
      price = firstVariant.price || 0;
      discountedPrice = firstVariant.discountedPrice || null;
    }

    return {
      id: apiProduct._id,
      name: apiProduct.name || "",
      name_ru: apiProduct.name_ru || "",
      name_en: apiProduct.name_en || "",
      image: mainImage,
      price: price,
      discountedPrice: discountedPrice,
      shortDescription: apiProduct.shortDescription || "",
      shortDescription_ru: apiProduct.shortDescription_ru || "",
      shortDescription_en: apiProduct.shortDescription_en || "",
      variants: apiProduct.variants || [],
      reviews_count: apiProduct.reviews_count || 0,
      mainImage: mainImage,
      category: apiProduct.category,
      subType: apiProduct.subType,
    };
  };

  const fetchProducts = async (page = 1) => {
    setLoading(true);
    setError("");

    try {
      let response;

      if (subType) {
        response = await $api.get("/products/get/query", {
          params: {
            subType: subType,
            page: page,
            limit: PRODUCTS_PER_PAGE,
            sort: "desc",
          },
        });
      } else if (category) {
        response = await $api.get("/products/get/query", {
          params: {
            category: category,
            page: page,
            limit: PRODUCTS_PER_PAGE,
            sort: "desc",
          },
        });
      } else if (searchQuery) {
        response = await $api.get("/products/get/query", {
          params: {
            name: searchQuery,
            q: searchQuery,
            page: page,
            limit: PRODUCTS_PER_PAGE,
            sort: "desc",
          },
        });
      }

      if (response && response.data) {
        let productsData = [];
        let total = 0;

        if (response.data.results && Array.isArray(response.data.results)) {
          productsData = response.data.results;
          total =
            response.data.total || response.data.count || productsData.length;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          productsData = response.data.data;
          total =
            response.data.total || response.data.count || productsData.length;
        } else if (Array.isArray(response.data)) {
          productsData = response.data;
          total = productsData.length;
        } else if (response.data.success && response.data.data) {
          productsData = Array.isArray(response.data.data)
            ? response.data.data
            : [];
          total =
            response.data.total || response.data.count || productsData.length;
        }

        const transformedProducts = productsData.map(transformProductData);

        setProducts(transformedProducts);
        setTotalProducts(total);
        setTotalPages(Math.ceil(total / PRODUCTS_PER_PAGE));

        if (transformedProducts.length === 0) {
          setError(
            mounted
              ? t("search_results.no_products_found")
              : "Bu mahsulot boyicha malumot topilmadi"
          );
        }
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setError(
        mounted
          ? t("search_results.fetch_error")
          : "Mahsulotlarni yuklashda xatolik yuz berdi"
      );
      setProducts([]);
      setTotalProducts(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getPaginationRange = () => {
    const range = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        range.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);

      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }

      for (let i = start; i <= end; i++) {
        range.push(i);
      }
    }

    return range;
  };

  const getDisplayTitle = () => {
    if (searchQuery) {
      return `"${searchQuery}"`;
    }
    if (subType) {
      return mounted
        ? t("search_results.category_results")
        : "Kategoriya bo'yicha natijalar";
    }
    if (category) {
      return mounted
        ? t("search_results.category_results")
        : "Kategoriya bo'yicha natijalar";
    }
    return mounted ? t("search_results.search_results") : "Qidiruv natijalari";
  };

  if (!searchQuery && !subType && !category) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-4 max-[500px]:px-1">
      <div className="mb-6 px-2 max-[500px]:px-2">
        {totalProducts > 0 && (
          <p className="text-gray-600 text-sm max-[500px]:text-xs">
            {mounted
              ? t("search_results.showing_results", {
                  start: (currentPage - 1) * PRODUCTS_PER_PAGE + 1,
                  end: Math.min(currentPage * PRODUCTS_PER_PAGE, totalProducts),
                  total: totalProducts,
                })
              : `${(currentPage - 1) * PRODUCTS_PER_PAGE + 1}-${Math.min(
                  currentPage * PRODUCTS_PER_PAGE,
                  totalProducts
                )} dan ${totalProducts} ta natija`}
          </p>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin text-[#249B73]" size={24} />
            <span className="text-gray-600 max-[500px]:text-sm">
              {mounted ? t("search_results.loading") : "Yuklanmoqda..."}
            </span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto max-[500px]:p-4 max-[500px]:mx-2">
            <Search
              className="mx-auto text-red-400 mb-4 max-[500px]:mb-2"
              size={48}
            />
            <p className="text-red-500 text-sm max-[500px]:text-xs">{error}</p>
          </div>
        </div>
      )}

      {!loading &&
        !error &&
        products.length === 0 &&
        (searchQuery || subType || category) && (
          <div className="text-center py-12">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 max-w-md mx-auto max-[500px]:p-4 max-[500px]:mx-2">
              <Search
                className="mx-auto text-gray-400 mb-4 max-[500px]:mb-2"
                size={48}
              />
              <h3 className="text-lg font-medium text-gray-800 mb-2 max-[500px]:text-base max-[500px]:font-normal">
                {mounted
                  ? t("search_results.no_results_title")
                  : "Natija topilmadi"}
              </h3>
              <p className="text-gray-600 text-sm mb-4 max-[500px]:text-xs max-[500px]:mb-2">
                {mounted
                  ? t("search_results.no_results_message")
                  : "Qidiruv so'rovingiz bo'yicha hech qanday mahsulot topilmadi"}
              </p>
              <div className="text-xs text-gray-500 max-[500px]:text-[10px]">
                <p>
                  {mounted
                    ? t("search_results.search_tips")
                    : "Qidiruv maslahatlari"}
                  :
                </p>
                <ul className="mt-2 text-left">
                  <li>
                    •{" "}
                    {mounted
                      ? t("search_results.tip_1")
                      : "So'zlarni to'g'ri yozing"}
                  </li>
                  <li>
                    •{" "}
                    {mounted
                      ? t("search_results.tip_2")
                      : "Boshqa so'zlar bilan urinib ko'ring"}
                  </li>
                  <li>
                    •{" "}
                    {mounted
                      ? t("search_results.tip_3")
                      : "Umumiy so'zlardan foydalaning"}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

      {!loading && products.length > 0 && (
        <>
          {/* Products Grid - Responsive */}
          <div className="grid grid-cols-6 gap-4 mb-8 max-[1330px]:grid-cols-5 max-[1024px]:grid-cols-4 max-[768px]:grid-cols-3 max-[640px]:grid-cols-2 max-[500px]:gap-2">
            {products.map((product) => (
              <div key={product.id} className="flex justify-center">
                <div className="w-[190px] max-[420px]:w-[180px] max-[400px]:w-[170px] max-[380px]:w-[160px] max-[361px]:w-[150px] max-[500px]:w-full">
                  <ProductCardItems product={product} />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination - Responsive */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 px-2 max-[500px]:gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`flex items-center gap-2 px-4 cursor-pointer py-2 rounded-lg transition-all max-[500px]:px-2 max-[500px]:py-1 max-[500px]:text-sm ${
                  currentPage === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                <ChevronLeft size={16} className="max-[500px]:hidden" />
                <span className="max-[500px]:hidden">
                  {mounted ? t("search_results.previous") : "Oldingi"}
                </span>
                <span className="min-[501px]:hidden">‹</span>
              </button>

              <div className="flex gap-2 max-[500px]:gap-1 overflow-x-auto max-[500px]:max-w-[200px]">
                {getPaginationRange().map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-4 py-2 rounded-lg cursor-pointer transition-all flex-shrink-0 max-[500px]:px-2 max-[500px]:py-1 max-[500px]:text-sm ${
                      currentPage === pageNum
                        ? "bg-[#249B73] text-white shadow-md"
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="px-2 text-gray-400 max-[500px]:hidden">
                    ...
                  </span>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="px-4 py-2 rounded-lg cursor-pointer bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-all max-[500px]:px-2 max-[500px]:py-1 max-[500px]:text-sm max-[500px]:hidden"
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-2 px-4 py-2 cursor-pointer rounded-lg transition-all max-[500px]:px-2 max-[500px]:py-1 max-[500px]:text-sm ${
                  currentPage === totalPages
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span className="max-[500px]:hidden">
                  {mounted ? t("search_results.next") : "Keyingi"}
                </span>
                <span className="min-[501px]:hidden">›</span>
                <ChevronRight size={16} className="max-[500px]:hidden" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
