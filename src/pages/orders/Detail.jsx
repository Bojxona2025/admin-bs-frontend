import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  Package,
  Phone,
  Truck,
  User,
} from "lucide-react";
import { useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import emuApi from "../../api/emu.api";

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
};

const first = (value) => (Array.isArray(value) ? value[0] : value);

const asText = (value, fallback = "-") => {
  const v = first(value);
  if (v == null) return fallback;
  if (typeof v === "object") {
    if (typeof v._ === "string" && v._.trim()) return v._;
    if (typeof v.name === "string" && v.name.trim()) return v.name;
    return fallback;
  }
  const text = String(v).trim();
  return text || fallback;
};

const toStrictNumber = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
};

const parseCoords = (...candidates) => {
  for (const candidate of candidates) {
    const source = first(candidate)?.$ || first(candidate) || candidate?.$ || candidate;
    const lat = toStrictNumber(source?.lat);
    const lon = toStrictNumber(source?.lon);
    if (lat != null && lon != null) return { lat, lon };
  }
  return null;
};

const RU_UZ_MAP = new Map([
  ["Новый", "Yangi"],
  ["Планируется отправка", "Jo'natish rejalashtirilgan"],
  ["Отправлено со склада", "Ombordan jo'natildi"],
  ["Получен складом", "Ombor tomonidan qabul qilindi"],
  ["Готов к выдаче", "Topshirishga tayyor"],
  ["Выдан курьеру на доставку", "Kuryerga yetkazish uchun berildi"],
  ["Доставлен (предварительно)", "Dastlabki holatda yetkazildi"],
  ["Доставлен", "Yetkazildi"],
  ["Частично со слов курьера", "Kuryer ma'lumoti bo'yicha qisman"],
  ["Курьер вернул на склад", "Kuryer omborga qaytardi"],
  ["Не доставлен (Возврат/Отмена)", "Yetkazilmadi (qaytish/bekor)"],
  ["Ташкент", "Toshkent"],
]);

const CYRILLIC_RE = /[А-Яа-яЁё]/;
const CYRILLIC_TO_LATIN = {
  А: "A", а: "a", Б: "B", б: "b", В: "V", в: "v", Г: "G", г: "g",
  Д: "D", д: "d", Е: "E", е: "e", Ё: "Yo", ё: "yo", Ж: "J", ж: "j",
  З: "Z", з: "z", И: "I", и: "i", Й: "Y", й: "y", К: "K", к: "k",
  Л: "L", л: "l", М: "M", м: "m", Н: "N", н: "n", О: "O", о: "o",
  П: "P", п: "p", Р: "R", р: "r", С: "S", с: "s", Т: "T", т: "t",
  У: "U", у: "u", Ф: "F", ф: "f", Х: "X", х: "x", Ц: "Ts", ц: "ts",
  Ч: "Ch", ч: "ch", Ш: "Sh", ш: "sh", Щ: "Sh", щ: "sh", Ъ: "", ъ: "",
  Ы: "I", ы: "i", Ь: "", ь: "", Э: "E", э: "e", Ю: "Yu", ю: "yu",
  Я: "Ya", я: "ya",
};

const transliterateCyrillic = (text) =>
  String(text)
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");

const autoTranslateRuToUz = (value) => {
  const text = String(value || "").trim();
  if (!text) return text;
  const mapped = RU_UZ_MAP.get(text);
  if (mapped) return mapped;
  if (CYRILLIC_RE.test(text)) return transliterateCyrillic(text);
  return text;
};

const getStatusColor = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "COMPLETE") return "bg-emerald-600";
  if (s === "CANCELED") return "bg-rose-600";
  if (s === "COURIERDELIVERED") return "bg-blue-500";
  if (s === "DELIVERY") return "bg-orange-500";
  if (s === "ACCEPTED") return "bg-amber-500";
  if (s === "NEW") return "bg-slate-500";
  return "bg-slate-400";
};

const getStatusIcon = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "COMPLETE") return <CheckCircle className="w-5 h-5 text-white" />;
  if (s === "COURIERDELIVERED" || s === "DELIVERY") {
    return <Truck className="w-5 h-5 text-white" />;
  }
  return <Package className="w-5 h-5 text-white" />;
};

const hasValue = (value) => {
  const text = String(value ?? "").trim();
  return text !== "" && text !== "-";
};

