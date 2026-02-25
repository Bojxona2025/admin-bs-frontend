"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Loader2,
  ShoppingBagIcon,
  Search,
  ArrowLeft,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import $api from "../http/api";
import { useTranslation } from "react-i18next";
import i18next from "../../i18n/i18n";
import { getImageUrls } from "@/app/utils/imageHelper";

const Katalog = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subCategoriesLoading, setSubCategoriesLoading] = useState(false);
  const [showSubCategories, setShowSubCategories] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      if (!selectedCategory?._id) return;

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
  }, [selectedCategory]);

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

  const getSubCategoryName = (subCategory) => {
    if (!subCategory) return "";

    switch (i18next.language) {
      case "ru":
        return subCategory.name_ru || subCategory.name;
      case "en":
        return subCategory.name_en || subCategory.name;
      default:
        return subCategory.name;
    }
  };

  const getCategoryImageUrls = (category) => {
    if (!category || !category.category_img) return [];
    return getImageUrls(category.category_img);
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setShowSubCategories(true);
  };

  const handleBackToCategories = () => {
    setShowSubCategories(false);
    setSelectedCategory(null);
    setSubCategories([]);
  };

  const handleSubCategoryClick = (subCategory) => {
    router.push(`/search?subType=${subCategory._id}`);
  };

  const handleCategorySearch = (category) => {
    router.push(`/search?category=${category._id}`);
  };

  const filteredCategories = categories.filter((category) =>
    getCategoryName(category).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSubCategories = subCategories.filter((subCategory) =>
    getSubCategoryName(subCategory)
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  if (!mounted) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin w-8 h-8 text-[#249B73]" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-4">
            {showSubCategories ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToCategories}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <h1 className="text-lg font-semibold text-gray-800 truncate">
                  {selectedCategory ? getCategoryName(selectedCategory) : ""}
                </h1>
              </div>
            ) : (
              <h1 className="text-lg font-semibold text-gray-800 text-center">
                {t("navbar.catalog") || "Katalog"}
              </h1>
            )}
          </div>
        </div>

        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-md mx-auto relative">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder={
                  showSubCategories
                    ? `${getCategoryName(selectedCategory)} ichidan qidiring...`
                    : "Kategoriyalardan qidiring..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#249B73] focus:border-[#249B73] outline-none bg-gray-50"
              />
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin w-8 h-8 text-[#249B73]" />
            </div>
          ) : showSubCategories ? (
            <div>
              <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {selectedCategory &&
                    getCategoryImageUrls(selectedCategory)[0] ? (
                      <img
                        src={getCategoryImageUrls(selectedCategory)[0]}
                        data-image-index="0"
                        alt={getCategoryName(selectedCategory)}
                        loading="lazy"
                        decoding="async"
                        className="w-8 h-8 rounded-full mr-3 object-contain"
                        onError={(e) => {
                          const imageUrls =
                            getCategoryImageUrls(selectedCategory);
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
                          e.target.style.display = "none";
                          const iconElement =
                            e.target.parentElement.querySelector(
                              ".fallback-icon"
                            );
                          if (iconElement) {
                            iconElement.style.display = "inline-block";
                          }
                        }}
                      />
                    ) : null}
                    <ShoppingBagIcon
                      className="w-6 h-6 mr-3 fallback-icon text-[#249B73]"
                      style={{
                        display:
                          selectedCategory &&
                          getCategoryImageUrls(selectedCategory)[0]
                            ? "none"
                            : "inline-block",
                      }}
                    />
                    <div>
                      <h2 className="font-medium text-gray-800">
                        {selectedCategory
                          ? getCategoryName(selectedCategory)
                          : ""}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {subCategories.length} ta turkum
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCategorySearch(selectedCategory)}
                    className="px-3 py-1.5 bg-[#249B73] text-white text-sm rounded-lg hover:bg-[#1f8660] transition-colors"
                  >
                    Barchasini ko'rish
                  </button>
                </div>
              </div>

              {subCategoriesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="animate-spin w-6 h-6 text-[#249B73]" />
                </div>
              ) : filteredSubCategories.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <ShoppingBagIcon size={48} className="mx-auto" />
                  </div>
                  <p className="text-gray-500">
                    {searchQuery
                      ? "Qidiruv natijasi topilmadi"
                      : "Turkumlar topilmadi"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSubCategories.map((subCategory, index) => (
                    <button
                      key={subCategory._id || index}
                      onClick={() => handleSubCategoryClick(subCategory)}
                      className="w-full bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:border-[#249B73] hover:shadow-md transition-all duration-200 text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-800 group-hover:text-[#249B73] transition-colors">
                            {getSubCategoryName(subCategory)}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Mahsulotlarni ko'rish
                          </p>
                        </div>
                        <ChevronRight
                          size={18}
                          className="text-gray-400 group-hover:text-[#249B73] transition-colors"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {filteredCategories.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <ShoppingBagIcon size={48} className="mx-auto" />
                  </div>
                  <p className="text-gray-500">
                    {searchQuery
                      ? "Qidiruv natijasi topilmadi"
                      : "Kategoriyalar topilmadi"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredCategories.map((category, index) => {
                    const imageUrls = getCategoryImageUrls(category);
                    const imageUrl = imageUrls[0] || null;

                    return (
                      <button
                        key={category._id || index}
                        onClick={() => handleCategoryClick(category)}
                        className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:border-[#249B73] hover:shadow-md transition-all duration-200 text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                data-image-index="0"
                                alt={getCategoryName(category)}
                                loading="lazy"
                                decoding="async"
                                className="w-10 h-10 rounded-full mr-4 object-contain"
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
                                  e.target.style.display = "none";
                                  const iconElement =
                                    e.target.parentElement.querySelector(
                                      ".fallback-icon"
                                    );
                                  if (iconElement) {
                                    iconElement.style.display = "inline-block";
                                  }
                                }}
                              />
                            ) : null}
                            <ShoppingBagIcon
                              className="w-8 h-8 mr-4 fallback-icon text-[#249B73]"
                              style={{
                                display: imageUrl ? "none" : "inline-block",
                              }}
                            />
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-800 group-hover:text-[#249B73] transition-colors">
                                {getCategoryName(category)}
                              </h3>
                              <p className="text-sm text-gray-500 mt-1">
                                Turkumlarni ko'rish
                              </p>
                            </div>
                          </div>
                          <ChevronRight
                            size={18}
                            className="text-gray-400 group-hover:text-[#249B73] transition-colors"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Katalog;
