import { useState } from "react";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import MapComponent from "../../components/MapComponent";

export default function PickupPoints({
  regions,
  selectedRegion,
  pickupPoints,
  allPickupPoints,
  selectedPickupPoint,
  loadingPickupPoints,
  regionsLoading,
  deliveryInfo,
  loadingDelivery,
  deliveryError,
  onRegionChange,
  onPickupPointSelect,
  formatPrice,
  userProfile,
}) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const POINTS_PER_PAGE = 5;

  const getDisplayedPickupPoints = () => {
    const selectedRegionData = regions.find(
      (region) => region.code[0] === selectedRegion
    );

    if (selectedRegionData?.name[0] === "UZBEKISTAN") {
      return showAll
        ? allPickupPoints
        : allPickupPoints.slice(0, POINTS_PER_PAGE);
    }

    return allPickupPoints;
  };

  const shouldShowPagination = () => {
    const selectedRegionData = regions.find(
      (region) => region.code[0] === selectedRegion
    );
    return (
      selectedRegionData?.name[0] === "UZBEKISTAN" &&
      allPickupPoints.length > POINTS_PER_PAGE
    );
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6 mb-8 max-[720px]:p-2">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">
        {t("pickupPoints.title")}
      </h2>

      <div className="bg-white rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">
          {t("pickupPoints.selectRegion")}
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="inline w-4 h-4 mr-1" />
            {t("pickupPoints.region")}
          </label>
          <select
            value={selectedRegion}
            onChange={onRegionChange}
            className="w-full cursor-pointer p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
            disabled={regionsLoading}
          >
            <option value="" disabled>
              {regionsLoading
                ? t("pickupPoints.loadingRegions")
                : t("pickupPoints.chooseRegion")}
            </option>
            {regions.map((region) => (
              <option key={region.code[0]} value={region.code[0]}>
                {region.name[0]}
              </option>
            ))}
          </select>
        </div>

        {selectedRegion && (
          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-3">
              {t("pickupPoints.choosePickup")}
            </h4>

            {loadingPickupPoints ? (
              <div className="text-center py-4">
                <span className="text-gray-600">
                  {t("pickupPoints.loadingPickup")}
                </span>
              </div>
            ) : allPickupPoints.length > 0 ? (
              <>
                <div className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-2">
                  {getDisplayedPickupPoints().map((point) => (
                    <div
                      key={point.code[0]}
                      onClick={() => onPickupPointSelect(point)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPickupPoint?.code[0] === point.code[0]
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-green-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 mt-1 ${
                            selectedPickupPoint?.code[0] === point.code[0]
                              ? "border-green-500 bg-green-500"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedPickupPoint?.code[0] === point.code[0] && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-[#249B73] mt-1">
                            {point.name[0]}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {point.address[0]}
                          </div>
                          <div className="text-sm text-gray-600">
                            Tel: {point.phone[0]}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {point.town[0].$.regionname}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {shouldShowPagination() && (
                  <div className="text-center">
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="bg-[#249B73] text-white px-6 py-2 rounded-lg hover:bg-[#249B73] transition-colors"
                    >
                      {showAll
                        ? t("pickupPoints.showLess")
                        : t("pickupPoints.showMore", {
                            count: allPickupPoints.length - POINTS_PER_PAGE,
                          })}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-gray-600">
                {t("pickupPoints.noPickup")}
              </div>
            )}
          </div>
        )}

        {selectedPickupPoint && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-800 mb-2">
              {t("pickupPoints.deliveryInfo")}
            </h4>
            {loadingDelivery ? (
              <div className="text-center py-2">
                <span className="text-gray-600">
                  {t("pickupPoints.calculating")}
                </span>
              </div>
            ) : deliveryError ? (
              <div className="text-red-600 text-sm">{deliveryError}</div>
            ) : deliveryInfo ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {t("pickupPoints.deliveryPrice")}
                  </span>
                  <span className="font-semibold text-[#249B73]">
                    {formatPrice(deliveryInfo.price)} so'm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {t("pickupPoints.totalWeight")}
                  </span>
                  <span>{deliveryInfo.weight} kg</span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {selectedRegion && (
          <MapComponent
            pickupPoints={pickupPoints}
            selectedPickupPoint={selectedPickupPoint}
            onPointSelect={onPickupPointSelect}
          />
        )}
      </div>

      <div className="bg-white rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-600">👤</span>
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-800">
              {t("pickupPoints.recipient")}
            </div>
            <div className="text-gray-600">
              {userProfile
                ? `${userProfile.firstName} ${userProfile.lastName}`
                : t("pickupPoints.unknown")}
            </div>
            <div className="text-gray-600">
              {userProfile
                ? userProfile.phoneNumber
                : t("pickupPoints.noPhone")}
            </div>
          </div>
          <button className="text-[#249B73] cursor-pointer hover:text-[#249B73]">
            →
          </button>
        </div>
      </div>
    </div>
  );
}