const pickFirstOrder = (payload) => {
  const candidates = [
    payload?.data?.statusreq?.order,
    payload?.data?.order,
    payload?.order,
    payload?.statusreq?.order,
    payload?.json?.statusreq?.order,
    payload?.json?.order,
  ];
  for (const candidate of candidates) {
    const list = toArray(candidate).filter(Boolean);
    if (list.length) return list[0];
  }
  return null;
};

export const OrderDetailPage = () => {
  const { orderno } = useParams();
  const location = useLocation();
  const { user } = useSelector((state) => state.user);
  const actorRole = String(user?.role || "").toLowerCase().replace(/[_\s]/g, "");
  const isSuperAdmin = actorRole === "superadmin";
  const actorCompanyId = String(user?.companyId?._id || user?.companyId || "");

  const [orderData, setOrderData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [mapLoadState, setMapLoadState] = useState("idle");
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const fetchOrder = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const query = new URLSearchParams(location.search);
        const fromQuery = query.get("companyId");
        const payload = await emuApi.getOrderStatus(orderno, {
          role: actorRole,
          actorCompanyId,
          companyId: isSuperAdmin ? fromQuery || undefined : undefined,
        });
        const parsedOrder = pickFirstOrder(payload);
        if (!parsedOrder) {
          if (!cancelled) {
            setOrderData(null);
            setLoadError("Buyurtma topilmadi yoki noto'g'ri formatda keldi");
          }
          return;
        }
        if (!cancelled) setOrderData(parsedOrder);
      } catch (error) {
        if (!cancelled) {
          setOrderData(null);
          setLoadError(error?.response?.data?.message || "Buyurtmani olishda xatolik");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchOrder();
    return () => {
      cancelled = true;
    };
  }, [orderno, location.search, isSuperAdmin, actorCompanyId, actorRole]);

  useEffect(() => {
    if (!isLoading) return () => {};
    const timer = setTimeout(() => {
      setIsLoading(false);
      setLoadError((prev) => prev || "Server javobi kutilganidan uzoq davom etdi");
    }, 15000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const normalized = useMemo(() => {
    if (!orderData) return null;

    const sender = first(orderData.sender) || {};
    const receiver = first(orderData.receiver) || {};
    const statusNode = first(orderData.status) || orderData.status || {};
    const courier = first(orderData.courier) || {};
    const statusHistoryRaw = first(orderData.statushistory)?.status || orderData.statushistory?.status;
    const history = toArray(statusHistoryRaw).map((item) => ({
      code: asText(item?._, "-"),
      title: autoTranslateRuToUz(asText(item?.$?.title || item?._, "-")),
      town: autoTranslateRuToUz(asText(item?.$?.eventtown, "-")),
      time: asText(item?.$?.eventtime, "-"),
    }));

    const coords = parseCoords(receiver?.coords, orderData.currcoords);

    return {
      orderNo: asText(orderData?.$?.orderno || orderData?.orderno || orderData?.orderNo),
      awb: asText(orderData?.$?.awb || orderData?.barcode),
      orderCode: asText(orderData?.$?.ordercode),
      givenCode: asText(orderData?.$?.givencode),
      statusCode: asText(statusNode?._ || orderData?.currentStatus),
      statusTitle: autoTranslateRuToUz(
        asText(statusNode?.$?.title || statusNode?._ || orderData?.currentStatus)
      ),

      senderCompany: asText(sender?.company),
      senderPerson: autoTranslateRuToUz(asText(sender?.person)),
      senderTown: autoTranslateRuToUz(
        asText(first(sender?.town)?._ || sender?.town?._ || sender?.town)
      ),
      senderAddress: autoTranslateRuToUz(asText(sender?.address)),
      senderPhone: asText(sender?.phone),

      receiverCompany: autoTranslateRuToUz(asText(receiver?.company)),
      receiverPerson: autoTranslateRuToUz(asText(receiver?.person)),
      receiverTown: autoTranslateRuToUz(
        asText(first(receiver?.town)?._ || receiver?.town?._ || receiver?.town)
      ),
      receiverArea: autoTranslateRuToUz(asText(receiver?.area, "")),
      receiverAddress: autoTranslateRuToUz(asText(receiver?.address)),
      receiverPhone: asText(receiver?.phone),
      receiverDate: asText(receiver?.date),

      weight: asText(orderData?.weight),
      quantity: asText(orderData?.quantity),
      deliveryPrice: asText(
        first(orderData?.deliveryprice)?.$?.total || orderData?.deliveryprice?.$?.total || orderData?.price
      ),
      deliveredTo: autoTranslateRuToUz(asText(orderData?.deliveredto)),
      deliveredDate: asText(orderData?.delivereddate),
      deliveredTime: asText(orderData?.deliveredtime),

      courierName: autoTranslateRuToUz(asText(courier?.name)),
      courierPhone: asText(courier?.phone),

      history,
      coords,
    };
  }, [orderData]);

  useEffect(() => {
    if (!normalized?.coords || !mapRef.current) return;

    let cancelled = false;
    const { lat, lon } = normalized.coords;
    setMapLoadState("loading");

    const createMap = () => {
      if (cancelled || !window.ymaps || !mapRef.current) return;
      window.ymaps.ready(() => {
        if (cancelled || !mapRef.current) return;
        const map = new window.ymaps.Map(mapRef.current, {
          center: [lat, lon],
          zoom: 15,
          controls: ["zoomControl", "fullscreenControl"],
        });
        mapInstanceRef.current = map;

        const placemark = new window.ymaps.Placemark(
          [lat, lon],
          {
            hintContent: "Yetkazib berish manzili",
            balloonContent: `${normalized.receiverAddress}, ${normalized.receiverTown}`,
          },
          { preset: "islands#redDotIcon" }
        );
        map.geoObjects.add(placemark);
        setMapLoadState("ready");
      });
    };

    if (!window.ymaps) {
      const yandexApiKey = String(import.meta.env.VITE_YANDEX_MAPS_KEY || "").trim();
      if (!yandexApiKey) {
        setMapLoadState("error");
        return;
      }
      const script = document.createElement("script");
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(
        yandexApiKey
      )}&lang=uz_UZ`;
      script.async = true;
      script.onload = createMap;
      script.onerror = () => {
        if (!cancelled) setMapLoadState("error");
      };
      document.head.appendChild(script);
    } else {
      createMap();
    }

    const failSafeTimer = setTimeout(() => {
      if (!cancelled) {
        setMapLoadState((prev) => (prev === "ready" ? prev : "error"));
      }
    }, 12000);

    return () => {
      cancelled = true;
      clearTimeout(failSafeTimer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [normalized]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!normalized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
          {loadError || "Buyurtma ma'lumotini ochib bo'lmadi"}
        </div>
      </div>
    );
  }

  const hasCourier = hasValue(normalized.courierName) || hasValue(normalized.courierPhone);
  const hasMap = Boolean(normalized.coords);
  const isMapReady = mapLoadState === "ready";
  const isMapLoading = mapLoadState === "loading" || mapLoadState === "idle";
  const showMapCard = hasMap && mapLoadState !== "error";

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/30 to-white">
      <div className="py-6">
        <div className="bg-white border border-emerald-100 shadow-sm mb-6 overflow-hidden rounded-2xl">
          <div className="bg-gradient-to-r from-emerald-50 to-white px-6 py-5">
            <div className="flex items-center justify-between text-slate-900">
              <div>
                <h1 className="text-3xl font-bold mb-1">Buyurtma #{normalized.orderNo}</h1>
                <p className="text-base text-slate-700">AWB: {normalized.awb}</p>
              </div>
              <div
                className={`px-4 py-2 rounded-xl ${getStatusColor(
                  normalized.statusCode
                )} flex items-center gap-2`}
              >
                {getStatusIcon(normalized.statusCode)}
                <span className="font-semibold text-white">{normalized.statusTitle}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-emerald-100 shadow-sm overflow-hidden rounded-2xl">
              <div className="bg-emerald-50/60 px-6 py-4 border-b border-emerald-100">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <User className="w-6 h-6 text-[#249B73]" />
                  Yetkazib berish ishtirokchilari
                </h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6 p-6">
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-slate-800 border-b border-emerald-100 pb-2">Yuboruvchi</h3>
                  {hasValue(normalized.senderCompany) && <p>{normalized.senderCompany}</p>}
                  {hasValue(normalized.senderPerson) && <p>{normalized.senderPerson}</p>}
                  {(hasValue(normalized.senderAddress) || hasValue(normalized.senderTown)) && (
                    <p>
                      {normalized.senderAddress}
                      {hasValue(normalized.senderTown) ? `, ${normalized.senderTown}` : ""}
                    </p>
                  )}
                  {hasValue(normalized.senderPhone) && <p>{normalized.senderPhone}</p>}
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-slate-800 border-b border-emerald-100 pb-2">Qabul qiluvchi</h3>
                  {hasValue(normalized.receiverCompany) && <p>{normalized.receiverCompany}</p>}
                  {hasValue(normalized.receiverPerson) && <p>{normalized.receiverPerson}</p>}
                  {(hasValue(normalized.receiverAddress) || hasValue(normalized.receiverTown)) && (
                    <p>
                      {normalized.receiverAddress}
                      {hasValue(normalized.receiverTown) ? `, ${normalized.receiverTown}` : ""}
                    </p>
                  )}
                  {normalized.receiverArea ? <p>{normalized.receiverArea}</p> : null}
                  {hasValue(normalized.receiverPhone) && <p>{normalized.receiverPhone}</p>}
                  {hasValue(normalized.receiverDate) && <p>Reja sana: {normalized.receiverDate}</p>}
                </div>
              </div>
            </div>

            <div className="bg-white border border-emerald-100 shadow-sm overflow-hidden rounded-2xl">
              <div className="bg-emerald-50/60 px-6 py-4 border-b border-emerald-100">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-[#249B73]" />
                  Holatlar tarixi
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {normalized.history.length ? (
                  normalized.history.map((item, idx) => (
                    <div key={`${item.code}-${idx}`} className="flex items-center gap-4 p-4 bg-emerald-50/40 rounded-xl border border-emerald-100">
                      <div className={`w-10 h-10 rounded-full ${getStatusColor(item.code)} flex items-center justify-center`}>
                        {getStatusIcon(item.code)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{item.title}</p>
                        <p className="text-sm text-slate-600">{item.town}</p>
                      </div>
                      <p className="text-sm text-slate-700">{item.time}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Tarix mavjud emas</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {hasCourier && (
              <div className="bg-white border border-emerald-100 shadow-sm overflow-hidden rounded-2xl">
                <div className="bg-emerald-50/60 px-6 py-4 border-b border-emerald-100">
                  <h2 className="text-xl font-bold text-slate-900">Kuryer</h2>
                </div>
                <div className="p-6">
                  {hasValue(normalized.courierName) && (
                    <p className="font-semibold text-slate-800">{normalized.courierName}</p>
                  )}
                  {hasValue(normalized.courierPhone) && (
                    <p className="text-[#249B73]">{normalized.courierPhone}</p>
                  )}
                </div>
              </div>
            )}

            {showMapCard && (
              <div className="bg-white border border-emerald-100 shadow-sm overflow-hidden rounded-2xl">
                <div className="px-6 py-4 border-b border-emerald-100 bg-emerald-50/60">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-6 h-6" />
                    Yetkazib berish xaritasi
                  </h2>
                </div>
                <div className="p-6">
                  <div className="relative">
                    <div ref={mapRef} className="w-full h-64 rounded-lg bg-gray-100" />
                    {!isMapReady && (
                      <div className="absolute inset-0 rounded-lg border border-emerald-200 bg-emerald-50/90 px-4 py-4 text-sm text-emerald-800 flex items-center justify-center text-center">
                        {isMapLoading ? "Xarita yuklanmoqda..." : "Xarita yuklanmadi. Keyinroq qayta urinib ko'ring."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white border border-emerald-100 shadow-sm overflow-hidden rounded-2xl">
              <div className="bg-emerald-50/60 px-6 py-4 border-b border-emerald-100">
                <h2 className="text-xl font-bold text-slate-800">Buyurtma tafsilotlari</h2>
              </div>
              <div className="p-6 space-y-2 text-sm">
                <p>Buyurtma: #{normalized.orderNo}</p>
                <p>Kod: {normalized.orderCode}</p>
                <p>Ichki kod: {normalized.givenCode}</p>
                <p>Vazn: {normalized.weight} kg</p>
                <p>Soni: {normalized.quantity}</p>
                <p>Yetkazish narxi: {normalized.deliveryPrice}</p>
                {hasValue(normalized.deliveredTo) && <p>Qabul qilgan: {normalized.deliveredTo}</p>}
                {hasValue(normalized.deliveredDate) && (
                  <p>
                    Yetkazilgan sana: {normalized.deliveredDate}
                    {hasValue(normalized.deliveredTime) ? ` ${normalized.deliveredTime}` : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
