"use client";
import clsx from "clsx";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Plus,
  Settings2,
  MessageCircle,
  Share2,
  Eye,
  X,
} from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useProductStore from "../../store/productStore";
import { useCartStore } from "../hooks/cart";
import { useHomeLikes } from "../hooks/likes";
import { useTranslation } from "react-i18next";
import $api from "@/app/http/api";
import { getImageUrl } from "../../utils/imageHelper";

export default function ProductDetail() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const currentProduct = useProductStore((state) => state.currentProduct);
  const [activeIndex, setActiveIndex] = useState(0);
  const [thumbStartIndex, setThumbStartIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [direction, setDirection] = useState("right");
  const [animate, setAnimate] = useState(false);
  const { toggleLike, isLiked } = useHomeLikes();
  const isInWishlist = isLiked(currentProduct?.id);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalActiveIndex, setModalActiveIndex] = useState(0);
  const [modalDirection, setModalDirection] = useState("right");
  const [modalAnimate, setModalAnimate] = useState(false);
  const [failedImages, setFailedImages] = useState({});
  const [loadedImages, setLoadedImages] = useState({});

  const { addCart } = useCartStore();

  const THUMB_PER_PAGE = 6;

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = () => {
    try {
      const token =
        localStorage.getItem("accessToken") || localStorage.getItem("token");
      return !!token && token !== "undefined" && token.length > 0;
    } catch (error) {
      console.error("Error checking authentication:", error);
      return false;
    }
  };

  if (!currentProduct)
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );

  const showNotification = (message, type = "success") => {
    console.log(`${type}: ${message}`);
    if (typeof window !== "undefined" && window.toast) {
      window.toast(message, type);
    }
  };

  const getCurrentImage = () => {
    return images[activeIndex] || null;
  };

  const toggleWishlist = () => {
    toggleLike(currentProduct);
  };

  const currentVariant =
    currentProduct?.variants?.[selectedVariant] ||
    currentProduct?.variants?.[0] ||
    {};

  const getCurrentVariantImages = () => {
    const variantImages = [];

    if (currentVariant.mainImg) {
      const mainImg = getImageUrl(currentVariant.mainImg);
      variantImages.push(mainImg);
    }

    if (currentVariant.image) {
      const variantImage = getImageUrl(currentVariant.image);
      variantImages.push(variantImage);
    }

    if (currentVariant.productImages) {
      currentVariant.productImages.forEach((img) => {
        const imageUrl = getImageUrl(img);
        variantImages.push(imageUrl);
      });
    }

    if (variantImages.length === 0) {
      if (currentProduct?.image) {
        const baseImage = getImageUrl(currentProduct.image);
        variantImages.push(baseImage);
      }

      if (currentProduct?.mainImage) {
        const mainImage = getImageUrl(currentProduct.mainImage);
        variantImages.push(mainImage);
      }

      if (currentProduct?.metaImage) {
        const metaImage = getImageUrl(currentProduct.metaImage);
        variantImages.push(metaImage);
      }
    }

    return variantImages.filter(Boolean);
  };

  const images = getCurrentVariantImages();
  const availableImages = images.filter((img) => img && !failedImages[img]);
  const effectiveQuantity = Math.max(1, quantity);
  const activeImage = images[activeIndex] || null;
  const canOpenActiveImage =
    !!activeImage &&
    !failedImages[activeImage] &&
    !!loadedImages[activeImage];

  const getOpenableImages = () =>
    images.filter(
      (img) =>
        img &&
        !failedImages[img] &&
        !!loadedImages[img]
    );

  const markImageFailed = (imageUrl) => {
    if (!imageUrl) return;
    setFailedImages((prev) => ({ ...prev, [imageUrl]: true }));
  };

  const markImageLoaded = (imageUrl) => {
    if (!imageUrl) return;
    setLoadedImages((prev) => ({ ...prev, [imageUrl]: true }));
  };

  const openModal = (index) => {
    const openableImages = getOpenableImages();
    if (openableImages.length === 0) {
      return;
    }

    const targetImage = images[index];
    if (!targetImage || failedImages[targetImage]) {
      const firstOpenableIndex = images.findIndex(
        (img) =>
          img &&
          !failedImages[img] &&
          !!loadedImages[img]
      );
      if (firstOpenableIndex === -1) {
        return;
      }
      setModalActiveIndex(firstOpenableIndex);
    } else {
      setModalActiveIndex(index);
    }

    setIsModalOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = "unset";
  };

  const handleModalNext = () => {
    setModalDirection("right");
    setModalAnimate(true);
    setModalActiveIndex((prev) => (prev + 1) % images.length);
  };

  const handleModalPrev = () => {
    setModalDirection("left");
    setModalAnimate(true);
    setModalActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleModalKeyDown = (e) => {
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowRight") handleModalNext();
    if (e.key === "ArrowLeft") handleModalPrev();
  };

  useEffect(() => {
    setActiveIndex(0);
    setThumbStartIndex(0);
    setQuantity(1);
  }, [selectedVariant]);

  useEffect(() => {
    if (isModalOpen) {
      document.addEventListener("keydown", handleModalKeyDown);
      return () => document.removeEventListener("keydown", handleModalKeyDown);
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (modalAnimate) {
      const timer = setTimeout(() => setModalAnimate(false));
      return () => clearTimeout(timer);
    }
  }, [modalAnimate]);

  const getTranslatedDescription = () => {
    const currentLang = i18n.language;

    if (currentLang === "ru") {
      return (
        currentProduct?.description_ru || currentProduct?.description || ""
      );
    } else if (currentLang === "en") {
      return (
        currentProduct?.description_en || currentProduct?.description || ""
      );
    } else {
      // uz yoki boshqa tillar uchun default description
      return currentProduct?.description || "";
    }
  };

  const getTranslatedName = () => {
    const currentLang = i18n.language;

    if (currentLang === "ru") {
      return (
        currentProduct?.name_ru || currentProduct?.name || ""
      );
    } else if (currentLang === "en") {
      return (
        currentProduct?.name_en || currentProduct?.name || ""
      );
    } else {
      // uz yoki boshqa tillar uchun default description
      return currentProduct?.name || "";
    }
  };

  const { variants = [] } = currentProduct;

  const name = getTranslatedName();
  const description = getTranslatedDescription();

  const {
    unit,
    price: variantPrice,
    discountedPrice: variantDiscountedPrice,
    discount = 0,
    stockQuantity = 0,
  } = currentVariant;
  const stockLimit = Number(stockQuantity) || 0;
  const hasStock = stockLimit > 0;

  const displayPrice = variantPrice || currentProduct?.price || 0;
  const displayDiscountedPrice =
    variantDiscountedPrice || currentProduct?.discountedPrice;

  const handleThumbnailClick = (index) => {
    if (index === activeIndex) return;
    setDirection(index > activeIndex ? "right" : "left");
    setAnimate(true);
    setActiveIndex(index);
    if (index >= thumbStartIndex + THUMB_PER_PAGE || index < thumbStartIndex) {
      setThumbStartIndex(
        Math.max(0, Math.min(index, images.length - THUMB_PER_PAGE))
      );
    }
  };

  const handleThumbNext = () => {
    setDirection("right");
    setAnimate(true);
    if (activeIndex < images.length - 1) {
      const newIndex = activeIndex + 1;
      setActiveIndex(newIndex);
      if (newIndex >= thumbStartIndex + THUMB_PER_PAGE) {
        setThumbStartIndex(thumbStartIndex + 1);
      }
    } else {
      setActiveIndex(0);
      setThumbStartIndex(0);
    }
  };

  const handleThumbPrev = () => {
    setDirection("left");
    setAnimate(true);
    if (activeIndex > 0) {
      const newIndex = activeIndex - 1;
      setActiveIndex(newIndex);
      if (newIndex < thumbStartIndex) {
        setThumbStartIndex(thumbStartIndex - 1);
      }
    } else {
      const lastIndex = images.length - 1;
      setActiveIndex(lastIndex);
      setThumbStartIndex(Math.max(0, lastIndex - THUMB_PER_PAGE + 1));
    }
  };

  const createLocalCartProduct = (qty = 1) => {
    const productId = currentProduct.id || currentProduct._id;
    return {
      ...currentProduct,
      id: productId,
      productId: productId,
      variantId: currentVariant._id,
      name: currentProduct.name,
      image: getCurrentImage(),
      price: displayPrice,
      discountedPrice: displayDiscountedPrice,
      sale_price: displayDiscountedPrice || displayPrice,
      axiom_monthly_price: currentProduct.axiom_monthly_price,
      quantity: qty,
      checked: false,
      variant: {
        color: currentVariant.color,
        unit: currentVariant.unit,
        stockQuantity: currentVariant.stockQuantity,
      },
    };
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();

    setIsLoading(true);

    try {
      const productId = currentProduct.id || currentProduct._id;
      const variantId = currentVariant._id;
      const authStatus = checkAuthentication();
      const quantityToAdd = effectiveQuantity;

      if (!authStatus) {
        const localCartProduct = createLocalCartProduct(quantityToAdd);
        addCart(localCartProduct, variantId);
        showNotification(
          "Mahsulot savatga qo'shildi! Ro'yxatdan o'ting yoki tizimga kiring.",
          "success"
        );
        setIsLoading(false);
        return;
      }

      const cartData = {
        products: [
          {
            productId: productId,
            variantId: variantId,
            quantity: quantityToAdd,
            price: displayDiscountedPrice || displayPrice,
          },
        ],
      };

      const response = await $api.post("/cart/add/product", cartData);

      if (response.data && response.data.status === 200) {
        showNotification(
          "Mahsulot muvaffaqiyatli savatga qo'shildi!",
          "success"
        );
      } else {
        throw new Error("API javobida xatolik");
      }
    } catch (error) {
      console.error("Error in handleAddToCart:", error);
      showNotification(
        "Savatga qo'shishda xatolik yuz berdi. Qaytadan urinib ko'ring.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityChange = (type) => {
    if (!hasStock) return;
    if (type === "inc") {
      setQuantity((prev) => Math.min(prev + 1, stockLimit));
      return;
    }
    setQuantity((prev) => Math.max(prev - 1, 1));
  };

  const handleBuyNow = async () => {
    if (!hasStock || isBuyingNow) return;
    setIsBuyingNow(true);
    try {
      const productId = currentProduct.id || currentProduct._id;
      const variantId = currentVariant._id;
      const authStatus = checkAuthentication();

      if (!authStatus) {
        if (typeof window !== "undefined") {
          localStorage.setItem("redirectAfterLogin", "/checkout");
        }
        router.push("/register");
        return;
      }

      await $api.post("/cart/add/product", {
        products: [
          {
            productId,
            variantId,
            quantity: effectiveQuantity,
            price: displayDiscountedPrice || displayPrice,
          },
        ],
      });

      router.push("/checkout");
    } catch (error) {
      console.error("Error in handleBuyNow:", error);
      showNotification(
        "Sotib olishda xatolik yuz berdi. Qaytadan urinib ko'ring.",
        "error"
      );
    } finally {
      setIsBuyingNow(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: name,
        text: `${name} - ${displayPrice} so'm`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setAnimate(false));
      return () => clearTimeout(timer);
    }
  }, [animate]);

  const unitFinalPrice = Number(displayDiscountedPrice || displayPrice || 0);
  const unitOriginalPrice = Number(displayPrice || 0);
  const showDiscountedPrice =
    Number(displayDiscountedPrice || 0) > 0 &&
    Number(displayDiscountedPrice || 0) !== unitOriginalPrice;
  const totalFinalPrice = unitFinalPrice * Math.max(effectiveQuantity, 1);
  const totalOriginalPrice = unitOriginalPrice * Math.max(effectiveQuantity, 1);

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 text-[#A0A0A0] mb-6 text-sm md:text-base">
          <span className="cursor-pointer hover:text-[#249B73]">
            {t("product.products")}
          </span>
          <span>/</span>
          <span className="text-[#1E1E1E] font-medium line-clamp-1">
            {name}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 ">
          <div className="w-full lg:w-[60%] flex flex-col gap-6">
            <div className="relative">
              <div className="flex justify-center w-full max-w-full h-[600px] max-[500px]:w-[350px] max-[500px]:h-[340px] lg:max-w-[100%] aspect-square bg-white rounded-xl relative overflow-hidden shadow-md">
                <div className="relative w-full h-[600px] flex items-center justify-center p-4 max-[500px]:h-[340px]">
                  {activeImage && !failedImages[activeImage] ? (
                    <Image
                      src={activeImage}
                      alt="Product image"
                      fill
                      className={clsx(
                        "object-cover transition-transform duration-500 ease-in-out max-[500px]:object-contain",
                        canOpenActiveImage ? "cursor-zoom-in" : "cursor-default",
                        animate &&
                          direction === "right" &&
                          "animate-slide-in-right",
                        animate &&
                          direction === "left" &&
                          "animate-slide-in-left"
                      )}
                      key={`${selectedVariant}-${activeIndex}`}
                      onClick={() => canOpenActiveImage && openModal(activeIndex)}
                      onError={() => markImageFailed(activeImage)}
                      onLoadingComplete={() => markImageLoaded(activeImage)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-base">
                      {t("common.no_image")}
                    </div>
                  )}
                </div>

                {canOpenActiveImage && (
                  <div
                    className="absolute bottom-75 right-85 bg-black/50 text-white p-4 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => openModal(activeIndex)}
                  >
                    <Eye size={22} />
                  </div>
                )}

                <div className="absolute top-4 right-4 flex flex-col gap-3">
                  <button
                    onClick={toggleWishlist}
                    className={clsx(
                      "p-2 rounded-full backdrop-blur-sm cursor-pointer transition-all shadow-md",
                      isInWishlist
                        ? "bg-red-500 text-white"
                        : "bg-white/80 text-gray-600 hover:text-red-500"
                    )}
                  >
                    <Heart
                      size={20}
                      fill={isInWishlist ? "currentColor" : "none"}
                    />
                  </button>

                  <button
                    onClick={handleShare}
                    className="p-2 rounded-full cursor-pointer bg-white/80 backdrop-blur-sm text-gray-600 hover:text-green-500 transition-colors shadow-md"
                  >
                    <Share2 size={20} />
                  </button>
                  <button className="p-2 rounded-full cursor-pointer bg-white/80 backdrop-blur-sm text-gray-600 hover:text-green-500 transition-colors shadow-md">
                    <Settings2 size={20} />
                  </button>
                </div>

                {discount > 0 && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white px-2 py-1 rounded-lg text-sm font-semibold">
                    -{discount}%
                  </div>
                )}
              </div>
            </div>

            {availableImages.length > 1 && (
              <div className="flex items-center text-center relative group px-4">
                <button
                  onClick={handleThumbPrev}
                  className="absolute left-0 sm:left-2 md:-left-6 p-2 z-10 max-[500px]:hidden bg-white rounded-full shadow-md cursor-pointer opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-50"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex gap-10 w-[650px] overflow-x-auto scrollbar-hide max-[500px]:gap-4">
                  {images
                    .slice(thumbStartIndex, thumbStartIndex + THUMB_PER_PAGE)
                    .map((img, index) => {
                      const realIndex = thumbStartIndex + index;
                      return (
                        <div
                          key={`${selectedVariant}-thumb-${realIndex}`}
                          onClick={() => handleThumbnailClick(realIndex)}
                          className={clsx(
                            "flex-shrink-0 w-20 h-20 bg-white rounded-lg cursor-pointer flex items-center justify-center transition-all mx-1 hover:shadow-md",
                            activeIndex === realIndex
                              ? "border-2 border-[#249B73] shadow-md"
                              : "border border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <div className="relative w-full h-full">
                            {img && !failedImages[img] ? (
                              <Image
                                src={img}
                                alt="thumbnail"
                                fill
                                className="w-auto h-auto transition-transform rounded-lg "
                                onError={() => markImageFailed(img)}
                                onLoadingComplete={() => markImageLoaded(img)}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500 bg-gray-100 rounded-lg">
                                {t("common.no_image")}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
                <button
                  onClick={handleThumbNext}
                  className="absolute right-0 sm:right-2 md:-right-6 p-2 z-10 max-[500px]:hidden bg-white rounded-full shadow-md cursor-pointer opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-50"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>

          <div className="w-full lg:w-[40%]">
            <div className="mb-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                <h1 className="text-[#1E1E1E] font-bold text-2xl lg:text-3xl leading-tight">
                  {name}
                </h1>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
                <button className="text-[#249B73] cursor-pointer text-sm hover:underline flex items-center gap-1">
                  <MessageCircle size={14} />
                  {t("product.write_review")}
                </button>
              </div>
            </div>

            {variants.length > 1 && (
              <div className="mb-6">
                <p className="text-[#1E1E1E] text-lg font-medium mb-3">
                  {t("product.colors")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((variant, index) => (
                    <button
                      key={variant._id}
                      onClick={() => setSelectedVariant(index)}
                      className={clsx(
                        "px-4 py-2 rounded-lg border cursor-pointer transition-all text-sm md:text-base",
                        selectedVariant === index
                          ? "border-[#249B73] bg-[#249B73] text-white"
                          : "border-gray-300 hover:border-[#249B73] hover:text-[#249B73]"
                      )}
                    >
                      {variant.color || `Variant ${index + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-baseline gap-4 mb-2">
                <p className="text-[#1E1E1E] text-2xl lg:text-3xl font-bold">
                  {`${totalFinalPrice.toLocaleString()} so'm`}
                </p>
                {showDiscountedPrice && (
                    <p className="text-red-400 text-xl line-through">
                      {totalOriginalPrice.toLocaleString()} so'm
                    </p>
                  )}
              </div>
              {discount > 0 && (
                <p className="text-[#249B73]  font-medium">
                  {t("product.with_discount", { discount })}
                </p>
              )}
            </div>

            <div className="mb-8">
              <div className="mb-4">
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-[#1E1E1E] text-xl">{t("product.quantity")}:</span>
                  <div className="flex items-center border border-[#249B73] rounded-xl overflow-hidden">
                    <button
                      onClick={() => handleQuantityChange("dec")}
                      disabled={effectiveQuantity <= 1 || !hasStock}
                      className="px-4 py-2 text-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <span className="px-6 py-2 min-w-[64px] text-center font-semibold">
                      {effectiveQuantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange("inc")}
                      disabled={!hasStock || effectiveQuantity >= stockLimit}
                      className="px-4 py-2 text-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {t("product.in_stock")}: {stockLimit}
                  {unit || t("product.piece")}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleAddToCart}
                  disabled={!hasStock || isLoading}
                  className={clsx(
                    "flex-1 py-3 px-6 rounded-lg cursor-pointer font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
                    !hasStock
                      ? "bg-gray-300 text-gray-500"
                      : "bg-white border-2 border-[#249B73] text-[#249B73] hover:bg-[#249B73] hover:text-white"
                  )}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus size={18} />
                      {t("product.add_to_cart")}
                    </>
                  )}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={!hasStock || isBuyingNow}
                  className={clsx(
                    "flex-1 py-3 px-6 rounded-lg cursor-pointer font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                    !hasStock
                      ? "bg-gray-300 text-gray-500"
                      : "bg-[#249B73] text-white hover:opacity-90"
                  )}
                >
                  {isBuyingNow ? "..." : t("product.buy_now")}
                </button>
              </div>
            </div>

            {description && (
              <div className="mb-6 bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-semibold mb-3">
                  {t("product.description")}
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <button
            onClick={closeModal}
            className="absolute top-4 cursor-pointer right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <X size={32} />
          </button>

          <div className="relative w-full h-full flex items-center justify-center">
            {images.length > 1 && (
              <button
                onClick={handleModalPrev}
                className="absolute left-4 p-3 max-[500px]:p-1 cursor-pointer text-white hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full"
              >
                <ChevronLeft size={32} />
              </button>
            )}

            <div className="relative max-w-[90vw] max-h-[90vh] w-full h-full flex items-center justify-center">
              {images[modalActiveIndex] && !failedImages[images[modalActiveIndex]] ? (
                <Image
                  src={images[modalActiveIndex]}
                  alt="Product image fullscreen"
                  fill
                  className={clsx(
                    "object-contain transition-transform duration-500 ease-in-out",
                    modalAnimate &&
                      modalDirection === "right" &&
                      "animate-slide-in-right",
                    modalAnimate &&
                      modalDirection === "left" &&
                      "animate-slide-in-left"
                  )}
                  key={`modal-${selectedVariant}-${modalActiveIndex}`}
                  onError={() => markImageFailed(images[modalActiveIndex])}
                  onLoadingComplete={() =>
                    markImageLoaded(images[modalActiveIndex])
                  }
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-lg">
                  {t("common.no_image")}
                </div>
              )}
            </div>

            {images.length > 1 && (
              <button
                onClick={handleModalNext}
                className="absolute right-4 cursor-pointer p-3 max-[500px]:p-1 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full"
              >
                <ChevronRight size={32} />
              </button>
            )}

            {images.length > 1 && (
              <div className="absolute bottom-4 left-320 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full">
                {modalActiveIndex + 1} / {images.length}
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 max-w-[80vw] overflow-x-auto">
              {images.map((img, index) => (
                <button
                  key={`modal-thumb-${index}`}
                  onClick={() => {
                    setModalDirection(
                      index > modalActiveIndex ? "right" : "left"
                    );
                    setModalAnimate(true);
                    setModalActiveIndex(index);
                  }}
                  className={clsx(
                    "flex-shrink-0 w-16 h-16 cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
                    modalActiveIndex === index
                      ? "border-white"
                      : "border-transparent opacity-60 hover:opacity-80"
                  )}
                >
                  <Image
                    src={img}
                    alt={`thumbnail ${index + 1}`}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    onError={() => markImageFailed(img)}
                    onLoadingComplete={() => markImageLoaded(img)}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
