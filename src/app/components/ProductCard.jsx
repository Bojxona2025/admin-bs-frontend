"use client";
import { useState, useEffect, useMemo } from "react";
import { Heart, ShoppingCart } from "lucide-react";
import { useHomeLikes } from "./hooks/likes";
import { useCartStore } from "./hooks/cart";
import Image from "next/image";
import { useRouter } from "next/navigation";
import useProductStore from "../store/productStore";
import { useTranslation } from "react-i18next";
import i18next from "../../i18n/i18n";
import VariantSelectionModal from "./VariantSelectionModal";
import $api from "../http/api";
import { getImageUrls } from "../utils/imageHelper";

export default function ProductCard({ product }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { toggleLike, likes } = useHomeLikes();
  const setCurrentProduct = useProductStore((state) => state.setCurrentProduct);
  const { addCart } = useCartStore();
  const [isLoading, setIsLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [failedImages, setFailedImages] = useState({});

  useEffect(() => {
    setMounted(true);
    checkAuthentication();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth <= 500);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const checkAuthentication = () => {
    try {
      const token =
        localStorage.getItem("accessToken") || localStorage.getItem("token");
      const isAuth = !!token && token !== "undefined" && token.length > 0;
      setIsAuthenticated(isAuth);
      return isAuth;
    } catch (error) {
      console.error("Error checking authentication:", error);
      setIsAuthenticated(false);
      return false;
    }
  };

  const {
    name,
    name_ru,
    name_en,
    image,
    mainImage,
    metaImage,
    id,
    price,
    discountedPrice,
    reviews_count,
    rating,
    variants = [],
  } = product;

  const getLocalizedName = () => {
    switch (i18next.language) {
      case "ru":
        return name_ru || name;
      case "en":
        return name_en || name;
      default:
        return name;
    }
  };

  const getCurrencyText = () => {
    switch (i18next.language) {
      case "ru":
        return "сум";
      case "en":
        return "sum";
      default:
        return "so'm";
    }
  };

  const getAllImages = () => {
    const candidates = [variants?.[0]?.mainImg, mainImage, image, metaImage]
      .filter(Boolean)
      .flatMap((img) => getImageUrls(img))
      .filter(Boolean);

    const unique = Array.from(new Set(candidates));
    return unique;
  };

  const allImages = getAllImages();
  const imagePool = useMemo(() => {
    const filtered = allImages.filter((img) => !failedImages[img]);
    return filtered;
  }, [allImages, failedImages]);
  const isLiked = likes.some((item) => item.id === id);

  useEffect(() => {
    setCurrentImageIndex(0);
    setFailedImages({});
  }, [id]);

  useEffect(() => {
    if (currentImageIndex >= imagePool.length) {
      setCurrentImageIndex(0);
    }
  }, [currentImageIndex, imagePool.length]);

  const showNotification = (message, type = "error") => {
    console.log(`${type}: ${message}`);
    if (typeof window !== "undefined" && window.toast) {
      window.toast(message, type);
    }
  };

  const createLocalCartProduct = (quantity = 1, variantId = null) => {
    return {
      ...product,
      id: id,
      productId: id,
      variantId: variantId,
      sale_price: discountedPrice || price,
      original_price: discountedPrice ? price : null,
      quantity: quantity,
      price: discountedPrice || price,
      checked: false,
      variant: variantId ? variants.find((v) => v._id === variantId) : null,
    };
  };

  const syncCartFromResponse = (response) => {
    const payload = response?.data?.cart || response?.data;
    if (payload) {
      useCartStore.getState().updateCartFromAPI(payload);
    }
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();

    if (variants && variants.length > 0) {
      setShowVariantModal(true);
      return;
    }

    setIsLoading(true);
    const variantId = variants[0]?._id || null;
    const productId = id || product._id;
    const authStatus = checkAuthentication();

    try {
      const localCartProduct = createLocalCartProduct(1, variantId);
      addCart(localCartProduct, variantId);

      if (!authStatus) {
        showNotification(
          "Mahsulot savatga qo'shildi! Ro'yxatdan o'ting yoki tizimga kiring.",
          "success"
        );
      } else {
        // Login qilgan foydalanuvchilar uchun FAQAT API
        const cartData = {
          products: [
            {
              productId: productId,
              variantId: variantId,
              quantity: 1,
              price: discountedPrice || price,
            },
          ],
        };

        const response = await $api.post("/cart/add/product", cartData);

        if (response.data && response.data.status === 200) {
          showNotification(
            "Mahsulot muvaffaqiyatli savatga qo'shildi!",
            "success"
          );
          syncCartFromResponse(response);
        } else {
          throw new Error("API javobida xatolik");
        }
      }
    } catch (error) {
      console.error("Xatolik:", error);
      showNotification(
        "Savatga qo'shishda xatolik yuz berdi. Qaytadan urinib ko'ring.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVariantAddToCart = async (variantData) => {
    setIsLoading(true);
    const authStatus = checkAuthentication();

    try {
      const localCartProduct = createLocalCartProduct(
        variantData.quantity,
        variantData.variantId
      );
      addCart(localCartProduct, variantData.variantId);

      if (!authStatus) {
        showNotification(
          "Variant savatga qo'shildi! Ro'yxatdan o'ting yoki tizimga kiring.",
          "success"
        );
      } else {
        // Login qilgan foydalanuvchilar uchun FAQAT API
        const apiData = {
          products: [
            {
              productId: variantData.productId,
              variantId: variantData.variantId,
              quantity: variantData.quantity,
              price: variantData.price,
            },
          ],
        };

        const response = await $api.post("/cart/add/product", apiData);

        if (response.data && response.data.status === 200) {
          showNotification(
            "Variant muvaffaqiyatli savatga qo'shildi!",
            "success"
          );
          syncCartFromResponse(response);
        } else {
          throw new Error("API javobida xatolik");
        }
      }
    } catch (error) {
      console.error("Xatolik:", error);
      showNotification(
        "Savatga qo'shishda xatolik yuz berdi. Qaytadan urinib ko'ring.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductClick = () => {
    setCurrentProduct(product);
    router.push(`/product/${id}`);
  };

  const handleMouseMove = (e) => {
    if (!isHovering || imagePool.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const imageIndex = Math.floor((x / width) * imagePool.length);
    const clampedIndex = Math.max(
      0,
      Math.min(imageIndex, imagePool.length - 1)
    );
    setCurrentImageIndex(clampedIndex);
  };

  const handleMouseEnter = () => {
    if (imagePool.length > 1) setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setCurrentImageIndex(0);
  };

  const getCurrentImage = () => {
    return imagePool[currentImageIndex] || imagePool[0] || null;
  };

  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);

  const handleTouchStart = (e) => setTouchStartX(e.targetTouches[0].clientX);
  const handleTouchMove = (e) => setTouchEndX(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    if (imagePool.length <= 1) return;
    const distance = touchStartX - touchEndX;
    if (distance > 50) {
      setCurrentImageIndex((prev) =>
        prev === imagePool.length - 1 ? 0 : prev + 1
      );
    }
    if (distance < -50) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? imagePool.length - 1 : prev - 1
      );
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const displayName = getLocalizedName();
  const currencyText = getCurrencyText();

  return (
    <>
      <div
        className="bg-white rounded-lg shadow-md flex flex-col w-full max-w-[300px] mx-auto relative cursor-pointer hover:shadow-lg transition-shadow h-full min-h-[470px]"
        onClick={handleProductClick}
      >
        {price && discountedPrice && price > discountedPrice && (
          <div className="absolute top-2 left-2 bg-[#249B73] text-white text-xs font-bold px-2 py-1 rounded-lg shadow-md z-20">
            -{Math.round(((price - discountedPrice) / price) * 100)}%
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(product);
          }}
          className={`cursor-pointer absolute top-2 right-2 z-20 transition-colors hover:scale-110 ${
            isLiked ? "text-red-500" : "text-gray-400"
          }`}
        >
          <Heart
            fill={isLiked ? "red" : "none"}
            size={20}
            className="drop-shadow-sm"
          />
        </button>

        <div
          className="relative w-full h-[210px] overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {getCurrentImage() ? (
            <Image
              src={getCurrentImage()}
              alt={displayName}
              className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={() => {
                const current = getCurrentImage();
                if (!current) return;
                setFailedImages((prev) => ({ ...prev, [current]: true }));
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
              {mounted ? t("common.no_image") : ""}
            </div>
          )}

          {imagePool.length > 1 && isHovering && (
            <div className="absolute bottom-1 left-2 right-2 flex gap-1 z-20">
              {imagePool.map((_, index) => (
                <div
                  key={index}
                  className={`flex-1 h-0.5 rounded-full transition-all duration-200 ${
                    index === currentImageIndex ? "bg-[#249B73]" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="min-h-[45px] flex flex-col justify-center px-2 mt-[2px]">
          {price && discountedPrice && price !== discountedPrice ? (
            <>
              <span className="text-gray-400 line-through text-sm">
                {new Intl.NumberFormat("ru-RU").format(price)} {currencyText}
              </span>
              <span className="text-gray-800 font-bold text-lg">
                {new Intl.NumberFormat("ru-RU").format(discountedPrice)}{" "}
                {currencyText}
              </span>
            </>
          ) : (
            <p className="text-lg font-bold text-gray-800">
              {new Intl.NumberFormat("ru-RU").format(price)} {currencyText}
            </p>
          )}
        </div>

        <h3 className="text-gray-800 font-medium px-2 line-clamp-2 min-h-[48px]">
          {displayName}
        </h3>

        <div className="p-2 mt-auto">
          <div className="flex items-center gap-2 text-xs text-gray-700 mb-1">
            <div className="flex items-center gap-1">
              <span className="inline-block w-5 h-5 text-yellow-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 51 48"
                  fill="currentColor"
                >
                  <path d="M25,1 L31,17 H48 L34,28 L39,45 L25,35 L11,45 L16,28 L2,17 H19z" />
                </svg>
              </span>
              <span className="font-medium">
                {rating !== undefined && rating !== null
                  ? rating.toFixed(1)
                  : "0"}
              </span>
            </div>
            <span>•</span>
            <span>
              {reviews_count || 0}
              {mounted ? t("product_card.reviews") : " sharhlar"}
            </span>
          </div>

          <div className="flex items-center justify-between mt-1">
            {isLoading ? (
              <button
                className="w-full flex items-center justify-center gap-2 border border-[#249B73] text-[#249B73] bg-[#f0f8ff] rounded-lg py-2 cursor-not-allowed"
                disabled
              >
                <span className="loader border-2 border-t-[#249B73] rounded-full w-4 h-4 animate-spin" />
                {mounted ? t("product_card.loading") : ""}
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                className="w-[100%] flex cursor-pointer items-center justify-center gap-1 border border-[#249B73] text-[#249B73] hover:bg-[#0d63f50f] rounded-lg py-2 max-[500px]:py-[6px] transition-all duration-300"
                title={mounted ? t("product_card.add_to_cart_tooltip") : ""}
              >
                <ShoppingCart size={18} />
                <span className="font-medium">
                  {mounted
                    ? isSmallScreen
                      ? t("product_card.add_to_cart_too")
                      : t("product_card.add_to_cart")
                    : ""}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <VariantSelectionModal
        isOpen={showVariantModal}
        onClose={() => setShowVariantModal(false)}
        product={product}
        onAddToCart={handleVariantAddToCart}
        currencyText={currencyText}
        isAuthenticated={isAuthenticated}
      />
    </>
  );
}
