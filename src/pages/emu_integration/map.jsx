import { X } from "lucide-react";
import { useEffect } from "react";

export const MapModal = ({ showMap, selectedOrder, setShowMap}) => {
  if (!showMap || !selectedOrder || !selectedOrder.coordinates) return null;

  const { lat, lon } = selectedOrder.coordinates;

  useEffect(() => {
    if (showMap && selectedOrder && selectedOrder.coordinates) {
      // Load Yandex Maps API if not already loaded
      if (!window.ymaps) {
        const script = document.createElement("script");
        script.src = "https://api-maps.yandex.ru/2.1/?apikey=&lang=uz_UZ";
        script.onload = () => {
          initMap();
        };
        document.head.appendChild(script);
      } else {
        initMap();
      }
    }
  }, [showMap, selectedOrder]);

  const initMap = () => {
    window.ymaps.ready(() => {
      const map = new window.ymaps.Map("yandex-map", {
        center: [parseFloat(lat), parseFloat(lon)],
        zoom: 16,
        controls: ["zoomControl", "fullscreenControl"],
      });

      // Add placemark for delivery location
      const placemark = new window.ymaps.Placemark(
        [parseFloat(lat), parseFloat(lon)],
        {
          balloonContent: `
            <div>
              <strong>${selectedOrder.qabulQiluvchiKompaniya}</strong><br>
              ${selectedOrder.qabulQiluvchiManzili}<br>
              ${selectedOrder.qabulQiluvchiShahri}<br>
              <small>Buyurtma: ${selectedOrder.buyurtmaRaqami}</small>
            </div>
          `,
          hintContent: selectedOrder.qabulQiluvchiKompaniya,
        },
        {
          preset: "islands#redDeliveryIcon",
        }
      );

      map.geoObjects.add(placemark);

      // Open balloon by default
      placemark.balloon.open();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Buyurtma joylashuvi: {selectedOrder.buyurtmaRaqami}
          </h3>
          <button
            onClick={() => setShowMap(false)}
            className="text-gray-500 cursor-pointer hover:text-gray-700 text-2xl leading-none"
          >
            <X/>
          </button>
        </div>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p>
                <strong>Qabul qiluvchi:</strong>{" "}
                {selectedOrder.qabulQiluvchiKompaniya}
              </p>
              <p>
                <strong>Aloqa shaxsi:</strong>{" "}
                {selectedOrder.qabulQiluvchiAloqaShaxsi}
              </p>
              <p>
                <strong>Telefon:</strong> {selectedOrder.qabulQiluvchiTelefoni}
              </p>
            </div>
            <div>
              <p>
                <strong>Manzil:</strong> {selectedOrder.qabulQiluvchiManzili}
              </p>
              <p>
                <strong>Shahar:</strong> {selectedOrder.qabulQiluvchiShahri}
              </p>
              <p>
                <strong>Holat:</strong> {selectedOrder.holat}
              </p>
            </div>
          </div>
        </div>

        {/* Yandex Map Container */}
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <div
            id="yandex-map"
            className="w-full h-96"
            style={{ minHeight: "400px" }}
          />
        </div>

        <div className="flex justify-end mt-4 space-x-3">
          <button
            onClick={() => setShowMap(false)}
            className="px-4 cursor-pointer bg-gray-500 text-white hover:bg-gray-600 transition-colors"
          >
            Yopish
          </button>
          <a
            href={`https://yandex.com/maps/?ll=${lon},${lat}&z=16&pt=${lon},${lat},pm2rdm`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-1 bg-red-800 text-white  hover:bg-red-900 transition-colors"
          >
            Yandex Maps'da ochish
          </a>
        </div>
      </div>
    </div>
  );
};
