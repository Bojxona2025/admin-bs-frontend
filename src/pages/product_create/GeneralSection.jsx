import React, { useState, useEffect, useRef } from "react";
import { GripVertical, Plus, X, Languages } from "lucide-react";
import VariantForm from "./VariantForm";
import VariantList from "./VariantList";
import $api from "../../http/api";
import EventNumberSelect from "./EventNumberSelect";
import axios from "axios";

export default function GeneralSection({
  formData,
  setFormData,
  variants,
  setVariants,
  showVariantForm,
  setShowVariantForm,
  currentVariant,
  setCurrentVariant,
  handleCategoryChange,
  setSelectedImage,
  expanded,
  toggleSection,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  sectionId,
  draggedItem,
  dragOverItem,
}) {
  const [categories, setCategories] = useState([]);
  const [subCategoriesList, setSubCategoriesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [error, setError] = useState(null);
  const [translatingProduct, setTranslatingProduct] = useState(false);
  const [translatingDescription, setTranslatingDescription] = useState(false);
  const [eventFormData, setEventFormData] = useState({
    event_id: null,
    event_number: null,
    event_date: null,
    selectedProduct: null,
  });
  const [packages, setPackages] = useState([]);
  const [editingVariant, setEditingVariant] = useState(null);
  const dropdownRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [results, setResults] = useState([]);
  const [mxikError, setMxikError] = useState("");
  const [packagesLoading, setPackagesLoading] = useState(false);

  useEffect(() => {
    window.updateEventFormData = (data) => {
      setEventFormData((prev) => ({
        ...prev,
        ...data,
      }));
    };

    return () => {
      delete window.updateEventFormData;
    };
  }, []);

  useEffect(() => {
    if (
      formData.event_id !== eventFormData.event_id ||
      formData.event_number !== eventFormData.event_number
    ) {
      setEventFormData({
        event_id: formData.event_id,
        event_number: formData.event_number,
        event_date: formData.event_date,
        selectedProduct: formData.selectedProduct || null,
      });
    }
  }, [
    formData.event_id,
    formData.event_number,
    formData.event_date,
    formData.selectedProduct,
  ]);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data } = await $api.get("/categories/get/all", {
          params: {
            page: 1,
            limit: 20,
          },
        });

        if (Array.isArray(data)) {
          setCategories(data);
        } else if (data && Array.isArray(data.categories)) {
          setCategories(data.categories);
        } else if (data && Array.isArray(data.data)) {
          setCategories(data.data);
        } else {
          setCategories([]);
          console.warn(
            "Categories data is not in expected array format:",
            data
          );
        }
      } catch (err) {
        setError("Kategoriyalarni yuklashda xatolik yuz berdi");
        setCategories([]);
        console.error("Error fetching categories:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchSubCategories = async () => {
      if (!formData.category) {
        setSubCategoriesList([]);
        return;
      }

      setSubLoading(true);
      try {
        const { data } = await $api.get(
          `/sub/types/get/by/category/${formData.category}`
        );

        if (Array.isArray(data)) {
          setSubCategoriesList(data);
        } else if (data && Array.isArray(data.subcategories)) {
          setSubCategoriesList(data.subcategories);
        } else if (data && Array.isArray(data.data)) {
          setSubCategoriesList(data.data);
        } else {
          setSubCategoriesList([]);
        }
      } catch (err) {
        console.error("Error fetching subcategories:", err);
        setSubCategoriesList([]);
      } finally {
        setSubLoading(false);
      }
    };

    fetchSubCategories();
  }, [formData.category]);

  const handleCategoryChangeWithAPI = (e) => {
    const selectedCategoryId = e.target.value;

    const selectedCategory = categories.find(
      (cat) => (cat._id || cat.id) === selectedCategoryId
    );

    setFormData({
      ...formData,
      category: selectedCategoryId,
      subTypeId: "",
    });

    if (handleCategoryChange) {
      handleCategoryChange(e, selectedCategory);
    }
  };

  const handleSubCategoryChange = (e) => {
    const selectedSubCategoryId = e.target.value;

    setFormData({
      ...formData,
      subTypeId: selectedSubCategoryId,
    });
  };

  const handleEventFormDataUpdate = (newEventData) => {
    const updatedFormData = {
      ...formData,
      ...newEventData,
    };

    setFormData(updatedFormData);
    setEventFormData((prev) => ({
      ...prev,
      event_id: newEventData.event_id,
      event_number: newEventData.event_number,
      event_date: newEventData.event_date,
      selectedProduct: newEventData.selectedProduct || prev.selectedProduct,
    }));
  };

  const handleProductNameChange = (e) => {
    const value = e.target.value;
    setFormData({
      ...formData,
      productName: value,
      shortDescription: value,
      metaTitle: value,
    });
  };

  const handleDescriptionChange = (e) => {
    const value = e.target.value;
    setFormData({
      ...formData,
      description: value,
      metaDescription: value,
    });
  };

  const handleTranslateProduct = async () => {
    if (!formData.productName || !formData.productName.trim()) {
      alert("Iltimos, avval mahsulot nomini kiriting");
      return;
    }

    setTranslatingProduct(true);
    try {
      const { data } = await $api.post("/integration/translate", {
        name: formData.productName,
        description: formData.description || "",
        short_description: formData.shortDescription || "",
        meta_title: formData.metaTitle || "",
        meta_description: formData.metaDescription || "",
      });

      setFormData({
        ...formData,
        productName_ru: data.name_ru || "",
        productName_en: data.name_en || "",
        shortDescription_ru: data.short_description_ru || "",
        shortDescription_en: data.short_description_en || "",
        description_ru: data.description_ru || "",
        description_en: data.description_en || "",
        metaTitle_ru: data.meta_title_ru || "",
        metaTitle_en: data.meta_title_en || "",
        metaDescription_ru: data.meta_description_ru || "",
        metaDescription_en: data.meta_description_en || "",
        PackageCode: data.packageCode || formData.PackageCode || "",
        SPIC: data.SPIC || formData.SPIC || "",
      });
    } catch (err) {
      console.error("Translation error:", err);
      alert("Tarjima qilishda xatolik yuz berdi");
    } finally {
      setTranslatingProduct(false);
    }
  };

  const handleTranslateDescription = async () => {
    if (!formData.description || !formData.description.trim()) {
      alert("Iltimos, avval tavsifni kiriting");
      return;
    }

    setTranslatingDescription(true);
    try {
      const { data } = await $api.post("/integration/translate", {
        name: formData.productName || "",
        description: formData.description,
        short_description: formData.shortDescription || "",
        meta_title: formData.metaTitle || "",
        meta_description: formData.metaDescription || formData.description,
      });

      setFormData({
        ...formData,
        description_ru: data.description_ru || "",
        description_en: data.description_en || "",
        metaDescription_ru:
          data.meta_description_ru || data.description_ru || "",
        metaDescription_en:
          data.meta_description_en || data.description_en || "",
      });
    } catch (err) {
      console.error("Translation error:", err);
      alert("Tarjima qilishda xatolik yuz berdi");
    } finally {
      setTranslatingDescription(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function searchMxikCode(e) {
    const value = e.target.value;
    setFormData({ ...formData, SPIC: value });
    setMxikError("");

    if (!value || value.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(
        `https://tasnif.soliq.uz/api/cls-api/mxik/search-subposition`,
        {
          params: {
            search_text: value,
            page: 0,
            size: 15,
            lang: "uz_latn",
          },
        }
      );
      const content = response.data?.data?.content || [];
      setResults(content);
      setShowDropdown(true);
    } catch (error) {
      setResults([]);
      setShowDropdown(false);
      if (error?.response?.status === 403) {
        setMxikError("MXIK ma'lumotlari topilmadi");
      } else {
        setMxikError("MXIK qidirishda xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(mxik) {
    setFormData({ ...formData, SPIC: mxik.mxikCode });
    setShowDropdown(false);
    setResults([]);
  }

  useEffect(() => {
    if (!formData.SPIC) return;

    const fetchPackages = async () => {
      setPackagesLoading(true);
      setMxikError("");
      try {
        const res = await axios.get(
          `https://tasnif.soliq.uz/api/cls-api/mxik/get/by-mxik`,
          { params: { mxikCode: formData.SPIC, lang: "uz_latn" } }
        );

        if (res.data?.packages && Array.isArray(res.data.packages)) {
          // 🔍 parentCode null bo‘lganlarni chiqarib tashlash
          const filteredPackages = res.data.packages.filter(
            (pkg) => pkg.parentCode !== null
          );
          setPackages(filteredPackages);
        } else {
          setPackages([]);
        }
      } catch (err) {
        setPackages([]);
        if (err?.response?.status === 403) {
          setMxikError("MXIK ma'lumotlari topilmadi");
        } else {
          setMxikError("MXIK servisidan ma'lumot olib bo'lmadi");
        }
      } finally {
        setPackagesLoading(false);
      }
    };

    fetchPackages();
  }, [formData.SPIC]);

  const handleSelectChange = (e) => {
    const selectedCode = e.target.value;
    setFormData({ ...formData, PackageCode: selectedCode });
  };

  return (
    <div
      className={`bg-[#f3f1f1] mb-2 transition-all duration-200 ${
        draggedItem === sectionId ? "opacity-50 scale-95" : ""
      } ${
        dragOverItem === sectionId ? "ring-2 ring-green-400 bg-green-50" : ""
      }`}
      draggable
      onDragStart={(e) => onDragStart(e, sectionId)}
      onDragOver={(e) => onDragOver(e, sectionId)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, sectionId)}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0 px-2 py-3 cursor-grab active:cursor-grabbing">
          <GripVertical
            size={16}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          />
        </div>
        <button onClick={toggleSection} className="flex-1 px-2 py-3 text-left">
          <div className="flex justify-between items-center cursor-pointer">
            <span className="text-sm font-medium">Umumiy malumotlar</span>
            <div className="transition-transform duration-200">
              <span
                className={`text-gray-600 inline-block transition-transform duration-300 ${
                  expanded ? "rotate-0" : "-rotate-90"
                }`}
              >
                ▼
              </span>
            </div>
          </div>
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              MXIK
            </label>
            <div className="flex gap-2">
              <span className="text-xs text-gray-500 w-12 mt-1">
                MXIK kodi:
              </span>
              <input
                type="text"
                className="w-full border-2 border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-green-500"
                value={formData.SPIC || ""}
                onChange={(e) => searchMxikCode(e)}
                placeholder="Mahsulot mxik kodi"
              />
            </div>
            {showDropdown && results.length > 0 && (
              <ul className="absolute z-10 w- max-h-[400px] overflow-y-auto bg-gray-50 border border-gray-300 mt-1 rounded-lg shadow-lg text-xs p-2">
                {loading ? (
                  <li className="p-2 text-gray-500">Yuklanmoqda...</li>
                ) : (
                  results.map((item, index) => (
                    <li
                      key={index}
                      onClick={() => handleSelect(item)}
                      className="relative mb-2 bg-green-50 hover:bg-green-100 cursor-pointer border border-green-200 rounded-lg p-3 transition-all duration-200"
                    >
                      {/* MXIK kodi */}
                      <div className="font-semibold text-[13px] text-green-800 mb-1 flex items-center justify-between">
                        <span>{item.mxikCode}</span>
                        <span className="text-[11px] bg-green-200 text-green-700 px-2 py-[1px] rounded-md">
                          {item.groupCode}
                        </span>
                      </div>

                      {/* Asosiy nom */}
                      <div className="text-[13px] font-bold text-gray-900 mb-1">
                        {item.mxikName}
                      </div>

                      {/* Detallar */}
                      <div className="text-gray-700 text-[11px] leading-4 space-y-[2px] border-t border-green-200 pt-1 mt-1">
                        <div>
                          <span className="font-semibold text-gray-600">
                            Guruh:
                          </span>{" "}
                          {item.groupName}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">
                            Sinf:
                          </span>{" "}
                          {item.className}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">
                            Pozitsiya:
                          </span>{" "}
                          {item.positionName}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">
                            Subpozitsiya:
                          </span>{" "}
                          {item.subPositionName}
                        </div>
                      </div>
                    </li>
                  ))
                )}

                {!loading && (
                  <li className="text-center text-gray-500 text-[11px] mt-1">
                    Ro‘yxat tugadi
                  </li>
                )}
              </ul>
            )}
            {mxikError && (
              <p className="text-xs text-red-600 mt-1">{mxikError}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              O‘lchov birligining kodi
            </label>

            {/* Agar SPIC tanlanmagan bo‘lsa */}
            {!formData.SPIC && (
              <div className="flex gap-2">
                <span className="text-xs text-gray-500 w-12 mt-1">
                  Birlik kodi:
                </span>
                <input
                  type="text"
                  className="w-full border-2 border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-green-500"
                  value={formData.PackageCode || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, PackageCode: e.target.value })
                  }
                  placeholder="Mahsulot o‘lchov birligi kodi"
                />
              </div>
            )}

            {/* Agar SPIC mavjud bo‘lsa */}
            {formData.SPIC && (
              <div className="mt-2">
                {packagesLoading ? (
                  <p className="text-xs text-gray-500">Yuklanmoqda...</p>
                ) : packages.length > 0 ? (
                  <select
                    className="w-full border-2 border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-green-500"
                    onChange={handleSelectChange}
                    value={formData.PackageCode || ""}
                  >
                    <option value="">Paketni tanlang</option>
                    {packages.map((pkg, i) => (
                      <option key={i} value={pkg.parentCode}>
                        {pkg.name} ({pkg.containerName})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-gray-500">
                    Paketlar topilmadi yoki SPIC noto‘g‘ri.
                  </p>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-700">
                Mahsulot nomi <span className="text-red-800">*</span>
              </label>
              <button
                onClick={handleTranslateProduct}
                disabled={translatingProduct || !formData.productName}
                className="flex items-center gap-1 cursor-pointer bg-[#249B73] hover:bg-[#249B73] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-2 py-1 text-xs transition-colors"
              >
                <Languages size={12} />
                {translatingProduct ? "Tarjima qilinmoqda..." : "Tarjima"}
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-12">O'zb:</span>
                <input
                  type="text"
                  className="flex-1 border-2 border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-green-500"
                  value={formData.productName || ""}
                  onChange={handleProductNameChange}
                  placeholder="Mahsulot nomi (O'zbekcha) *"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-12">Рус:</span>
                <input
                  type="text"
                  className="flex-1 border-2 border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-green-500"
                  value={formData.productName_ru || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, productName_ru: e.target.value })
                  }
                  placeholder="Название продукта (Русский)"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-12">Eng:</span>
                <input
                  type="text"
                  className="flex-1 border-2 border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-green-500"
                  value={formData.productName_en || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, productName_en: e.target.value })
                  }
                  placeholder="Product name (English)"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Qisqa Tavsifi
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="text-xs text-gray-500 w-12 mt-1">O'zb:</span>
                <textarea
                  rows="2"
                  className="flex-1 border-2 bg-white border-gray-300 px-2 py-1 text-xs outline-none focus:border-green-500"
                  value={formData.shortDescription || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shortDescription: e.target.value,
                    })
                  }
                  placeholder="Qisqa tavsif (O'zbekcha)"
                />
              </div>
              <div className="flex gap-2">
                <span className="text-xs text-gray-500 w-12 mt-1">Рус:</span>
                <textarea
                  rows="2"
                  className="flex-1 border-2 bg-white border-gray-300 px-2 py-1 text-xs outline-none focus:border-green-500"
                  value={formData.shortDescription_ru || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shortDescription_ru: e.target.value,
                    })
                  }
                  placeholder="Краткое описание (Русский)"
                />
              </div>
              <div className="flex gap-2">
                <span className="text-xs text-gray-500 w-12 mt-1">Eng:</span>
                <textarea
                  rows="2"
                  className="flex-1 border-2 bg-white border-gray-300 px-2 py-1 text-xs outline-none focus:border-green-500"
                  value={formData.shortDescription_en || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shortDescription_en: e.target.value,
                    })
                  }
                  placeholder="Short description (English)"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-700">
                Tavsifi
              </label>
              <button
                onClick={handleTranslateDescription}
                disabled={translatingDescription || !formData.description}
                className="flex items-center gap-1 cursor-pointer bg-[#249B73] hover:bg-[#249B73] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-2 py-1 text-xs transition-colors"
              >
                <Languages size={12} />
                {translatingDescription ? "Tarjima qilinmoqda..." : "Tarjima"}
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="text-xs text-gray-500 w-12 mt-1">O'zb:</span>
                <textarea
                  rows="4"
                  className="flex-1 border-2 border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-green-500"
                  value={formData.description || ""}
                  onChange={handleDescriptionChange}
                  placeholder="Batafsil tavsif (O'zbekcha)"
                />
              </div>
              <div className="flex gap-2">
                <span className="text-xs text-gray-500 w-12 mt-1">Рус:</span>
                <textarea
                  rows="4"
                  className="flex-1 border-2 border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-green-500"
                  value={formData.description_ru || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description_ru: e.target.value })
                  }
                  placeholder="Подробное описание (Русский)"
                />
              </div>
              <div className="flex gap-2">
                <span className="text-xs text-gray-500 w-12 mt-1">Eng:</span>
                <textarea
                  rows="4"
                  className="flex-1 border-2 border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-green-500"
                  value={formData.description_en || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description_en: e.target.value })
                  }
                  placeholder="Detailed description (English)"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Brend
            </label>
            <div className="flex gap-2">
              <span className="text-xs text-gray-500 w-12 mt-1">Brend:</span>
              <input
                type="text"
                className="w-full border-2 border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-green-500"
                value={formData.brand || ""}
                onChange={(e) =>
                  setFormData({ ...formData, brand: e.target.value })
                }
                placeholder="Mahsulot brendi"
              />
            </div>
          </div>
          <EventNumberSelect
            formData={formData}
            setFormData={handleEventFormDataUpdate}
          />

          <div className="flex">
            <label className="block text-xs text-gray-600 mb-1 w-35">
              Kategoriya <span className="text-red-800">*</span>
            </label>
            <div className="relative w-[100%] bg-white">
              <select
                className="w-full border-2 outline-none focus:border-green-500 border-gray-300 px-2 py-1 text-xs appearance-none pr-6 select-none"
                value={formData.category || ""}
                onChange={handleCategoryChangeWithAPI}
                disabled={loading}
              >
                <option value="">
                  {loading
                    ? "Kategoriyalar yuklanmoqda..."
                    : "Kategoriyani tanlang"}
                </option>
                {Array.isArray(categories) &&
                  categories.map((category) => (
                    <option
                      key={category._id || category.id}
                      value={category._id || category.id}
                    >
                      {category.name}
                    </option>
                  ))}
              </select>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                ▼
              </div>
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 p-2 border border-red-200">
              {error}
            </div>
          )}

          <div className="flex">
            <label className="block text-xs text-gray-600 mb-1 w-35">
              Subkategoriya *
            </label>
            <div className="relative w-[100%] bg-white">
              <select
                className="w-full border-2 outline-none focus:border-green-500 border-gray-300 px-2 py-1 text-xs appearance-none pr-6 select-none"
                value={formData.subTypeId || ""}
                onChange={handleSubCategoryChange}
                disabled={!formData.category || subLoading}
              >
                <option value="">
                  {!formData.category
                    ? "Avval kategoriyani tanlang"
                    : subLoading
                    ? "Subkategoriyalar yuklanmoqda..."
                    : "Subkategoriyani tanlang"}
                </option>
                {Array.isArray(subCategoriesList) &&
                  subCategoriesList.map((subCategory) => (
                    <option
                      key={subCategory._id || subCategory.id}
                      value={subCategory._id || subCategory.id}
                    >
                      {subCategory.name}
                    </option>
                  ))}
              </select>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                ▼
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Meta sarlavha
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-12">O'zb:</span>
                <input
                  type="text"
                  className="flex-1 border-2 border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-green-500"
                  value={formData.metaTitle || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, metaTitle: e.target.value })
                  }
                  placeholder="Meta sarlavha (O'zbekcha)"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-12">Рус:</span>
                <input
                  type="text"
                  className="flex-1 border-2 border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-green-500"
                  value={formData.metaTitle_ru || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, metaTitle_ru: e.target.value })
                  }
                  placeholder="Мета заголовок (Русский)"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-12">Eng:</span>
                <input
                  type="text"
                  className="flex-1 border-2 border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-green-500"
                  value={formData.metaTitle_en || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, metaTitle_en: e.target.value })
                  }
                  placeholder="Meta title (English)"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Meta Tavsifi
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="text-xs text-gray-500 w-12 mt-1">O'zb:</span>
                <textarea
                  rows="3"
                  className="flex-1 border-2 border-gray-300 px-2 py-1 text-xs outline-none bg-white focus:border-green-500"
                  value={formData.metaDescription || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metaDescription: e.target.value,
                    })
                  }
                  placeholder="Meta tavsif (O'zbekcha)"
                />
              </div>
              <div className="flex gap-2">
                <span className="text-xs text-gray-500 w-12 mt-1">Рус:</span>
                <textarea
                  rows="3"
                  className="flex-1 border-2 border-gray-300 px-2 py-1 text-xs outline-none bg-white focus:border-green-500"
                  value={formData.metaDescription_ru || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metaDescription_ru: e.target.value,
                    })
                  }
                  placeholder="Мета описание (Русский)"
                />
              </div>
              <div className="flex gap-2">
                <span className="text-xs text-gray-500 w-12 mt-1">Eng:</span>
                <textarea
                  rows="3"
                  className="flex-1 border-2 border-gray-300 px-2 py-1 text-xs outline-none bg-white focus:border-green-500"
                  value={formData.metaDescription_en || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      metaDescription_en: e.target.value,
                    })
                  }
                  placeholder="Meta description (English)"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-10">
            <label className="block text-xs text-gray-600 mb-1">Valyuta</label>
            <div className="flex w-[100%]">
              <select
                className="flex-1 border-1 bg-white border-gray-300 outline-none px-2 py-1 text-xs"
                value={formData.currency || "UZS"}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
              >
                <option value="UZS">UZS</option>
                <option value="USD">USD</option>
                <option value="RUB">RUB</option>
              </select>
            </div>
          </div>

          <div className="bg-gray-50 p-3 border-2 border-gray-300">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-gray-700">
                Mahsulot Variantlari
              </label>
              <button
                onClick={() => setShowVariantForm(true)}
                className="flex items-center gap-1 bg-[#2db789] hover:bg-[#0dd255] cursor-pointer text-white px-2 py-1 text-xs transition-colors"
              >
                <Plus size={12} />
                Variant qo'shish
              </button>
            </div>

            <VariantList
              variants={variants}
              setVariants={setVariants}
              setSelectedImage={setSelectedImage}
              setCurrentVariant={setCurrentVariant}
              setShowVariantForm={setShowVariantForm}
              setEditingVariant={setEditingVariant}
              editingVariant={editingVariant}
            />

            {showVariantForm && (
              <VariantForm
                currentVariant={currentVariant}
                setCurrentVariant={setCurrentVariant}
                setVariants={setVariants}
                setShowVariantForm={setShowVariantForm}
                setSelectedImage={setSelectedImage}
                eventFormData={eventFormData}
                editingVariant={editingVariant}
                setEditingVariant={setEditingVariant}
                variants={variants}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
