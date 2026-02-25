import { useEffect, useState } from "react";

const MapComponent = ({
  pickupPoints,
  selectedPickupPoint,
  onPointSelect,
  defaultCenter = [41.2995, 69.2401],
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState(null);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !window.ymaps &&
      !window.yandexMapScriptLoading
    ) {
      window.yandexMapScriptLoading = true;

      const script = document.createElement("script");
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=34e24493-97db-455c-82a9-d2f9e245d389&lang=uz_UZ`;
      script.onload = () => {
        window.yandexMapScriptLoading = false;
        if (window.ymaps) {
          window.ymaps.ready(() => {
            setMapLoaded(true);
          });
        }
      };
      script.onerror = () => {
        window.yandexMapScriptLoading = false;
      };
      document.head.appendChild(script);
    } else if (window.ymaps && !window.yandexMapScriptLoading) {
      window.ymaps.ready(() => {
        setMapLoaded(true);
      });
    }
  }, []);

  useEffect(() => {
    if (mapLoaded && pickupPoints.length > 0) {
      initializeMap();
    }
  }, [mapLoaded, pickupPoints, selectedPickupPoint]);

  const initializeMap = () => {
    const mapContainer = document.getElementById("yandex-map");
    if (!mapContainer || !window.ymaps) return;

    if (map) {
      map.destroy();
    }

    const newMap = new window.ymaps.Map("yandex-map", {
      center:
        pickupPoints.length > 0
          ? [
              parseFloat(pickupPoints[0].latitude[0]),
              parseFloat(pickupPoints[0].longitude[0]),
            ]
          : defaultCenter,
      zoom: pickupPoints.length > 1 ? 6 : 12,
      controls: ["zoomControl", "fullscreenControl", "geolocationControl"],
    });

    const clusterer = new window.ymaps.Clusterer({
      preset: "islands#invertedDarkGreenClusterIcons",
      groupByCoordinates: false,
      clusterDisableClickZoom: false,
      clusterHideIconOnBalloonOpen: false,
      geoObjectHideIconOnBalloonOpen: false,
      clusterBalloonContentLayout: "cluster#balloonCarousel",
      clusterBalloonItemContentLayout:
        window.ymaps.templateLayoutFactory.createClass(
          '<div style="padding: 8px;">' +
            '<h4 style="margin: 0 0 5px 0; font-weight: bold;">{{ properties.balloonContentHeader }}</h4>' +
            '<p style="margin: 0; color: #666;">{{ properties.balloonContentBody }}</p>' +
            "</div>"
        ),
      clusterBalloonPanelMaxMapArea: 0,
      clusterBalloonContentLayoutWidth: 200,
      clusterBalloonContentLayoutHeight: 130,
      clusterBalloonPagerSize: 5,
      gridSize: 128,
    });

    const placemarks = pickupPoints.map((point, index) => {
      const placemark = new window.ymaps.Placemark(
        [parseFloat(point.latitude[0]), parseFloat(point.longitude[0])],
        {
          balloonContentHeader: point.name[0],
          balloonContentBody: `${point.address[0]}<br/>Tel: ${point.phone[0]}`,
          balloonContentFooter: "BS Market topshirish punkti",
          clusterCaption: point.name[0],
          hintContent: point.name[0],
        },
        {
          preset:
            selectedPickupPoint?.code[0] === point.code[0]
              ? "islands#greenDotIcon"
              : "islands#blueDotIcon",
          iconColor:
            selectedPickupPoint?.code[0] === point.code[0]
              ? "#4870f4"
              : "#22c55e",
        }
      );

      placemark.events.add("click", () => {
        onPointSelect(point);
        updateMarkerStyles(clusterer, point.code[0]);
      });

      return placemark;
    });

    clusterer.add(placemarks);
    newMap.geoObjects.add(clusterer);

    if (pickupPoints.length > 1) {
      newMap.setBounds(clusterer.getBounds(), {
        checkZoomRange: true,
        zoomMargin: [20, 20, 20, 20],
      });
    }

    setMap(newMap);
  };

  const updateMarkerStyles = (clusterer, selectedCode) => {
    clusterer.getGeoObjects().forEach((placemark) => {
      const point = pickupPoints.find(
        (p) =>
          parseFloat(p.latitude[0]) ===
            placemark.geometry.getCoordinates()[0] &&
          parseFloat(p.longitude[0]) === placemark.geometry.getCoordinates()[1]
      );

      if (point) {
        const isSelected = point.code[0] === selectedCode;
        placemark.options.set({
          preset: isSelected ? "islands#greenDotIcon" : "islands#blueDotIcon",
          iconColor: isSelected ? "#22c55e" : "#22c55e",
        });
      }
    });
  };

  useEffect(() => {
    return () => {
      if (map) {
        map.destroy();
      }
    };
  }, [map]);

  return (
    <div className="mb-6">
      <h4 className="font-semibold text-gray-800 mb-3">Xaritada ko'rish</h4>
      <div
        id="yandex-map"
        className="w-full h-80 rounded-lg border border-gray-300"
        style={{ position: "relative" }}
      >
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
            <div className="text-gray-600">Xarita yuklanmoqda...</div>
          </div>
        )}
      </div>
      {selectedPickupPoint && (
        <div className="mt-3 p-3 bg-green-50 rounded-lg">
          <div className="font-medium text-gray-800">
            Tanlangan: {selectedPickupPoint.name[0]}
          </div>
          <div className="text-sm text-gray-600">
            {selectedPickupPoint.address[0]}
          </div>
          <div className="text-sm text-gray-600">
            Tel: {selectedPickupPoint.phone[0]}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
