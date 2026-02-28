import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const YANDEX_SCRIPT_ID = "yandex-maps-api-script";

const toNum = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
};

const normalizeCoords = (coords) => {
  if (!coords) return null;

  if (typeof coords === "string") {
    const parts = coords.split(",").map((v) => v.trim());
    if (parts.length >= 2) {
      const lat = toNum(parts[0]);
      const lon = toNum(parts[1]);
      if (lat != null && lon != null) return { lat, lon };
    }
  }

  const source = coords?.$ || coords;
  const lat = toNum(source?.lat ?? source?.latitude ?? source?.y ?? source?.Y);
  const lon = toNum(
    source?.lon ?? source?.lng ?? source?.longitude ?? source?.x ?? source?.X
  );
  if (lat != null && lon != null) return { lat, lon };

  return null;
};

const loadYandexMaps = () =>
  new Promise((resolve, reject) => {
    if (window.ymaps) {
      resolve(window.ymaps);
      return;
    }

    const existing = document.getElementById(YANDEX_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.ymaps), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const apiKey = String(import.meta.env.VITE_YANDEX_MAPS_KEY || "").trim();
    if (!apiKey) {
      reject(new Error("VITE_YANDEX_MAPS_KEY yo'q"));
      return;
    }
    const script = document.createElement("script");
    script.id = YANDEX_SCRIPT_ID;
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(
      apiKey
    )}&lang=uz_UZ`;
    script.async = true;
    script.onload = () => resolve(window.ymaps);
    script.onerror = reject;
    document.head.appendChild(script);
  });

export const MapModal = ({ showMap, selectedOrder, setShowMap }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapError, setMapError] = useState("");
  const [hideMapBox, setHideMapBox] = useState(false);

  const coords = useMemo(
    () => normalizeCoords(selectedOrder?.coordinates),
    [selectedOrder?.coordinates]
  );
  const fullAddress = useMemo(
    () =>
      [
        selectedOrder?.qabulQiluvchiShahri,
        selectedOrder?.qabulQiluvchiHududi,
        selectedOrder?.qabulQiluvchiManzili,
        "Uzbekistan",
      ]
        .filter(Boolean)
        .join(", "),
    [
      selectedOrder?.qabulQiluvchiShahri,
      selectedOrder?.qabulQiluvchiHududi,
      selectedOrder?.qabulQiluvchiManzili,
    ]
  );
  const yandexDirectUrl = useMemo(() => {
    if (coords) {
      return `https://yandex.com/maps/?ll=${coords.lon},${coords.lat}&z=16&pt=${coords.lon},${coords.lat},pm2rdm`;
    }
    if (fullAddress) {
      return `https://yandex.com/maps/?text=${encodeURIComponent(fullAddress)}&z=16`;
    }
    return "";
  }, [coords, fullAddress]);

  useEffect(() => {
    if (!showMap || !selectedOrder || !mapRef.current) return;

    let cancelled = false;
    setMapError("");
    setHideMapBox(false);

    const initMap = async () => {
      try {
        const ymaps = await loadYandexMaps();
        if (cancelled) return;

        ymaps.ready(async () => {
          if (cancelled || !mapRef.current) return;

          const map = new ymaps.Map(mapRef.current, {
            center: [41.311081, 69.240562],
            zoom: 12,
            controls: ["zoomControl", "fullscreenControl"],
          });
          mapInstanceRef.current = map;

          const balloonContent = `
            <div>
              <strong>${selectedOrder.qabulQiluvchiKompaniya || "-"}</strong><br>
              ${selectedOrder.qabulQiluvchiManzili || "-"}<br>
              ${selectedOrder.qabulQiluvchiShahri || "-"}<br>
              <small>Buyurtma: ${selectedOrder.buyurtmaRaqami || "-"}</small>
            </div>
          `;

          let target = coords;
          if (!target) {
            if (fullAddress) {
              try {
                const geo = await ymaps.geocode(fullAddress, { results: 1 });
                const first = geo.geoObjects.get(0);
                const pos = first?.geometry?.getCoordinates?.();
                if (Array.isArray(pos) && pos.length === 2) {
                  target = { lat: pos[0], lon: pos[1] };
                }
              } catch {
                target = null;
              }
            }
          }

          if (!target) {
            setMapError("Koordinata topilmadi. Manzil bo'yicha xaritani ochib bo'lmadi.");
            setHideMapBox(true);
            return;
          }

          map.setCenter([target.lat, target.lon], 16);
          const placemark = new ymaps.Placemark(
            [target.lat, target.lon],
            {
              balloonContent,
              hintContent: selectedOrder.qabulQiluvchiKompaniya || "Qabul qiluvchi",
            },
            { preset: "islands#redDeliveryIcon" }
          );
          map.geoObjects.add(placemark);
          placemark.balloon.open();
        });
      } catch {
        setMapError("Yandex xaritasini yuklashda xatolik yuz berdi.");
        setHideMapBox(true);
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [showMap, selectedOrder, coords]);

  if (!showMap || !selectedOrder) return null;

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
        {!hideMapBox && (
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div ref={mapRef} className="w-full h-96" style={{ minHeight: "400px" }} />
          </div>
        )}

        <div className="flex justify-end mt-4 space-x-3">
          <button
            onClick={() => setShowMap(false)}
            className="px-4 cursor-pointer bg-gray-500 text-white hover:bg-gray-600 transition-colors"
          >
            Yopish
          </button>
          <a
            href={yandexDirectUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-4 py-1 text-white transition-colors ${
              yandexDirectUrl
                ? "bg-red-800 hover:bg-red-900"
                : "bg-slate-400 cursor-not-allowed pointer-events-none"
            }`}
          >
            Yandex Maps'da ochish
          </a>
        </div>
      </div>
    </div>
  );
};
