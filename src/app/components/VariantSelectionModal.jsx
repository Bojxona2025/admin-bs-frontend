import React, { useState, useEffect } from "react";
import { X, ShoppingCart, Plus, Minus } from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { getImageUrl } from "../utils/imageHelper";

const VariantSelectionModal = ({
  isOpen,
  onClose,
  product,
  onAddToCart,
  currencyText = "so'm",
  isAuthenticated = false,
}) => {
  const { t } = useTranslation();
  const [selectedVariants, setSelectedVariants] = useState(new Set());
  const [quantities, setQuantities] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [addMode, setAddMode] = useState("single");
  const [failedImages, setFailedImages] = useState({});

  useEffect(() => {
    setMounted(true);

    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (product?.variants) {
        const initialQuantities = {};
        product.variants.forEach((variant) => {
          initialQuantities[variant._id] = 1;
        });
        setQuantities(initialQuantities);
        setSelectedVariants(new Set());
        setAddMode("single");
        setFailedImages({});
      }
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, product]);

  if (!mounted || !isOpen || !product) return null;

  const handleVariantSelect = (variant) => {
    if (addMode === "single") {
      setSelectedVariants(new Set([variant._id]));
    } else {
      const newSelected = new Set(selectedVariants);
      if (newSelected.has(variant._id)) {
        newSelected.delete(variant._id);
      } else {
        newSelected.add(variant._id);
      }
      setSelectedVariants(newSelected);
    }
  };

  const handleAddToCart = async () => {
    if (selectedVariants.size === 0) return;

    setIsLoading(true);

    try {
      const selectedVariantIds = Array.from(selectedVariants);

      const productId = product.id || product._id;

      if (addMode === "single" && selectedVariantIds.length === 1) {
        const variant = product.variants.find(
          (v) => v._id === selectedVariantIds[0]
        );
        const cartData = {
          productId,
          variantId: variant._id,
          quantity: quantities[variant._id] || 1,
          price: variant.discountedPrice || variant.price,
        };
        await onAddToCart(cartData);
      } else {
        for (const variantId of selectedVariantIds) {
          const variant = product.variants.find((v) => v._id === variantId);
          const cartData = {
            productId,
            variantId: variant._id,
            quantity: quantities[variant._id] || 1,
            price: variant.discountedPrice || variant.price,
          };
          await onAddToCart(cartData);
        }
      }

      onClose();
    } catch (error) {
      console.error("Error adding to cart:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityChange = (variantId, type) => {
    setQuantities((prev) => {
      const currentQuantity = prev[variantId] || 1;
      const variant = product.variants.find((v) => v._id === variantId);
      const maxStock = variant?.stockQuantity || 0;

      if (type === "increment") {
        if (currentQuantity >= maxStock) {
          if (typeof window !== "undefined" && window.toast) {
            window.toast(
              `Omborda faqat ${maxStock} ta mahsulot mavjud`,
              "warning"
            );
          }
          return prev;
        }
        return { ...prev, [variantId]: currentQuantity + 1 };
      } else if (type === "decrement" && currentQuantity > 1) {
        return { ...prev, [variantId]: currentQuantity - 1 };
      }
      return prev;
    });
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const calculateTotalPrice = () => {
    let total = 0;
    selectedVariants.forEach((variantId) => {
      const variant = product.variants.find((v) => v._id === variantId);
      if (variant) {
        const price = variant.discountedPrice || variant.price;
        const quantity = quantities[variantId] || 1;
        total += price * quantity;
      }
    });
    return total;
  };

  const totalPrice = calculateTotalPrice();
  const productImage = getImageUrl(product.image || product.mainImage);

  const modalContent = (
    <>
      {/* Background */}
      <div
        className={`fixed inset-0 bg-black z-[9998] transition-opacity duration-300 flex flex-col items-center justify-center ${
          isOpen ? "opacity-30" : "opacity-0"
        }`}
        onClick={handleBackdropClick}
      />

      {/* Modal */}
      <div
        className={`fixed inset-x-0 bottom-20 z-[9999] max-[700px]:px-4 overflow-y-auto flex justify-center items-center transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-white rounded-t-2xl w-[600px] mx-auto shadow-2xl h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-800">
              {t("variant.select")}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 cursor-pointer rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Product Info */}
          <div className="p-4 border-b flex-shrink-0">
            <div className="flex items-start gap-3 mb-3">
              {productImage && !failedImages.productMain ? (
                <img
                  src={productImage}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="w-16 h-16 object-cover rounded-lg"
                  onError={() =>
                    setFailedImages((prev) => ({ ...prev, productMain: true }))
                  }
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-100 text-gray-500 text-xs flex items-center justify-center">
                  {t("common.no_image")}
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-medium text-gray-800 mb-1">
                  {product.name}
                </h4>
                <p className="text-sm text-gray-600">{product.description}</p>
              </div>
            </div>

            <div className="mb-3 text-xs text-gray-500">
              {isAuthenticated ? t("variant.saved_account") : ""}
            </div>

            <div className="flex gap-2 mb-2">
              <button
                onClick={() => {
                  setAddMode("single");
                  if (selectedVariants.size > 1) {
                    const firstSelected = Array.from(selectedVariants)[0];
                    setSelectedVariants(new Set([firstSelected]));
                  }
                }}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  addMode === "single"
                    ? "bg-[#249B73] text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {t("variant.single")}
              </button>
              <button
                onClick={() => setAddMode("multiple")}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  addMode === "multiple"
                    ? "bg-[#249B73] text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {t("variant.multiple")}
              </button>
            </div>

            {addMode === "multiple" && (
              <p className="text-xs text-gray-600">
                {t("variant.multiple_hint")}
              </p>
            )}
          </div>

          <div className="px-4 py-6 flex-1 overflow-y-auto min-h-[120px]">
            <p className="text-sm font-medium text-gray-700 mb-3">
              {t("variant.available")} ({selectedVariants.size}{" "}
              {t("variant.selected")}):
            </p>
            <div className="space-y-2">
              {product.variants?.map((variant) => {
                const isSelected = selectedVariants.has(variant._id);
                return (
                  <div
                    key={variant._id}
                    onClick={() => handleVariantSelect(variant)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#249B73] bg-[#249B73]/5 ring-2 ring-[#249B73]/20"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {addMode === "multiple" && (
                          <div
                            className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                              isSelected
                                ? "bg-[#249B73] border-[#249B73]"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                        )}

                        {(() => {
                          const variantImage = getImageUrl(variant.mainImg);
                          const variantKey = `variant_${variant._id}`;
                          const isFailed = failedImages[variantKey];

                          if (!variantImage || isFailed) {
                            return (
                              <div className="w-12 h-12 rounded bg-gray-100 text-gray-500 text-[10px] flex items-center justify-center">
                                {t("common.no_image")}
                              </div>
                            );
                          }

                          return (
                            <img
                              src={variantImage}
                              alt={variant.name || "Variant"}
                              loading="lazy"
                              decoding="async"
                              className="w-12 h-12 object-cover rounded"
                              onError={() =>
                                setFailedImages((prev) => ({
                                  ...prev,
                                  [variantKey]: true,
                                }))
                              }
                            />
                          );
                        })()}
                        <div>
                          <p className="font-medium text-gray-800">
                            {variant.name || "Standard"}
                          </p>
                          {variant.color && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span>{t("variant.color")}:</span>
                              <div
                                className="w-5 h-5 rounded-full border-2 border-gray-300 shadow-sm"
                                style={{ backgroundColor: variant.color }}
                              />
                            </div>
                          )}
                          {variant.size && (
                            <p className="text-sm text-gray-600">
                              {t("variant.size")}: {variant.size}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {variant.discountedPrice &&
                        variant.discountedPrice < variant.price ? (
                          <div>
                            <p className="text-sm text-gray-400 line-through">
                              {new Intl.NumberFormat("ru-RU").format(
                                variant.price
                              )}
                              {currencyText}
                            </p>
                            <p className="font-semibold text-[#249B73]">
                              {new Intl.NumberFormat("ru-RU").format(
                                variant.discountedPrice
                              )}
                              {currencyText}
                            </p>
                          </div>
                        ) : (
                          <p className="font-semibold text-gray-800">
                            {new Intl.NumberFormat("ru-RU").format(
                              variant.price
                            )}
                            {currencyText}
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-center gap-4">
                          <span className="text-sm font-medium text-gray-700">
                            {t("variant.quantity")}:
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(variant._id, "decrement");
                              }}
                              className="w-8 h-8 rounded-full cursor-pointer border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={(quantities[variant._id] || 1) <= 1}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="bg-[#249B73] text-white text-lg font-semibold min-w-[2.5rem] text-center px-3 py-1 rounded-lg">
                              {quantities[variant._id] || 1}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(variant._id, "increment");
                              }}
                              disabled={
                                (quantities[variant._id] || 1) >=
                                (variant.stockQuantity || 0)
                              }
                              className="w-8 h-8 rounded-full cursor-pointer border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex-shrink-0">
            {selectedVariants.size > 0 && (
              <div className="mb-3 p-2 bg-white rounded-lg border">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {t("variant.total")} ({selectedVariants.size}{" "}
                    {t("variant.selected")}):
                  </span>
                  <span className="text-lg font-bold text-[#249B73]">
                    {new Intl.NumberFormat("ru-RU").format(totalPrice)}
                    {currencyText}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleAddToCart}
              disabled={selectedVariants.size === 0 || isLoading}
              className={`w-full py-3 rounded-lg font-medium cursor-pointer flex items-center justify-center gap-2 transition-all transform ${
                selectedVariants.size > 0 && !isLoading
                  ? "bg-[#249B73] text-white hover:bg-[#1e8660] hover:scale-[1.02] shadow-lg"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShoppingCart size={18} />
                  <span>
                    {selectedVariants.size > 1
                      ? t("variant.add_multiple", {
                          count: selectedVariants.size,
                        })
                      : t("variant.add_single")}
                  </span>
                </>
              )}
            </button>

            {!isAuthenticated && (
              <p className="text-xs text-gray-500 text-center mt-2">
                {t("variant.login_hint")}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default VariantSelectionModal;
