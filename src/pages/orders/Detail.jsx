import React, { useEffect, useState } from "react";
import {
  Package,
  MapPin,
  Phone,
  Building2,
  Calendar,
  Clock,
  CheckCircle,
  Truck,
  User,
} from "lucide-react";
import { useLocation, useParams } from "react-router-dom";
import $api from "../../http/api";

export const OrderDetailPage = () => {
  const { orderno } = useParams();
  const location = useLocation();
  const [orderData, setOrderData] = useState(null);
  const [map, setMap] = useState(null);

  // Sample data based on your API response structure
  useEffect(() => {
    fetchOrder();
  }, [orderno]);

  async function fetchOrder() {
    try {
      const query = new URLSearchParams(location.search);
      const companyId = query.get("companyId");
      const params = companyId ? { companyId } : undefined;
      let { data } = await $api.get(`/emu/get/order-status/${orderno}`, {
        params,
      });
      console.log(data);
      setOrderData(data.data.statusreq.order[0]);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (orderData && orderData.receiver[0].coords[0].$) {
      initializeMap();
    }
  }, [orderData]);

  const initializeMap = () => {
    if (!window.ymaps) {
      const script = document.createElement("script");
      const yandexApiKey = import.meta.env.VITE_YANDEX_MAPS_KEY;
      if (!yandexApiKey) return;
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${yandexApiKey}&lang=ru_RU`;
      script.onload = createMap;
      document.head.appendChild(script);
    } else {
      createMap();
    }
  };

  const createMap = () => {
    if (!orderData) return;

    const coords = orderData.receiver[0].coords[0].$;
    const lat = parseFloat(coords.lat);
    const lon = parseFloat(coords.lon);

    window.ymaps.ready(() => {
      const myMap = new window.ymaps.Map("map", {
        center: [lat, lon],
        zoom: 15,
        controls: ["zoomControl", "fullscreenControl"],
      });

      const placemark = new window.ymaps.Placemark(
        [lat, lon],
        {
          hintContent: "Место доставки",
          balloonContent: `${orderData.receiver[0].address[0]}, ${orderData.receiver[0].town[0]._}`,
        },
        {
          preset: "islands#redDotIcon",
        }
      );

      myMap.geoObjects.add(placemark);
      setMap(myMap);
    });
  };

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "COMPLETE":
        return "bg-[#249B73]";
      case "COURIERDELIVERED":
        return "bg-blue-500";
      case "DELIVERY":
        return "bg-orange-500";
      case "ACCEPTED":
        return "bg-yellow-500";
      case "NEW":
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "COMPLETE":
        return <CheckCircle className="w-5 h-5 text-white" />;
      case "COURIERDELIVERED":
      case "DELIVERY":
        return <Truck className="w-5 h-5 text-white" />;
      default:
        return <Package className="w-5 h-5 text-white" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="  py-8">
        {/* Header */}
        <div className="bg-white shadow-xl mb-8 overflow-hidden">
          <div className="bg-gradient-to-r bg-[#dedede] px-8 py-6">
            <div className="flex items-center justify-between text-black">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Заказ #{orderData.$.orderno}
                </h1>
                <p className="text-lg text-black">AWB: {orderData.$.awb}</p>
              </div>
              <div
                className={`px-6 py-2 ${getStatusColor(
                  orderData.status[0]._
                )} flex items-center gap-2`}
              >
                {getStatusIcon(orderData.status[0]._)}
                <span className="font-semibold text-white">
                  {orderData.status[0].$.title}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Order Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sender & Receiver Info */}
            <div className="bg-white shadow-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <User className="w-6 h-6 text-[#249B73]" />
                  Участники доставки
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6 p-6">
                {/* Sender */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-gray-800 border-b pb-2">
                    Отправитель
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-gray-500 mt-1" />
                      <div>
                        <p className="font-semibold text-gray-800">
                          {orderData.sender[0].company[0]}
                        </p>
                        <p className="text-gray-600">
                          {orderData.sender[0].person[0]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-gray-500" />
                      <p className="text-gray-700">
                        {orderData.sender[0].address[0]},{" "}
                        {orderData.sender[0].town[0]._}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-500" />
                      <p className="text-gray-700">
                        {orderData.sender[0].phone[0]}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Receiver */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-gray-800 border-b pb-2">
                    Получатель
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-500 mt-1" />
                      <div>
                        <p className="font-semibold text-gray-800">
                          {orderData.receiver[0].company[0]}
                        </p>
                        <p className="text-gray-600">
                          {orderData.receiver[0].person[0]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-gray-700">
                          {orderData.receiver[0].address[0]},{" "}
                          {orderData.receiver[0].town[0]._}
                        </p>
                        <p className="text-sm text-gray-500">
                          {orderData.receiver[0].area[0]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-500" />
                      <p className="text-gray-700">
                        {orderData.receiver[0].phone[0]}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-500" />
                      <p className="text-gray-700">
                        Планируемая дата: {orderData.receiver[0].date[0]}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Package Info */}
            <div className="bg-white  shadow-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Package className="w-6 h-6 text-[#249B73]" />
                  Информация о посылке
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6 p-6">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-blue-600 font-medium">Вес</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {orderData.weight[0]} кг
                  </p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-sm text-green-600 font-medium">
                    Количество
                  </p>
                  <p className="text-2xl font-bold text-green-800">
                    {orderData.quantity[0]} шт
                  </p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-sm text-purple-600 font-medium">
                    Стоимость доставки
                  </p>
                  <p className="text-2xl font-bold text-purple-800">
                    {orderData.deliveryprice[0].$.total} сум
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 font-medium mb-2">
                    Содержимое
                  </p>
                  <p className="text-gray-800">Samin - ENERGY PRODUCTS MCHJ</p>
                </div>
              </div>
            </div>

            {/* Status History */}
            <div className="bg-white shadow-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-[#249B73]" />
                  История статусов
                </h2>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {orderData.statushistory[0].status.map((status, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl"
                    >
                      <div
                        className={`w-12 h-12 rounded-full ${getStatusColor(
                          status._
                        )} flex items-center justify-center`}
                      >
                        {getStatusIcon(status._)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">
                          {status.$.title}
                        </h4>
                        <p className="text-gray-600 text-sm">
                          {status.$.eventtown}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-800">
                          {status.$.eventtime.split(" ")[1]}
                        </p>
                        <p className="text-sm text-gray-600">
                          {status.$.eventtime.split(" ")[0]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Delivery Status */}
            <div className="bg-white shadow-lg overflow-hidden">
              <div className="bg-green-50 px-6 py-4 border-b">
                <h2 className="text-xl font-bold text-green-800">
                  Статус доставки
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">Доставлено</p>
                    <p className="text-sm text-gray-600">
                      Получил: {orderData.deliveredto[0]}
                    </p>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      Дата доставки
                    </span>
                  </div>
                  <p className="text-green-700">
                    {orderData.delivereddate[0]} в {orderData.deliveredtime[0]}
                  </p>
                </div>
              </div>
            </div>

            {/* Courier Info */}
            <div className="bg-white  shadow-lg overflow-hidden">
              <div className="bg-blue-50 px-6 py-4 border-b">
                <h2 className="text-xl font-bold text-black">Курьер</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#249B73] rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {orderData.courier[0].name[0]}
                    </p>
                    <p className="text-gray-600">
                      Код: {orderData.courier[0].phone[0]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-3">
                  <Phone className="w-5 h-5 text-[#249B73]" />
                  <span className="font-medium text-[#249B73]">
                    {orderData.courier[0].phone[0]}
                  </span>
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="bg-white shadow-lg overflow-hidden">
              <div className=" px-6 py-4 border-b">
                <h2 className="text-xl font-bold text-black flex items-center gap-2">
                  <MapPin className="w-6 h-6" />
                  Место доставки
                </h2>
              </div>
              <div className="p-6">
                <div
                  id="map"
                  className="w-full h-64 rounded-lg bg-gray-100 flex items-center justify-center"
                >
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Загрузка карты...</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {/* {orderData.receiver[0].address[0]},{" "} */}
                      {orderData.receiver[0].town[0]._}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-white shadow-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b">
                <h2 className="text-xl font-bold text-gray-800">
                  Детали заказа
                </h2>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Номер заказа</span>
                  <span className="font-semibold text-gray-800">
                    #{orderData.$.orderno}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Код заказа</span>
                  <span className="font-semibold text-gray-800">
                    {orderData.$.ordercode}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Внутренний код</span>
                  <span className="font-semibold text-gray-800">
                    {orderData.$.givencode}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Трек-номер</span>
                  <span className="font-semibold text-[#249B73]">
                    {orderData.$.awb}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
