import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import ImageSection from "../product_create/ImageSection";
import GeneralSection from "../product_create/GeneralSection";
import VariantList from "../product_create/VariantList";
import VariantForm from "../product_create/VariantForm";
import productsApi from "../../http/products";
import { toAssetUrl } from "../../utils/imageUrl";

export default function ProductDetail() {
  const navigate = useNavigate();
  const { productId } = useParams();

  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    images: true,
    general: true,
    features: true,
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const originalFormData = useRef({});
  const originalVariants = useRef([]);
  const originalImages = useRef([]);
  const originalCompanyId = useRef("");

  const DEFAULT_FORM_DATA = {
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
  };

  const DEFAULT_VARIANT = {
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
  };

  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [variants, setVariants] = useState([]);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [currentVariant, setCurrentVariant] = useState(DEFAULT_VARIANT);
  const [editingVariant, setEditingVariant] = useState(null);

  const [subCategories] = useState([
    { id: "1", name: "Smartphones", category: "electronics" },
    { id: "2", name: "Laptops", category: "electronics" },
    { id: "3", name: "Tablets", category: "electronics" },
    { id: "4", name: "Shirts", category: "clothing" },
    { id: "5", name: "Pants", category: "clothing" },
    { id: "6", name: "Furniture", category: "home" },
    { id: "7", name: "Decor", category: "home" },
  ]);

  const [sectionOrder, setSectionOrder] = useState([
    "images",
    "general",
    "features",
  ]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  const getValueOrDefault = useCallback((value, defaultValue = "") => {
    if (
      value === null ||
      value === undefined ||
      value === "null" ||
      value === "undefined"
    ) {
      return defaultValue;
    }
    return value;
  }, []);

  const formatImageUrl = useCallback((imageUrl) => {
    if (!imageUrl) return null;
    return toAssetUrl(String(imageUrl).replace(/\\/g, "/"));
  }, []);

  const deepEqual = useCallback((obj1, obj2) => {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== typeof obj2) return false;

    if (typeof obj1 !== "object") return obj1 === obj2;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (let key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!deepEqual(obj1[key], obj2[key])) return false;
    }

    return true;
  }, []);

  const getChangedFormFields = useCallback(() => {
    const changedFields = {};
    const fieldMapping = {
      productName: "name",
      productName_ru: "name_ru",
      productName_en: "name_en",
      shortDescription: "shortDescription",
      shortDescription_ru: "shortDescription_ru",
      shortDescription_en: "shortDescription_en",
      description: "description",
      description_ru: "description_ru",
      description_en: "description_en",
      brand: "brand",
      bs_product_id: "bs_product_id",
      event_id: "event_id",
      event_number: "event_number",
      metaTitle: "metaTitle",
      metaTitle_ru: "metaTitle_ru",
      metaTitle_en: "metaTitle_en",
      metaDescription: "metaDescription",
      metaDescription_ru: "metaDescription_ru",
      metaDescription_en: "metaDescription_en",
      category: "category",
      subTypeId: "subTypeId",
      currency: "currency",
      packaging: "packaging",
      accountingType: "accountingType",
      SPIC: "SPIC",
      PackageCode: "PackageCode",
    };

    Object.keys(fieldMapping).forEach((formKey) => {
      const backendKey = fieldMapping[formKey];
      const currentValue = getValueOrDefault(formData[formKey]);
      const originalValue = getValueOrDefault(
        originalFormData.current[formKey]
      );

      if (currentValue !== originalValue) {
        changedFields[backendKey] = currentValue;
      }
    });

    return changedFields;
  }, [formData, getValueOrDefault]);

  const getChangedVariants = useCallback(() => {
    const changedVariants = [];
    const newVariants = [];
    const deletedVariantIds = [];

    const originalVariantIds = originalVariants.current.map(
      (v) => v.existingId || v.id
    );
    const currentVariantIds = variants.map((v) => v.existingId || v.id);

    originalVariantIds.forEach((originalId) => {
      if (!currentVariantIds.includes(originalId)) {
        deletedVariantIds.push(originalId);
      }
    });

    variants.forEach((currentVariant) => {
      const originalVariant = originalVariants.current.find(
        (v) =>
          (v.existingId || v.id) ===
          (currentVariant.existingId || currentVariant._id)
      );

      if (!originalVariant) {
        newVariants.push({
          color: getValueOrDefault(currentVariant.color),
          unit: getValueOrDefault(currentVariant.unit, "dona"),
          price: parseFloat(getValueOrDefault(currentVariant.price, "0")) || 0,
          discount:
            parseFloat(getValueOrDefault(currentVariant.discount, "0")) || 0,
          stockQuantity:
            parseInt(getValueOrDefault(currentVariant.stockQuantity, "0")) || 0,
          quantity:
            parseInt(getValueOrDefault(currentVariant.quantity, "1")) || 1,
          size: getValueOrDefault(currentVariant.size),
          material: getValueOrDefault(currentVariant.material),
          saleStatus: getValueOrDefault(currentVariant.saleStatus, "active"),
          length:
            parseFloat(getValueOrDefault(currentVariant.length, "0")) || 0,
          lengthUnit: getValueOrDefault(currentVariant.lengthUnit, "sm"),
          width: parseFloat(getValueOrDefault(currentVariant.width, "0")) || 0,
          widthUnit: getValueOrDefault(currentVariant.widthUnit, "sm"),
          height:
            parseFloat(getValueOrDefault(currentVariant.height, "0")) || 0,
          heightUnit: getValueOrDefault(currentVariant.heightUnit, "sm"),
          weight:
            parseFloat(getValueOrDefault(currentVariant.weight, "0")) || 0,
          weightUnit: getValueOrDefault(currentVariant.weightUnit, "kg"),
          imageCount: currentVariant.images?.length || 0,
          hasMainImage: currentVariant.imageFile ? true : false,
          isNew: true,
        });
      } else {
        const variantChanges = {};

        const fieldsToCheck = [
          "color",
          "unit",
          "price",
          "discount",
          "stockQuantity",
          "quantity",
          "size",
          "material",
          "saleStatus",
          "length",
          "lengthUnit",
          "width",
          "widthUnit",
          "height",
          "heightUnit",
          "weight",
          "weightUnit",
        ];

        let hasChanges = false;

        fieldsToCheck.forEach((field) => {
          let currentValue = getValueOrDefault(currentVariant[field]);
          let originalValue = getValueOrDefault(originalVariant[field]);

          if (
            [
              "price",
              "discount",
              "length",
              "width",
              "height",
              "weight",
            ].includes(field)
          ) {
            currentValue = parseFloat(currentValue) || 0;
            originalValue = parseFloat(originalValue) || 0;
          } else if (["stockQuantity", "quantity"].includes(field)) {
            currentValue = parseInt(currentValue) || 0;
            originalValue = parseInt(originalValue) || 0;
          }

          if (currentValue !== originalValue) {
            variantChanges[field] = currentValue;
            hasChanges = true;
            console.log(
              `Field '${field}' changed: ${originalValue} -> ${currentValue}`
            );
          }
        });

        const hasImageChanges =
          !deepEqual(currentVariant.images, originalVariant.images) ||
          currentVariant.imageFile !== originalVariant.imageFile;

        if (hasImageChanges) {
          console.log(
            "Image changes detected for variant:",
            currentVariant.existingId
          );
        }

        if (hasChanges || hasImageChanges) {
          changedVariants.push({
            _id: currentVariant.existingId,
            ...variantChanges,
            imageCount: currentVariant.images?.length || 0,
            hasMainImage: currentVariant.imageFile ? true : false,
            isExisting: true,
            hasImageChanges,
          });

          console.log("Variant changes detected:", {
            variantId: currentVariant.existingId,
            changes: variantChanges,
            hasImageChanges,
          });
        }
      }
    });

    console.log("Variants analysis:", {
      changedVariants: changedVariants.length,
      newVariants: newVariants.length,
      deletedVariants: deletedVariantIds.length,
    });

    return { changedVariants, newVariants, deletedVariantIds };
  }, [variants, getValueOrDefault, deepEqual]);

  const getChangedImages = useCallback(() => {
    const newImages = images.filter((img) => !img.existing && img.file);
    const deletedImages = originalImages.current.filter(
      (originalImg) =>
        !images.find(
          (currentImg) => currentImg.existingUrl === originalImg.existingUrl
        )
    );

    return { newImages, deletedImages };
  }, [images]);

  const fetchProductData = useCallback(async () => {
    if (!productId) {
      navigate(-1);
      return;
    }

    setLoading(true);
    try {
      const { data } = await productsApi.getById(productId);
      const productData = data.productData || data;
      originalCompanyId.current =
        productData?.companyId?._id ||
        productData?.companyId ||
        productData?.company_id ||
        "";

      const formDataObj = {
        productName: getValueOrDefault(productData.name),
        productName_ru: getValueOrDefault(productData.name_ru),
        productName_en: getValueOrDefault(productData.name_en),
        shortDescription: getValueOrDefault(productData.shortDescription),
        shortDescription_ru: getValueOrDefault(productData.shortDescription_ru),
        shortDescription_en: getValueOrDefault(productData.shortDescription_en),
        description: getValueOrDefault(productData.description),
        description_ru: getValueOrDefault(productData.description_ru),
        description_en: getValueOrDefault(productData.description_en),
        brand: getValueOrDefault(productData.brand),
        bs_product_id: getValueOrDefault(productData.bs_product_id),
        event_id: getValueOrDefault(productData.event_id),
        event_number: getValueOrDefault(productData.event_number),
        metaTitle: getValueOrDefault(productData.metaTitle),
        metaTitle_ru: getValueOrDefault(productData.metaTitle_ru),
        metaTitle_en: getValueOrDefault(productData.metaTitle_en),
        metaDescription: getValueOrDefault(productData.metaDescription),
        metaDescription_ru: getValueOrDefault(productData.metaDescription_ru),
        metaDescription_en: getValueOrDefault(productData.metaDescription_en),
        SPIC: getValueOrDefault(productData.SPIC),
        PackageCode: getValueOrDefault(productData.PackageCode),
        category: getValueOrDefault(
          productData.category?._id || productData.category
        ),
        subTypeId: getValueOrDefault(productData.subTypeId),
        currency: getValueOrDefault(productData.currency, "UZS"),
        packaging: getValueOrDefault(productData.packaging, "Štučná"),
        accountingType: getValueOrDefault(
          productData.accountingType,
          "Без специализированного учета"
        ),
      };

      setFormData(formDataObj);
      originalFormData.current = { ...formDataObj };

      const allImages = [];
      let imageIndex = 0;

      if (productData.mainImage) {
        const mainImageUrl = formatImageUrl(productData.mainImage);
        if (mainImageUrl) {
          allImages.push({
            id: imageIndex++,
            file: null,
            preview: mainImageUrl,
            url: mainImageUrl,
            existing: true,
            existingUrl: productData.mainImage,
            isMainImage: true,
            type: "product_main",
          });
        }
      }

      if (productData.images && Array.isArray(productData.images)) {
        productData.images.forEach((img) => {
          const imageUrl = formatImageUrl(img.url || img);
          if (imageUrl) {
            allImages.push({
              id: imageIndex++,
              file: null,
              preview: imageUrl,
              url: imageUrl,
              existing: true,
              existingUrl: img.url || img,
              isMainImage: false,
              type: "product_additional",
            });
          }
        });
      }

      setImages(allImages);
      originalImages.current = [...allImages];

      if (productData.variants && productData.variants.length > 0) {
        const formattedVariants = productData.variants.map((variant, index) => {
          let variantImages = [];
          if (variant.productImages && Array.isArray(variant.productImages)) {
            variantImages = variant.productImages.map((img, imgIndex) => ({
              id: imgIndex,
              file: null,
              url: formatImageUrl(img),
              preview: formatImageUrl(img),
              existing: true,
              existingUrl: formatImageUrl(img),
            }));
          }

          let variantMainImage = null;
          if (variant.mainImg) {
            variantMainImage = formatImageUrl(variant.mainImg);
          }

          return {
            id: variant._id || `variant_${index}`,
            color: getValueOrDefault(variant.color),
            size: getValueOrDefault(variant.size),
            material: getValueOrDefault(variant.material),
            unit: getValueOrDefault(variant.unit, "dona"),
            price: getValueOrDefault(variant.price, ""),
            discount: getValueOrDefault(variant.discount, ""),
            stockQuantity: getValueOrDefault(variant.stockQuantity, ""),
            quantity: getValueOrDefault(variant.quantity, "1"),
            saleStatus: getValueOrDefault(variant.saleStatus, "active"),

            length: getValueOrDefault(variant.length?.toString(), "0"),
            lengthUnit: getValueOrDefault(variant.lengthUnit, "sm"),
            width: getValueOrDefault(variant.width?.toString(), "0"),
            widthUnit: getValueOrDefault(variant.widthUnit, "sm"),
            height: getValueOrDefault(variant.height?.toString(), "0"),
            heightUnit: getValueOrDefault(variant.heightUnit, "sm"),
            weight: getValueOrDefault(variant.weight?.toString(), "0"),
            weightUnit: getValueOrDefault(variant.weightUnit, "kg"),

            image: variantMainImage,
            imageFile: null,
            images: variantImages,
            existing: true,
            existingId: variant._id,
            name: getValueOrDefault(variant.name || variant.color),
            code: getValueOrDefault(variant.code),
            isEditing: false,

            variant_qrcode: variant.variant_qrcode || null,
            variant_system_code: variant.variant_system_code || "",
          };
        });

        setVariants(formattedVariants);
        originalVariants.current = JSON.parse(
          JSON.stringify(formattedVariants)
        );
      }
    } catch (error) {
      console.error("Mahsulot ma'lumotlarini yuklashda xatolik:", error);
      if (error.response?.status === 404) {
        console.log("Mahsulot topilmadi!");
      } else {
        console.log("Mahsulot ma'lumotlarini yuklashda xatolik yuz berdi!");
      }
    } finally {
      setLoading(false);
    }
  }, [productId, navigate, getValueOrDefault, formatImageUrl]);

  useEffect(() => {
    fetchProductData();
  }, [fetchProductData]);

  const handleFormDataChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({
        ...prev,
        [field]: getValueOrDefault(value),
      }));
    },
    [getValueOrDefault]
  );

  const handleVariantChange = useCallback(
    (field, value) => {
      setCurrentVariant((prev) => ({
        ...prev,
        [field]: getValueOrDefault(value, DEFAULT_VARIANT[field]),
      }));
    },
    [getValueOrDefault]
  );

  const handleImageClick = useCallback((imageUrl) => {
    setSelectedImage(imageUrl);
  }, []);

  const updateProduct = async () => {
    try {
      const formDataToSend = new FormData();
      let hasChanges = false;
      const companyId = originalCompanyId.current;
      if (companyId) {
        formDataToSend.append("companyId", companyId);
      }

      const changedFormFields = getChangedFormFields();
      Object.keys(changedFormFields).forEach((key) => {
        const value = changedFormFields[key];
        if (value && (typeof value === "string" ? value.trim() !== "" : true)) {
          formDataToSend.append(key, value);
          hasChanges = true;
        }
      });

      const { changedVariants, newVariants, deletedVariantIds } =
        getChangedVariants();

      const allVariantsForUpdate = [];

      variants.forEach((variant) => {
        if (variant.existingId) {
          const variantData = {
            _id: variant.existingId,
            color: getValueOrDefault(variant.color),
            unit: getValueOrDefault(variant.unit, "dona"),
            price: parseFloat(getValueOrDefault(variant.price, "0")) || 0,
            discount: parseFloat(getValueOrDefault(variant.discount, "0")) || 0,
            stockQuantity:
              parseInt(getValueOrDefault(variant.stockQuantity, "0")) || 0,
            quantity: parseInt(getValueOrDefault(variant.quantity, "1")) || 1,
            size: getValueOrDefault(variant.size),
            material: getValueOrDefault(variant.material),
            saleStatus: getValueOrDefault(variant.saleStatus, "active"),
            length: parseFloat(getValueOrDefault(variant.length, "0")) || 0,
            lengthUnit: getValueOrDefault(variant.lengthUnit, "sm"),
            width: parseFloat(getValueOrDefault(variant.width, "0")) || 0,
            widthUnit: getValueOrDefault(variant.widthUnit, "sm"),
            height: parseFloat(getValueOrDefault(variant.height, "0")) || 0,
            heightUnit: getValueOrDefault(variant.heightUnit, "sm"),
            weight: parseFloat(getValueOrDefault(variant.weight, "0")) || 0,
            weightUnit: getValueOrDefault(variant.weightUnit, "kg"),
          };
          allVariantsForUpdate.push(variantData);
        } else {
          const variantData = {
            color: getValueOrDefault(variant.color),
            unit: getValueOrDefault(variant.unit, "dona"),
            price: parseFloat(getValueOrDefault(variant.price, "0")) || 0,
            discount: parseFloat(getValueOrDefault(variant.discount, "0")) || 0,
            stockQuantity:
              parseInt(getValueOrDefault(variant.stockQuantity, "0")) || 0,
            quantity: parseInt(getValueOrDefault(variant.quantity, "1")) || 1,
            size: getValueOrDefault(variant.size),
            material: getValueOrDefault(variant.material),
            saleStatus: getValueOrDefault(variant.saleStatus, "active"),
            length: parseFloat(getValueOrDefault(variant.length, "0")) || 0,
            lengthUnit: getValueOrDefault(variant.lengthUnit, "sm"),
            width: parseFloat(getValueOrDefault(variant.width, "0")) || 0,
            widthUnit: getValueOrDefault(variant.widthUnit, "sm"),
            height: parseFloat(getValueOrDefault(variant.height, "0")) || 0,
            heightUnit: getValueOrDefault(variant.heightUnit, "sm"),
            weight: parseFloat(getValueOrDefault(variant.weight, "0")) || 0,
            weightUnit: getValueOrDefault(variant.weightUnit, "kg"),
            isNew: true,
          };
          allVariantsForUpdate.push(variantData);
        }
      });
      if (allVariantsForUpdate.length > 0) {
        formDataToSend.append("variants", JSON.stringify(allVariantsForUpdate));
        hasChanges = true;
      }

      if (deletedVariantIds.length > 0) {
        formDataToSend.append(
          "deletedVariants",
          JSON.stringify(deletedVariantIds)
        );
        hasChanges = true;
      }

      const { newImages, deletedImages } = getChangedImages();

      const newMainImage = newImages.find((img) => img.isMainImage);
      if (newMainImage?.file) {
        formDataToSend.append("mainImage", newMainImage.file);
        formDataToSend.append("metaImage", newMainImage.file);
        hasChanges = true;
      }

      const newAdditionalImages = newImages.filter((img) => !img.isMainImage);
      newAdditionalImages.forEach((image, index) => {
        if (image.file) {
          formDataToSend.append("mainImage", image.file);
          hasChanges = true;
        }
      });

      if (deletedImages.length > 0) {
        formDataToSend.append(
          "deletedImages",
          JSON.stringify(
            deletedImages.map((img) => String(img.existingUrl || "").replace(/^\/+/, ""))
          )
        );
        hasChanges = true;
      }

      variants.forEach((variant, variantIndex) => {
        if (variant.imageFile instanceof File) {
          formDataToSend.append(
            `variant_${variantIndex}_mainImg`,
            variant.imageFile
          );
          hasChanges = true;
        }

        if (variant.images && Array.isArray(variant.images)) {
          variant.images.forEach((image, imageIndex) => {
            if (image.file instanceof File) {
              formDataToSend.append(
                `variant_${variantIndex}_images`,
                image.file
              );
              hasChanges = true;
            }
          });
        }
      });

      if (!hasChanges) {
        console.log("Hech qanday o'zgarish aniqlanmadi!");
        return { success: true, message: "No changes detected" };
      }

      const response = await productsApi.update(productId, formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Update Progress: ${percentCompleted}%`);
        },
      });

      return response.data;
    } catch (error) {
      console.error("Mahsulotni yangilashda xatolik:", error);

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
  const validateForm = useCallback(() => {
    const errors = [];

    if (!getValueOrDefault(formData.productName).trim()) {
      errors.push("Mahsulot nomi (O'zbekcha) majburiy");
    }
    if (!getValueOrDefault(formData.category)) {
      errors.push("Kategoriya majburiy");
    }
    if (!getValueOrDefault(formData.subTypeId)) {
      errors.push("Subkategoriya majburiy");
    }
    if (images.length === 0) {
      errors.push("Kamida bitta asosiy rasm majburiy");
    }
    if (variants.length === 0) {
      errors.push("Kamida bitta variant majburiy");
    }

    variants.forEach((variant, index) => {
      if (!getValueOrDefault(variant.color).trim()) {
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
  }, [formData, images, variants, getValueOrDefault]);

  const handleUpdate = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      console.log(
        "Quyidagi maydonlarni to'ldiring:\n" + validationErrors.join("\n")
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateProduct();

      if (result.message === "No changes detected") {
        console.log("Hech qanday o'zgarish aniqlanmadi!");
      } else {
        console.log("Product updated successfully:", result);
        console.log("Mahsulot muvaffaqiyatli yangilandi!");

        await fetchProductData();
      }
    } catch (error) {
      console.error("Error updating product:", error);
      console.log("Xatolik yuz berdi: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setFormData((prev) => ({
      ...prev,
      category: getValueOrDefault(newCategory),
      subTypeId: "",
    }));
  };

  const getFilteredSubCategories = () => {
    return formData.category
      ? subCategories.filter((sub) => sub.category === formData.category)
      : [];
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

  if (loading) {
    return (
      <div className="w-[100%] bg-gray-100 flex items-center justify-center min-h-screen">
        <div className="text-lg font-medium">
          Mahsulot ma'lumotlari yuklanmoqda...
        </div>
      </div>
    );
  }

  if (!productId) {
    return (
      <div className="w-[70%] bg-gray-100 flex items-center justify-center min-h-screen">
        <div className="text-lg font-medium text-red-600">
          Mahsulot ID si topilmadi!
          <Link to="/products" className="text-green-600 hover:underline ml-2">
            Mahsulotlar ro'yxatiga qaytish
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[100%] bg-gray-100">
      <div className="bg-white px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUpdate}
              className="bg-[#249B73] cursor-pointer hover:bg-[#2db789] text-white font-medium px-4 py-1 rounded transition-colors duration-200"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Yangilanmoqda..." : "Yangilash"}
            </button>

            <Link
              to={-1}
              className="bg-white cursor-pointer hover:bg-gray-50 text-gray-700 font-medium px-4 py-1 rounded border border-gray-300 transition-colors duration-200"
            >
              Закрыть
            </Link>
          </div>
        </div>
      </div>

      <div className="flex bg-white px-4 py-2">
        <div className="w-300 bg-white mr-4">
          <ImageSection
            images={images}
            setImages={setImages}
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
            handleImageClick={handleImageClick}
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

        <div className="flex flex-col min-w-[400px]">
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
              setCurrentVariant={setCurrentVariant}
              setShowVariantForm={setShowVariantForm}
              setEditingVariant={setEditingVariant}
            />
            {showVariantForm && (
              <div className="mt-4">
                <VariantForm
                  currentVariant={currentVariant}
                  setCurrentVariant={setCurrentVariant}
                  setVariants={setVariants}
                  setShowVariantForm={setShowVariantForm}
                  setSelectedImage={setSelectedImage}
                  editingVariant={editingVariant}
                  setEditingVariant={setEditingVariant}
                  variants={variants}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
