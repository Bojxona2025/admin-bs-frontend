"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function OrderSummary({
  total,
  deliveryInfo,
  loadingDelivery,
  totalWithDelivery,
  checkedItems,
  selectedRegion,
  selectedPickupPoint,
  formatPrice,
  getVariantData,
  onSubmit,
}) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitClick = async () => {
    if (!selectedRegion || !selectedPickupPoint || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateDiscount = () => {
    return checkedItems.reduce((acc, item) => {
      const variantData = getVariantData(item);
      if (variantData.originalPrice && variantData.price) {
        const originalPrice = parseFloat(
          variantData.originalPrice.toString().replace(/[^\d.-]/g, "") || 0
        );
        const currentPrice = parseFloat(
          variantData.price.toString().replace(/[^\d.-]/g, "") || 0
        );
        return acc + (originalPrice - currentPrice) * item.quantity;
      }
      return acc;
    }, 0);
  };

  const discount = calculateDiscount();

  return (
    <div className="lg:col-span-1">
      <div className="bg-white rounded-lg shadow-lg p-6 sticky top-45">
        <h3 className="text-lg font-semibold mb-4">
          {t("orderSummary.title")}
        </h3>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-gray-600">
            <span>
              {t("orderSummary.items")} ({checkedItems.length})
            </span>
            <span>
              {formatPrice(total)} {t("orderSummary.currency")}
            </span>
          </div>

          <div className="flex justify-between text-gray-600">
            <span>{t("orderSummary.delivery")}</span>
            <span>
              {loadingDelivery ? (
                <div className="flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-[#249B73] border-t-transparent rounded-full mr-2"></div>
                  {t("orderSummary.calculating")}
                </div>
              ) : deliveryInfo ? (
                `${formatPrice(deliveryInfo.price)} ${t(
                  "orderSummary.currency"
                )}`
              ) : (
                `0 ${t("orderSummary.currency")}`
              )}
            </span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>{t("orderSummary.discounts")}</span>
              <span>
                -{formatPrice(discount)} {t("orderSummary.currency")}
              </span>
            </div>
          )}

          <hr className="border-gray-200" />

          <div className="flex justify-between text-xl font-bold text-gray-800">
            <span>{t("orderSummary.total")}</span>
            <span className="text-[#249B73]">
              {formatPrice(totalWithDelivery)} {t("orderSummary.currency")}
            </span>
          </div>
        </div>

        <button
          onClick={handleSubmitClick}
          disabled={
            !selectedRegion ||
            !selectedPickupPoint ||
            isSubmitting ||
            loadingDelivery
          }
          className={`w-full py-4 cursor-pointer rounded-lg font-medium text-lg transition-all duration-200 ${
            selectedRegion &&
            selectedPickupPoint &&
            !isSubmitting &&
            !loadingDelivery
              ? "bg-[#249B73] text-white hover:bg-[#1e8660] hover:shadow-lg transform hover:-translate-y-0.5"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              {t("orderSummary.submitting")}
            </div>
          ) : (
            t("orderSummary.submit")
          )}
        </button>

        {(!selectedRegion || !selectedPickupPoint) && (
          <div className="text-sm text-red-500 mt-2 text-center">
            {!selectedRegion && t("orderSummary.selectRegion")}
            {!selectedRegion &&
              !selectedPickupPoint &&
              " " + t("orderSummary.and") + " "}
            {!selectedPickupPoint && t("orderSummary.selectPickupPoint")}
          </div>
        )}
      </div>
    </div>
  );
}
