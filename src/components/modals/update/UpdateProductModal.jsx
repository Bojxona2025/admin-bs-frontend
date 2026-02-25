import { useEffect, useRef, useState } from "react";
import $api from "../../../http/api";
import productsApi from "../../../http/products";
import { X, Upload, ImageIcon } from "lucide-react";
import GeneralSection from "../../../pages/product_create/GeneralSection";

export default function UpdateProductModal({
  isOpen,
  onClose,
  productId,
  onUpdate,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Categories va subcategories uchun state'lar
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);

  const [formData, setFormData] = useState({
    productName: "",
    productName_ru: "",
    productName_en: "",
    shortDescription: "",
    shortDescription_ru: "",
    shortDescription_en: "",
    description: "",
    description_ru: "",
    description_en: "",
    category: "",
    subTypeId: "",
    metaTitle: "",
    metaTitle_ru: "",
    metaTitle_en: "",
    metaDescription: "",
    metaDescription_ru: "",
    metaDescription_en: "",
    currency: "UZS",
  });
  const [variants, setVariants] = useState([]);
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [currentVariant, setCurrentVariant] = useState({
    name: "",
    price: "",
    code: "",
    image: null,
    color: "",
    size: "",
    material: "",
    unit: "dona",
    discount: "",
    stockQuantity: "",
    quantity: "1",
    saleStatus: "active",
    images: [],
    imageFile: null,
  });

  // Animation control
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setIsVisible(true);
      setTimeout(() => {
        setIsAnimating(true);
      }, 10);
    } else {
      document.body.style.overflow = "auto";
      setIsAnimating(false);
      setTimeout(() => {
        setIsVisible(false);
      }, 300);
    }
  }, [isOpen]);

  // Categories va subcategories yuklanishi
  const fetchCategoriesAndSubCategories = async () => {
    try {
      const categoriesResponse = await $api.get("/categories/get/all", {
        params: {
          page: 1,
          limit: 20,
        },
      });
      setCategories(categoriesResponse.data || []);

      const subCategoriesResponse = await $api.get(
        "/sub/types/get/by/category/{id}"
      );
      setSubCategories(subCategoriesResponse.data || []);
    } catch (error) {
      console.error("Categories va subcategories yuklanishida xatolik:", error);
    }
  };

  // Mahsulot ma'lumotlarini olish
  const fetchProductData = async () => {
    try {
      setIsLoading(true);
      const response = await productsApi.getById(productId);
      const product = response.data;

      console.log("Olingan mahsulot ma'lumotlari:", product); // Debug uchun

      // formData ni to'ldirish
      setFormData({
        productName: product.name || "",
        productName_ru: product.name_ru || "",
        productName_en: product.name_en || "",
        shortDescription: product.shortDescription || "",
        shortDescription_ru: product.shortDescription_ru || "",
        shortDescription_en: product.shortDescription_en || "",
        description: product.description || "",
        description_ru: product.description_ru || "",
        description_en: product.description_en || "",
        category: product.category?._id || product.category || "",
        subTypeId: product.subTypeId?._id || product.subTypeId || "",
        metaTitle: product.metaTitle || "",
        metaTitle_ru: product.metaTitle_ru || "",
        metaTitle_en: product.metaTitle_en || "",
        metaDescription: product.metaDescription || "",
        metaDescription_ru: product.metaDescription_ru || "",
        metaDescription_en: product.metaDescription_en || "",
        currency: product.currency || "UZS",
      });

      // Asosiy rasmni images state'iga qo'shish
      if (product.mainImage) {
        setImages([
          {
            id: Date.now(),
            url: product.mainImage.startsWith("http")
              ? product.mainImage
              : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${
                  product.mainImage
                }`,
            file: null,
          },
        ]);
      }

      // Variantlarni to'ldirish
      if (product.variants && Array.isArray(product.variants)) {
        const processedVariants = product.variants.map((variant) => {
          // Variant rasmlarini to'g'ri formatda olish
          let variantImages = [];
          if (variant.images && Array.isArray(variant.images)) {
            variantImages = variant.images.map((img, index) => ({
              id: `variant_${variant._id}_${index}`,
              url: img.startsWith("http")
                ? img
                : `${
                    process.env.REACT_APP_API_URL || "http://localhost:5000"
                  }${img}`,
              file: null,
            }));
          }

          return {
            _id: variant._id,
            name: variant.name || variant.color || "",
            color: variant.color || "",
            unit: variant.unit || "dona",
            price: variant.price || 0,
            discount: variant.discount || 0,
            stockQuantity: variant.stockQuantity || 0,
            quantity: variant.quantity || 1,
            saleStatus: variant.saleStatus || "active",
            size: variant.size || "",
            material: variant.material || "",
            image: variant.image
              ? variant.image.startsWith("http")
                ? variant.image
                : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${
                    variant.image
                  }`
              : null,
            images: variantImages,
            imageFile: null,
          };
        });

        setVariants(processedVariants);
        console.log("Processed variants:", processedVariants); // Debug uchun
      }
    } catch (error) {
      console.error("Mahsulot ma'lumotlarini olishda xatolik:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Category o'zgarganda subcategories ni filtrlash
  const handleCategoryChange = (e) => {
    const selectedCategoryId = e.target.value;
    setFormData({
      ...formData,
      category: selectedCategoryId,
      subTypeId: "", // Kategoriya o'zgarganda subkategoriyani reset qilish
    });
  };

  // Modal ochilganda ma'lumotlarni olish
  useEffect(() => {
    if (isOpen && productId) {
      fetchCategoriesAndSubCategories();
      fetchProductData();
    }
  }, [isOpen, productId]);

  // ESC tugmasi bilan yopish
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [isOpen, onClose]);

  // Validatsiya funksiyasi
  const validateForm = () => {
    const errors = [];
    if (!formData.productName.trim()) errors.push("Mahsulot nomi majburiy");
    if (!formData.category) errors.push("Kategoriya majburiy");
    if (!formData.subTypeId) errors.push("Subkategoriya majburiy");
    if (images.length === 0) errors.push("Kamida bitta asosiy rasm majburiy");
    if (variants.length === 0) errors.push("Kamida bitta variant majburiy");

    variants.forEach((variant, index) => {
      if (!variant.color.trim()) {
        errors.push(`Variant ${index + 1}: Rang majburiy`);
      }
      if (!variant.price || variant.price <= 0) {
        errors.push(
          `Variant ${index + 1}: Narx majburiy va 0 dan katta bo'lishi kerak`
        );
      }
      if (!variant.images || variant.images.length === 0) {
        errors.push(`Variant ${index + 1}: Kamida bitta rasm majburiy`);
      }
    });

    return errors;
  };

  // Mahsulotni yangilash
  const handleUpdate = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      console.log(
        "Quyidagi xatolar aniqlandi:\n" + validationErrors.join("\n")
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const formDataToSend = new FormData();

      // Asosiy ma'lumotlarni qo'shish
      const fieldsToAppend = [
        { key: "name", value: formData.productName },
        { key: "name_ru", value: formData.productName_ru },
        { key: "name_en", value: formData.productName_en },
        { key: "shortDescription", value: formData.shortDescription },
        { key: "shortDescription_ru", value: formData.shortDescription_ru },
        { key: "shortDescription_en", value: formData.shortDescription_en },
        { key: "description", value: formData.description },
        { key: "description_ru", value: formData.description_ru },
        { key: "description_en", value: formData.description_en },
        { key: "category", value: formData.category },
        { key: "subTypeId", value: formData.subTypeId },
        { key: "metaTitle", value: formData.metaTitle },
        { key: "metaTitle_ru", value: formData.metaTitle_ru },
        { key: "metaTitle_en", value: formData.metaTitle_en },
        { key: "metaDescription", value: formData.metaDescription },
        { key: "metaDescription_ru", value: formData.metaDescription_ru },
        { key: "metaDescription_en", value: formData.metaDescription_en },
        { key: "currency", value: formData.currency },
      ];

      fieldsToAppend.forEach(({ key, value }) => {
        if (value && value.toString().trim() !== "") {
          formDataToSend.append(key, value);
        }
      });

      if (variants.length > 0) {
        const variantsForBackend = variants.map((variant, index) => ({
          _id: variant._id || undefined,
          color: variant.color || "",
          unit: variant.unit || "dona",
          price: parseFloat(variant.price) || 0,
          discount: parseFloat(variant.discount) || 0,
          stockQuantity: parseInt(variant.stockQuantity) || 0,
          quantity: parseInt(variant.quantity) || 1,
          size: variant.size || "",
          material: variant.material || "",
          saleStatus: variant.saleStatus || "active",
          imageCount: variant.images?.length || 0,
          hasMainImage: variant.imageFile ? true : false,
        }));

        formDataToSend.append("variants", JSON.stringify(variantsForBackend));
      }

      // Asosiy rasm
      if (images.length > 0 && images[0].file) {
        formDataToSend.append("mainImage", images[0].file);
        formDataToSend.append("metaImage", images[0].file);
      }

      // Variant rasmlari
      variants.forEach((variant, index) => {
        if (variant.imageFile instanceof File) {
          formDataToSend.append(`variant_${index}_mainImg`, variant.imageFile);
        }
        if (variant.images && Array.isArray(variant.images)) {
          variant.images.forEach((image, imgIndex) => {
            if (image.file instanceof File) {
              formDataToSend.append(`variant_${index}_images`, image.file);
            }
          });
        }
      });

      const response = await productsApi.update(productId, formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Mahsulot muvaffaqiyatli yangilandi:", response.data);
      onUpdate(response.data);
      onClose();
    } catch (error) {
      console.error("Mahsulotni yangilashda xatolik:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Asosiy rasm yuklash
  const handleMainImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImages([{ id: Date.now(), url: event.target.result, file }]);
      };
      reader.readAsDataURL(file);
    }
  };

  // Kategoriya asosida subcategories ni filtrlash
  const filteredSubCategories = subCategories.filter(
    (subCat) =>
      subCat.category === formData.category ||
      subCat.categoryId === formData.category
  );

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 ease-in-out ${
          isAnimating ? "opacity-30" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div className="relative z-50 flex h-full items-center justify-end ">
        <div
          className={`w-3/5 h-screen bg-white shadow-2xl transform transition-all duration-300 ease-in-out ${
            isAnimating
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0"
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Mahsulotni tahrirlash
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 cursor-pointer hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto ">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Ma'lumotlar yuklanmoqda...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Asosiy rasm */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Asosiy rasm <span className="text-red-800">*</span>
                    </label>
                    <div className="flex items-center gap-4">
                      {images.length > 0 && (
                        <div className="relative">
                          <img
                            src={images[0].url}
                            alt="Asosiy rasm"
                            className="w-20 h-20 rounded-lg object-cover border border-gray-200 cursor-pointer"
                            onClick={() => setSelectedImage(images[0].url)}
                          />
                          <button
                            onClick={() => setImages([])}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                      <label className="cursor-pointer bg-[#165275] text-white px-3 py-2 flex items-center gap-2 hover:bg-[#165275d4] transition-colors">
                        <Upload size={16} />
                        {images.length > 0
                          ? "Rasmni o'zgartirish"
                          : "Rasm yuklash"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleMainImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <GeneralSection
                    formData={formData}
                    setFormData={setFormData}
                    variants={variants}
                    setVariants={setVariants}
                    showVariantForm={showVariantForm}
                    setShowVariantForm={setShowVariantForm}
                    currentVariant={currentVariant}
                    setCurrentVariant={setCurrentVariant}
                    categories={categories}
                    subCategories={filteredSubCategories}
                    handleCategoryChange={handleCategoryChange}
                    selectedImage={selectedImage}
                    setSelectedImage={setSelectedImage}
                    expanded={true}
                    toggleSection={() => {}}
                    onDragStart={() => {}}
                    onDragOver={() => {}}
                    onDragLeave={() => {}}
                    onDrop={() => {}}
                    onDragEnd={() => {}}
                    sectionId="general"
                    draggedItem={null}
                    dragOverItem={null}
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm cursor-pointer font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  disabled={isSubmitting}
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={isSubmitting || isLoading}
                  className="flex items-center px-4 cursor-pointer py-2 text-sm font-medium text-white bg-[#165275] border border-transparent rounded hover:bg-[#165275d4] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saqlanmoqda...
                    </>
                  ) : (
                    "Saqlash"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
