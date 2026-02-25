import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import ImageSection from "./ImageSection";
import GeneralSection from "./GeneralSection";
import VariantList from "./VariantList";
import VariantForm from "./VariantForm";
import productsApi from "../../http/products";
import CatalogPreview from "./CatalogPrevew";
import { ToastContainer } from "./Toast";
import ConfirmExitModal from "./ConfirmExitModal";
import { usePrompt } from "../../hooks/usePrompt";

export default function CorporateForm() {
  const navigate = useNavigate();
  const [showExitModal, setShowExitModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const [expandedSections, setExpandedSections] = useState({
    images: true,
    general: true,
    features: true,
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    brand: "",
    bs_product_id: "",
    event_id: "",
    event_number: "",
    metaTitle: "",
    metaTitle_ru: "",
    metaTitle_en: "",
    metaDescription: "",
    metaDescription_ru: "",
    metaDescription_en: "",
    category: "",
    subTypeId: "",
    currency: "UZS",
    packaging: "Štučná",
    accountingType: "Без специализированного учета",
    SPIC: "",
    PackageCode: "",
  });

  const [variants, setVariants] = useState([]);
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
    length: "",
    lengthUnit: "sm",
    width: "",
    widthUnit: "sm",
    height: "",
    heightUnit: "sm",
    weight: "",
    weightUnit: "kg",
  });

  const [subCategories] = useState([
    { id: "1", name: "Smartphones", category: "electronics" },
    { id: "2", name: "Laptops", category: "electronics" },
    { id: "3", name: "Tablets", category: "electronics" },
    { id: "4", name: "Shirts", category: "clothing" },
    { id: "5", name: "Pants", category: "clothing" },
    { id: "6", name: "Furniture", category: "home" },
    { id: "7", name: "Decor", category: "home" },
  ]);

  const defaultSectionOrder = ["images", "general", "features"];
  const [sectionOrder, setSectionOrder] = useState(defaultSectionOrder);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [toasts, setToasts] = useState([]);

  const checkHasUnsavedChanges = useCallback(() => {
    const hasFormData = Object.values(formData).some(
      (value) => value && typeof value === "string" && value.trim() !== ""
    );
    const hasImages = images.length > 0;
    const hasVariants = variants.length > 0;

    return hasFormData || hasImages || hasVariants;
  }, [formData, images, variants]);

  useEffect(() => {
    setHasUnsavedChanges(checkHasUnsavedChanges());
  }, [formData, images, variants, checkHasUnsavedChanges]);

  usePrompt(hasUnsavedChanges, (location, proceed) => {
    console.log("Navigation intercepted:", location);
    setShowExitModal(true);
    setPendingNavigation(() => proceed);
  });

  useEffect(() => {
    const handlePopState = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        setShowExitModal(true);
        setPendingNavigation("back");
        window.history.pushState(null, "", window.location.pathname);
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.history.pushState(null, "", window.location.pathname);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasUnsavedChanges]);

  const handleConfirmExit = () => {
    console.log("Confirm bosildi!");
    console.log("pendingNavigation:", pendingNavigation);

    setHasUnsavedChanges(false);
    setShowExitModal(false);

    setTimeout(() => {
      if (pendingNavigation === "back") {
        console.log("navigate(-1) back dan kelmoqda");
        navigate(-1);
      } else if (pendingNavigation === -1) {
        console.log("navigate('/products') close click dan kelmoqda");
        navigate("/products");
      } else if (typeof pendingNavigation === "function") {
        console.log("proceed function dan kelmoqda");
        pendingNavigation();
      } else if (pendingNavigation && typeof pendingNavigation === "string") {
        console.log("navigate:", pendingNavigation);
        navigate(pendingNavigation);
      } else {
        console.log("Default: products sahifasiga o'tish");
        navigate("/products");
      }

      setPendingNavigation(null);
    }, 100);
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
    setPendingNavigation(null);
  };

  const handleCloseClick = (e) => {
    e.preventDefault();

    if (hasUnsavedChanges) {
      setShowExitModal(true);
      setPendingNavigation(-1);
    } else {
      navigate(-1);
    }
  };

  const createProduct = async (productData) => {
    try {
      const formDataToSend = new FormData();
      const unitMap = {
        dona: "Dona",
        tonna: "Tonna",
        kg: "Kilogram",
        gr: "Gramm",
        m: "Metr",
        m2: "Kvadrat metr",
        ml: "Millilitr",
        sm: "Santimetr",
        l: "Litr",
        set: "To'plam",
        pair: "Juft",
        roll: "O'ram",
        bundle: "Tugun / Bog'lama",
        box: "Quti",
        pack: "Paket",
      };

      const fieldsToAppend = [
        { key: "name", value: productData.name },
        { key: "name_ru", value: productData.name_ru },
        { key: "name_en", value: productData.name_en },
        { key: "shortDescription", value: productData.shortDescription },
        { key: "shortDescription_ru", value: productData.shortDescription_ru },
        { key: "shortDescription_en", value: productData.shortDescription_en },
        { key: "description", value: productData.description },
        { key: "description_ru", value: productData.description_ru },
        { key: "description_en", value: productData.description_en },
        { key: "brand", value: productData.brand },
        { key: "bs_product_id", value: productData.bs_product_id },
        { key: "event_id", value: productData.event_id },
        { key: "event_number", value: productData.event_number },
        { key: "category", value: productData.category },
        { key: "subTypeId", value: productData.subTypeId },
        { key: "metaTitle", value: productData.metaTitle },
        { key: "metaTitle_ru", value: productData.metaTitle_ru },
        { key: "metaTitle_en", value: productData.metaTitle_en },
        { key: "metaDescription", value: productData.metaDescription },
        { key: "metaDescription_ru", value: productData.metaDescription_ru },
        { key: "metaDescription_en", value: productData.metaDescription_en },
        { key: "SPIC", value: productData.SPIC },
        { key: "PackageCode", value: productData.PackageCode },
      ];

      fieldsToAppend.forEach(({ key, value }) => {
        if (value && value.trim && value.trim() !== "") {
          formDataToSend.append(key, value);
        } else if (value && typeof value !== "string") {
          formDataToSend.append(key, value);
        }
      });

      if (productData.variants && productData.variants.length > 0) {
        const variantsForBackend = productData.variants.map(
          (variant, index) => ({
            color: variant.color || "",
            unit: unitMap[variant.unit] || variant.unit || "Dona",
            price: parseFloat(variant.price) || 0,
            discount: parseFloat(variant.discount) || 0,
            stockQuantity: parseInt(variant.stockQuantity) || 0,
            quantity: parseInt(variant.quantity) || 1,
            size: variant.size || "",
            material: variant.material || "",
            saleStatus: variant.saleStatus || "active",
            imageCount: variant.images?.length || 0,
            hasMainImage: variant.imageFile ? true : false,

            length: parseFloat(variant.length) || 0,
            lengthUnit: variant.lengthUnit || "sm",
            width: parseFloat(variant.width) || 0,
            widthUnit: variant.widthUnit || "sm",
            height: parseFloat(variant.height) || 0,
            heightUnit: variant.heightUnit || "sm",
            weight: parseFloat(variant.weight) || 0,
            weightUnit: variant.weightUnit || "kg",

            memory: variant.memory || "",
            processor: variant.processor || "",

            event_number:
              variant.eventData?.event_number ||
              variant.eventData?.selectedProduct?.event_number ||
              productData.event_number,
            event_date:
              variant.eventData?.event_date ||
              variant.eventData?.selectedProduct?.event_date ||
              productData.event_date,
            mib_dalolatnoma:
              variant.eventData?.selectedProduct?.mib_dalolatnoma ||
              productData.mib_dalolatnoma ||
              "",

            bs_product_id:
              variant.eventData?.selectedProduct?.bs_product_id ||
              variant.eventData?.selectedProduct?.id ||
              variant.bs_product_id ||
              "",
          })
        );

        formDataToSend.append("variants", JSON.stringify(variantsForBackend));
        console.log("Variants being sent:", variantsForBackend);
      }

      if (productData.mainImage instanceof File) {
        formDataToSend.append("mainImage", productData.mainImage);
        console.log("Main product image added:", productData.mainImage.name);
      }

      if (productData.mainImage instanceof File) {
        formDataToSend.append("metaImage", productData.mainImage);
        console.log(
          "Meta image added (same as main):",
          productData.mainImage.name
        );
      }

      if (productData.variants && productData.variants.length > 0) {
        productData.variants.forEach((variant, variantIndex) => {
          if (variant.imageFile instanceof File) {
            formDataToSend.append(
              `variant_${variantIndex}_mainImg`,
              variant.imageFile
            );
            console.log(
              `Variant ${variantIndex} main image added:`,
              variant.imageFile.name
            );
          }

          if (variant.images && Array.isArray(variant.images)) {
            variant.images.forEach((image, imageIndex) => {
              if (image.file instanceof File) {
                formDataToSend.append(
                  `variant_${variantIndex}_images`,
                  image.file
                );
                console.log(
                  `Variant ${variantIndex} additional image ${imageIndex} added:`,
                  image.file.name
                );
              }
            });
          }
        });
      }

      console.log("=== FormData Contents ===");
      for (let [key, value] of formDataToSend.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File - ${value.name} (${value.size} bytes)`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }

      const response = await productsApi.create(formDataToSend, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload Progress: ${percentCompleted}%`);
        },
      });

      return response.data;
    } catch (error) {
      console.error("Mahsulot yaratishda xatolik:", error);

      if (error.response) {
        const errorMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          "Server xatosi";
        throw new Error(`API Error: ${errorMessage}`);
      } else if (error.request) {
        throw new Error("Serverga ulanishda xatolik");
      } else {
        throw new Error(error.message || "Noma'lum xatolik");
      }
    }
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.productName.trim())
      errors.push("Mahsulot nomi (O'zbekcha) majburiy");
    if (!formData.category) errors.push("Kategoriya majburiy");
    if (!formData.subTypeId) errors.push("Subkategoriya majburiy");
    if (images.length === 0) errors.push("Kamida bitta asosiy rasm majburiy");

    if (variants.length === 0) {
      errors.push("Kamida bitta variant majburiy");
    }

    variants.forEach((variant, index) => {
      if (!variant.color.trim()) {
        errors.push(`Variant ${index + 1}: Rang majburiy`);
      }
      if (!variant.price || variant.price <= 0) {
        errors.push(
          `Variant ${index + 1}: Narx majburiy va 0 dan katta bo'lishi kerak`
        );
      }
      const hasMainImage = variant.imageFile instanceof File;
      const hasGalleryImages =
        Array.isArray(variant.images) && variant.images.length > 0;
      if (!hasMainImage && !hasGalleryImages) {
        errors.push(
          `Variant ${index + 1}: Asosiy yoki qo'shimcha rasm majburiy`
        );
      }
    });

    return errors;
  };

  const handleSave = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      addToast(validationErrors, "error", 800);
      return;
    }

    setIsSubmitting(true);

    try {
      const productData = {
        name: formData.productName,
        name_ru: formData.productName_ru || formData.productName,
        name_en: formData.productName_en || formData.productName,
        shortDescription: formData.shortDescription,
        shortDescription_ru: formData.shortDescription_ru,
        shortDescription_en: formData.shortDescription_en,
        description: formData.description,
        description_ru: formData.description_ru,
        description_en: formData.description_en,
        brand: formData.brand,
        category: formData.category,
        subTypeId: formData.subTypeId,
        metaTitle: formData.metaTitle,
        metaTitle_ru: formData.metaTitle_ru,
        metaTitle_en: formData.metaTitle_en,
        metaDescription: formData.metaDescription,
        metaDescription_ru: formData.metaDescription_ru,
        metaDescription_en: formData.metaDescription_en,
        variants: variants,
        mainImage: images.length > 0 ? images[0].file : null,
        metaImage: images.length > 0 ? images[0].file : null,
        event_id: formData.event_id,
        event_number: formData.event_number,
        SPIC: formData.SPIC,
        PackageCode: formData.PackageCode,
      };

      console.log("Sending product data to API:", productData);

      const result = await createProduct(productData);

      addToast("Mahsulot muvaffaqiyatli saqlandi!", "success", 400);

      console.log("Product created successfully:", result);

      // Reset unsaved changes flag after successful save
      setHasUnsavedChanges(false);
      resetForm();

      console.log("Mahsulot muvaffaqiyatli saqlandi va forma tozalandi!");
    } catch (error) {
      console.error("Error creating product:", error);
      addToast(
        "Mahsulot yaratishda xatolik yuz berdi: " + error.message,
        "error",
        600
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      productName: "",
      productName_ru: "",
      productName_en: "",
      shortDescription: "",
      shortDescription_ru: "",
      shortDescription_en: "",
      description: "",
      description_ru: "",
      description_en: "",
      brand: "",
      bs_product_id: "",
      event_id: "",
      event_number: "",
      metaTitle: "",
      metaTitle_ru: "",
      metaTitle_en: "",
      metaDescription: "",
      metaDescription_ru: "",
      metaDescription_en: "",
      category: "",
      subTypeId: "",
      currency: "UZS",
      packaging: "Štučná",
      accountingType: "Без специализированного учета",
      PackageCode: "",
      SPIC: "",
    });

    setImages([]);
    setSelectedImage(null);
    setVariants([]);
    setCurrentVariant({
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
      length: "",
      lengthUnit: "sm",
      width: "",
      widthUnit: "sm",
      height: "",
      heightUnit: "sm",
      weight: "",
      weightUnit: "kg",
    });
    setShowVariantForm(false);
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleDragStart = (e, sectionId) => {
    setDraggedItem(sectionId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, sectionId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverItem(sectionId);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverItem(null);
    }
  };

  const handleDrop = (e, targetSectionId) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== targetSectionId) {
      const newOrder = [...sectionOrder];
      const draggedIndex = newOrder.indexOf(draggedItem);
      const targetIndex = newOrder.indexOf(targetSectionId);
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedItem);
      setSectionOrder(newOrder);
    }
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const getFilteredSubCategories = () => {
    return formData.category
      ? subCategories.filter((sub) => sub.category === formData.category)
      : [];
  };

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setFormData({ ...formData, category: newCategory, subTypeId: "" });
  };

  const addToast = (message, type = "error", duration = 500) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <div className="w-[100%] bg-gray-100">
      <div className="bg-white py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="bg-[#2db789] cursor-pointer hover:bg-[#2db789] text-white font-medium px-4 py-1 rounded transition-colors duration-200"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saqlanmoqda..." : "Saqlash"}
            </button>
            <button
              onClick={handleCloseClick}
              className="bg-white cursor-pointer hover:bg-gray-50 text-gray-700 font-medium px-4 py-1 rounded border border-gray-300 transition-colors duration-200"
            >
              Yopish
            </button>
          </div>
        </div>
      </div>

      <div className="flex bg-white py-2">
        <div className="w-210 bg-white mr-4">
          <ImageSection
            images={images}
            setImages={setImages}
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
            expanded={expandedSections.images}
            toggleSection={() => toggleSection("images")}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            sectionId="images"
            draggedItem={draggedItem}
            dragOverItem={dragOverItem}
          />
          <GeneralSection
            formData={formData}
            setFormData={setFormData}
            variants={variants}
            setVariants={setVariants}
            showVariantForm={showVariantForm}
            setShowVariantForm={setShowVariantForm}
            currentVariant={currentVariant}
            setCurrentVariant={setCurrentVariant}
            subCategories={getFilteredSubCategories()}
            handleCategoryChange={handleCategoryChange}
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
            expanded={expandedSections.general}
            toggleSection={() => toggleSection("general")}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            sectionId="general"
            draggedItem={draggedItem}
            dragOverItem={dragOverItem}
          />
        </div>
        <div className="flex-1">
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex bg-gray-200">
              <button className="px-4 py-2 bg-[#249B73] text-white text-sm font-medium cursor-pointer rounded">
                Qadoqlash ({variants.length})
              </button>
            </div>
          </div>
          <div className="p-6 bg-white">
            <VariantList
              variants={variants}
              setVariants={setVariants}
              setSelectedImage={setSelectedImage}
            />
            {showVariantForm && (
              <div className="mt-4">
                <VariantForm
                  currentVariant={currentVariant}
                  setCurrentVariant={setCurrentVariant}
                  setVariants={setVariants}
                  setShowVariantForm={setShowVariantForm}
                  setSelectedImage={setSelectedImage}
                />
              </div>
            )}
            <div className="mt-4">
              <CatalogPreview formData={formData} images={images} />
            </div>
          </div>
        </div>
      </div>

      <ConfirmExitModal
        isOpen={showExitModal}
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
        message="Haqiqatdan ham bu sahifani yopmoqchimisiz? Saqlanmagan o'zgarishlar yo'qolishi mumkin."
      />

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
