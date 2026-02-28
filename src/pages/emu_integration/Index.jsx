import $api from "../../http/api";
import emuApi from "../../api/emu.api";
import { MapModal } from "./map";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Map,
  Eye,
  X,
  Plus,
  Settings2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

// Add Yandex Maps script to head if not already present
if (!document.querySelector('script[src*="api-maps.yandex.ru"]')) {
  const yandexApiKey = import.meta.env.VITE_YANDEX_MAPS_KEY;
  if (yandexApiKey) {
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${yandexApiKey}&lang=uz_UZ`;
    script.async = true;
    document.head.appendChild(script);
  }
}

const EMU_TABLE_COLUMNS = [
  { key: "buyurtmaRaqami", label: "Buyurtma raqami", width: "min-w-[180px]" },
  { key: "yuboruvchiShahri", label: "Yuboruvchi shahri", width: "min-w-[150px]" },
  { key: "hisobFakturaRaqami", label: "Hisob-faktura raqami", width: "min-w-[190px]" },
  { key: "buyurtmaSanasi", label: "Buyurtma sanasi", width: "min-w-[160px]" },
  { key: "zaborVaqti", label: "Zabor vaqti", width: "min-w-[120px]" },
  { key: "zaborVaqtiGacha", label: "Zabor vaqti gacha", width: "min-w-[160px]" },
  {
    key: "qabulQiluvchiKompaniya",
    label: "Qabul qiluvchi kompaniya",
    width: "min-w-[220px]",
  },
  {
    key: "qabulQiluvchiAloqaShaxsi",
    label: "Qabul qiluvchining aloqa shaxsi",
    width: "min-w-[220px]",
  },
  {
    key: "qabulQiluvchiShahri",
    label: "Qabul qiluvchi shahri",
    width: "min-w-[170px]",
  },
  {
    key: "qabulQiluvchiManzili",
    label: "Qabul qiluvchining manzili",
    width: "min-w-[260px]",
  },
  {
    key: "qabulQiluvchiTelefoni",
    label: "Qabul qiluvchining telefoni",
    width: "min-w-[180px]",
  },
  { key: "holat", label: "Holat", width: "min-w-[150px]" },
  { key: "vazni", label: "Vazni (kg)", width: "min-w-[110px]" },
  {
    key: "etkazibBerishNarxi",
    label: "Yetkazib berish narxi",
    width: "min-w-[180px]",
  },
  { key: "actions", label: "Amallar", width: "min-w-[120px]" },
];

const getColumnsStorageKey = (source) => `emu-table-visible-columns:v2:${source}`;

export const EmuIntegrationPage = ({ source = "local" }) => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user);
  const actorRole = String(user?.role || "").toLowerCase().replace(/[_\s]/g, "");
  const isSuperAdmin = actorRole === "superadmin";
  const isLiveSource = source === "live";
  const actorCompanyId = String(user?.companyId?._id || user?.companyId || "");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [emuOrdersData, setEmuOrdersData] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({
    totalOrders: 0,
    totalStatusSummary: {},
    companies: [],
  });
  const [emuMeta, setEmuMeta] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [filterParams, setFilterParams] = useState({
    client: "Пусто",
    datefrom: "",
    dateto: "",
    limit: isLiveSource ? 500 : 100,
    companyId: "",
    sync: false,
  });
  const [showFilter, setShowFilter] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [regionOptions, setRegionOptions] = useState([]);
  const [pvzOptions, setPvzOptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingPvz, setLoadingPvz] = useState(false);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [pricePreview, setPricePreview] = useState(null);
  const [pvzMapReady, setPvzMapReady] = useState(false);
  const [pvzMapError, setPvzMapError] = useState("");
  const pvzMapRef = useRef(null);
  const pvzMapInstanceRef = useRef(null);
  const tableScrollRef = useRef(null);
  const tableDragRef = useRef({
    isDragging: false,
    startX: 0,
    startScrollLeft: 0,
  });
  const productFetchSeqRef = useRef(0);
  const columnSettingsRef = useRef(null);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(() => {
    const defaultKeys = EMU_TABLE_COLUMNS.filter((column) => column.key !== "actions").map(
      (column) => column.key
    );
    try {
      const saved = localStorage.getItem(getColumnsStorageKey(source));
      if (!saved) return defaultKeys;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return defaultKeys;
      const normalized = parsed.filter((key) =>
        EMU_TABLE_COLUMNS.some((column) => column.key === key && key !== "actions")
      );
      return normalized.length ? normalized : defaultKeys;
    } catch {
      return defaultKeys;
    }
  });
  const [orderForm, setOrderForm] = useState({
    companyId: "",
    senderTown: "Ташкент",
    senderAddress: "",
    senderPerson: "",
    senderPhone: "",
    receiverRegion: "",
    receiverTown: "",
    receiverAddress: "",
    receiverPerson: "",
    receiverPhone: "",
    receiverCompany: "",
    receiverPvzCode: "",
    productId: "",
    variantId: "",
    productQuantity: 1,
    weight: 1,
    service: "1",
    payType: "CASH",
    instruction: "",
    enclosure: "",
  });

  const toStrictNumber = (value) => {
    if (value == null) return null;
    const text = String(value).trim();
    if (!text) return null;
    const num = Number(text);
    return Number.isFinite(num) ? num : null;
  };

  const pickText = (value) => {
    if (Array.isArray(value)) return pickText(value[0]);
    if (value == null) return "";
    if (typeof value === "object") {
      if (value?._ != null) return String(value._).trim();
      return "";
    }
    return String(value).trim();
  };

  const getValidCoords = (...candidates) => {
    for (const candidate of candidates) {
      const source = candidate?.$ || candidate;
      const latRaw = source?.lat ?? source?.latitude ?? source?.y ?? source?.Y;
      const lonRaw = source?.lon ?? source?.lng ?? source?.longitude ?? source?.x ?? source?.X;
      const lat = toStrictNumber(latRaw);
      const lon = toStrictNumber(lonRaw);
      if (lat != null && lon != null) {
        return { lat, lon };
      }
    }
    return null;
  };

  const getStatusMeta = (rawStatus) => {
    const value = (rawStatus || "").toString().trim();
    const normalized = value.toLowerCase();

    if (normalized.includes("created") || normalized.includes("создан")) {
      return {
        label: "Yangi",
        group: "new",
        tone: "bg-sky-50 text-sky-700 border-sky-200",
      };
    }

    if (
      normalized.includes("доставлен") ||
      normalized.includes("yetkaz") ||
      normalized.includes("complete") ||
      normalized.includes("completed") ||
      normalized === "done"
    ) {
      return {
        label: "Yetkazib berilgan",
        group: "delivered",
        tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }

    if (normalized.includes("нов") || normalized === "new") {
      return {
        label: "Yangi",
        group: "new",
        tone: "bg-sky-50 text-sky-700 border-sky-200",
      };
    }

    if (
      normalized.includes("accepted") ||
      normalized.includes("pickupready") ||
      normalized.includes("delivery") ||
      normalized.includes("departure") ||
      normalized.includes("departuring") ||
      normalized.includes("courierdelivered")
    ) {
      return {
        label: "Jarayonda",
        group: "processing",
        tone: "bg-amber-50 text-amber-700 border-amber-200",
      };
    }

    if (
      normalized.includes("возврат") ||
      normalized.includes("отмена") ||
      normalized.includes("cancel") ||
      normalized.includes("не достав") ||
      normalized.includes("failed")
    ) {
      return {
        label: "Bekor qilingan",
        group: "failed",
        tone: "bg-rose-50 text-rose-700 border-rose-200",
      };
    }

    if (normalized.includes("соглас") || normalized.includes("не удалось")) {
      return {
        label: "Kelishuv bo'lmadi",
        group: "failed",
        tone: "bg-orange-50 text-orange-700 border-orange-200",
      };
    }

    if (
      normalized.includes("обработ") ||
      normalized.includes("jarayon") ||
      normalized.includes("processing")
    ) {
      return {
        label: "Jarayonda",
        group: "processing",
        tone: "bg-amber-50 text-amber-700 border-amber-200",
      };
    }

    return {
      label: value || "Noma'lum",
      group: "unknown",
      tone: "bg-slate-100 text-slate-700 border-slate-200",
    };
  };

  const getStatusDescriptionUz = (rawStatus) => {
    const normalized = String(rawStatus || "").toLowerCase().trim();
    if (!normalized) return "Holat ma'lumoti kelmagan";
    if (normalized.includes("complete") || normalized.includes("completed")) {
      return "Buyurtma muvaffaqiyatli yakunlangan";
    }
    if (normalized.includes("cancel")) {
      return "Buyurtma bekor qilingan";
    }
    if (normalized.includes("failed")) {
      return "Buyurtma muvaffaqiyatsiz yakunlangan";
    }
    if (normalized.includes("processing") || normalized.includes("обработ")) {
      return "Buyurtma jarayonda";
    }
    if (normalized.includes("new") || normalized.includes("нов")) {
      return "Yangi buyurtma";
    }
    return String(rawStatus || "Holat ma'lumoti kelmagan");
  };

  const parsePvzCoords = (point) => {
    if (!point) return null;
    const source =
      point?.coords?.[0]?.$ ||
      point?.coords?.$ ||
      point?.coords?.[0] ||
      point?.coords ||
      point;
    const lat = toStrictNumber(
      source?.lat ?? source?.latitude ?? source?.y ?? source?.Y
    );
    const lon = toStrictNumber(
      source?.lon ?? source?.lng ?? source?.longitude ?? source?.x ?? source?.X
    );
    if (lat == null || lon == null) return null;
    return { lat, lon };
  };

  const selectedProduct = useMemo(
    () => products.find((p) => String(p?._id) === String(orderForm.productId)),
    [products, orderForm.productId]
  );
  const selectedVariant = useMemo(
    () =>
      (selectedProduct?.variants || []).find(
        (v) => String(v?._id) === String(orderForm.variantId)
      ) || null,
    [selectedProduct, orderForm.variantId]
  );

  const pvzWithCoords = useMemo(
    () =>
      (pvzOptions || [])
        .map((point) => ({ point, coords: parsePvzCoords(point) }))
        .filter((item) => item.coords),
    [pvzOptions]
  );

  const visibleColumns = useMemo(
    () =>
      EMU_TABLE_COLUMNS.filter(
        (column) => column.key === "actions" || visibleColumnKeys.includes(column.key)
      ),
    [visibleColumnKeys]
  );

  const columnPickerColumns = useMemo(
    () => EMU_TABLE_COLUMNS.filter((column) => column.key !== "actions"),
    []
  );

  useEffect(() => {
    if (isSuperAdmin) {
      fetchCompanies();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isLiveSource && !isSuperAdmin) {
      navigate("/emu/integration", { replace: true });
    }
  }, [isLiveSource, isSuperAdmin, navigate]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!columnSettingsRef.current) return;
      if (!columnSettingsRef.current.contains(event.target)) {
        setShowColumnSettings(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        getColumnsStorageKey(source),
        JSON.stringify(visibleColumnKeys)
      );
    } catch {
      // no-op
    }
  }, [visibleColumnKeys, source]);

  useEffect(() => {
    const defaultKeys = EMU_TABLE_COLUMNS.filter((column) => column.key !== "actions").map(
      (column) => column.key
    );
    try {
      const saved = localStorage.getItem(getColumnsStorageKey(source));
      if (!saved) {
        setVisibleColumnKeys(defaultKeys);
        return;
      }
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) {
        setVisibleColumnKeys(defaultKeys);
        return;
      }
      const normalized = parsed.filter((key) =>
        EMU_TABLE_COLUMNS.some((column) => column.key === key && key !== "actions")
      );
      setVisibleColumnKeys(normalized.length ? normalized : defaultKeys);
    } catch {
      setVisibleColumnKeys(defaultKeys);
    }
  }, [source]);

  useEffect(() => {
    if (isSuperAdmin) return;
    setOrderForm((prev) => ({
      ...prev,
      companyId: "",
    }));
  }, [isSuperAdmin]);

  async function fetchCompanies() {
    try {
      const { data: payload } = await $api.get("/company/all", {
        params: {
          page: 1,
          limit: 100,
        },
      });
      const list = payload?.data || payload?.companies || [];
      setCompanies(list);
    } catch {
      setCompanies([]);
    }
  }

  async function fetchRegions() {
    setLoadingRegions(true);
    try {
      const data = await emuApi.getRegions();
      const regions = data?.json?.regionlist?.city || data?.data?.regionlist?.city || [];
      setRegionOptions(Array.isArray(regions) ? regions : []);
    } catch {
      setRegionOptions([]);
    } finally {
      setLoadingRegions(false);
    }
  }

  async function fetchProducts(selectedCompanyId = orderForm.companyId) {
    const reqId = ++productFetchSeqRef.current;
    setLoadingProducts(true);
    try {
      if (isSuperAdmin && !selectedCompanyId) {
        if (reqId === productFetchSeqRef.current) setProducts([]);
        return;
      }

      const effectiveCompanyId = isSuperAdmin
        ? String(selectedCompanyId || "")
        : String(actorCompanyId || "");
      const params = { page: 1, limit: 100 };
      if (effectiveCompanyId) {
        params.companyId = effectiveCompanyId;
      }
      const { data: payload } = await $api.get("/products/get/query", { params });
      const list =
        payload?.results ||
        payload?.productData ||
        payload?.products ||
        payload?.data?.results ||
        payload?.data?.productData ||
        payload?.data?.products ||
        payload?.data ||
        [];
      const parsedList = Array.isArray(list) ? list : [];
      const scopedList = effectiveCompanyId
        ? parsedList.filter(
            (item) =>
              String(item?.companyId?._id || item?.companyId || "") ===
              String(effectiveCompanyId)
          )
        : parsedList;

      if (reqId === productFetchSeqRef.current) {
        setProducts(scopedList);
      }
    } catch {
      if (reqId === productFetchSeqRef.current) {
        setProducts([]);
      }
    } finally {
      if (reqId === productFetchSeqRef.current) {
        setLoadingProducts(false);
      }
    }
  }

  const parsePvzList = (payload) =>
    payload?.data?.pvzlist?.pvz || payload?.json?.pvzlist?.pvz || payload?.pvz || payload?.data || [];

  async function fetchPvzByRegion(regionName) {
    if (!regionName) {
      setPvzOptions([]);
      return;
    }
    setLoadingPvz(true);
    try {
      const payload =
        String(regionName) === "UZBEKISTAN"
          ? await emuApi.getUzbekistanPvz({ page: 1, limit: 200 })
          : await emuApi.getPvz({ region: regionName });
      const list = parsePvzList(payload);
      setPvzOptions(Array.isArray(list) ? list : []);
    } catch {
      setPvzOptions([]);
    } finally {
      setLoadingPvz(false);
    }
  }

  async function fetchOrders() {
    try {
      const data = await (isLiveSource ? emuApi.getOrdersLive : emuApi.getOrders)(
        {
          done:
            isLiveSource && filterParams.client === "Пусто"
              ? undefined
              : filterParams.client,
          datefrom: filterParams.datefrom,
          dateto: filterParams.dateto,
          limit: filterParams.limit,
          companyId: filterParams.companyId,
          sync: filterParams.sync,
        },
        { role: actorRole, actorCompanyId }
      );
      setEmuOrdersData(Array.isArray(data?.orders) ? data.orders : []);
      setEmuMeta(data?.emuMeta || null);
      if (isLiveSource) {
        setAnalyticsData({
          totalOrders: Number(data?.totalOrders || data?.orders?.length || 0),
          totalStatusSummary: data?.statusSummary || {},
          companies: [],
        });
      } else {
        setAnalyticsData((prev) => ({
          ...prev,
          totalOrders: Number(data?.totalOrders || 0),
          totalStatusSummary: data?.statusSummary || {},
        }));
      }
    } catch (error) {
      setEmuOrdersData([]);
      setEmuMeta(null);
    }
  }

  async function fetchAnalytics() {
    try {
      const data = await emuApi.getOrdersAnalytics(
        {
          done: filterParams.client,
          datefrom: filterParams.datefrom,
          dateto: filterParams.dateto,
          limit: filterParams.limit,
          companyId: filterParams.companyId,
        },
        { role: actorRole, actorCompanyId }
      );

      setAnalyticsData({
        totalOrders: Number(data?.totalOrders || 0),
        totalStatusSummary: data?.totalStatusSummary || {},
        companies: Array.isArray(data?.companies) ? data.companies : [],
      });
    } catch {
      setAnalyticsData({
        totalOrders: 0,
        totalStatusSummary: {},
        companies: [],
      });
    }
  }

  useEffect(() => {
    fetchOrders();
    if (!isLiveSource) {
      fetchAnalytics();
    }
  }, [actorRole, actorCompanyId, isLiveSource]);

  useEffect(() => {
    if (!showCreateOrder) return;
    fetchRegions();
    if (!isSuperAdmin) {
      fetchProducts(orderForm.companyId);
    }
    setCreateError("");
    setCreateSuccess("");
    setPricePreview(null);
  }, [showCreateOrder, isSuperAdmin]);

  useEffect(() => {
    if (!showCreateOrder || !isSuperAdmin) return;
    fetchProducts(orderForm.companyId);
  }, [showCreateOrder, isSuperAdmin, orderForm.companyId]);

  useEffect(() => {
    if (!showCreateOrder || !pvzMapRef.current) return;
    if (!pvzWithCoords.length) {
      setPvzMapReady(false);
      setPvzMapError("");
      if (pvzMapInstanceRef.current) {
        pvzMapInstanceRef.current.destroy();
        pvzMapInstanceRef.current = null;
      }
      return;
    }

    let cancelled = false;
    setPvzMapReady(false);
    setPvzMapError("");

    const initMap = () => {
      if (cancelled || !window.ymaps || !pvzMapRef.current) return;
      window.ymaps.ready(() => {
        if (cancelled || !pvzMapRef.current) return;

        if (pvzMapInstanceRef.current) {
          pvzMapInstanceRef.current.destroy();
          pvzMapInstanceRef.current = null;
        }

        const firstCoords = pvzWithCoords[0].coords;
        const map = new window.ymaps.Map(pvzMapRef.current, {
          center: [firstCoords.lat, firstCoords.lon],
          zoom: 9,
          controls: ["zoomControl"],
        });
        pvzMapInstanceRef.current = map;

        const bounds = [];
        pvzWithCoords.forEach(({ point, coords }) => {
          const code = String(point?.code?.[0] || "");
          const town = point?.town?.[0]?._ || "PVZ";
          const address = point?.address?.[0] || "";
          const isSelected = String(orderForm.receiverPvzCode || "") === code;

          const placemark = new window.ymaps.Placemark(
            [coords.lat, coords.lon],
            {
              hintContent: `${town} (${code})`,
              balloonContent: `${town}<br/>${address}`,
            },
            { preset: isSelected ? "islands#greenIcon" : "islands#blueIcon" }
          );
          placemark.events.add("click", () => handlePvzSelect(code));
          bounds.push([coords.lat, coords.lon]);
          map.geoObjects.add(placemark);
        });

        if (bounds.length > 1) {
          map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 30 });
        } else {
          map.setCenter([firstCoords.lat, firstCoords.lon], 12);
        }

        setPvzMapReady(true);
      });
    };

    if (!window.ymaps) {
      const key = String(import.meta.env.VITE_YANDEX_MAPS_KEY || "").trim();
      if (!key) {
        setPvzMapError("Yandex API kaliti topilmadi");
        return;
      }
      const existing = document.querySelector('script[src*="api-maps.yandex.ru"]');
      if (existing) {
        existing.addEventListener("load", initMap, { once: true });
      } else {
        const script = document.createElement("script");
        script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(
          key
        )}&lang=uz_UZ`;
        script.async = true;
        script.onload = initMap;
        script.onerror = () => setPvzMapError("Xaritani yuklab bo'lmadi");
        document.head.appendChild(script);
      }
    } else {
      initMap();
    }

    return () => {
      cancelled = true;
    };
  }, [showCreateOrder, pvzWithCoords, orderForm.receiverPvzCode]);

  // Transform backend data to display format
  const transformedData = emuOrdersData.map((order, idx) => {
    const parsedOrderRaw = order?.emuResponseParsed?.statusreq?.order;
    const parsedOrder = Array.isArray(parsedOrderRaw)
      ? parsedOrderRaw[0] || {}
      : parsedOrderRaw || {};
    const sender = order?.sender?.[0] || order?.sender || {};
    const receiver = order?.receiver?.[0] || order?.receiver || {};
    const parsedSender = parsedOrder?.sender?.[0] || parsedOrder?.sender || {};
    const parsedReceiver = parsedOrder?.receiver?.[0] || parsedOrder?.receiver || {};
    const senderResolved = {
      ...parsedSender,
      ...sender,
    };
    const receiverResolved = {
      ...parsedReceiver,
      ...receiver,
    };
    const senderTown = pickText(sender?.town);
    const receiverTown = pickText(receiver?.town);
    const senderTownResolved = pickText(senderResolved?.town);
    const receiverTownResolved = pickText(receiverResolved?.town);
    const receiverCoords = getValidCoords(
      receiver?.coords?.[0]?.$ || receiver?.coords?.$ || receiver?.coords,
      parsedReceiver?.coords?.[0]?.$ || parsedReceiver?.coords?.$ || parsedReceiver?.coords,
      order?.currcoords?.$ || order?.currcoords,
      parsedOrder?.currcoords?.$ || parsedOrder?.currcoords
    );
    const statusObj = order?.status?.[0] || order?.status || {};
    const parsedStatusObj = parsedOrder?.status?.[0] || parsedOrder?.status || {};
    const statusTitle =
      statusObj?.$?.title ||
      parsedStatusObj?.$?.title ||
      statusObj?._ ||
      parsedStatusObj?._ ||
      order?.status ||
      "";
    const orderNo =
      order?.orderNo ||
      order?.orderno ||
      parsedOrder?.orderno ||
      parsedOrder?.$?.orderno ||
      order?.$?.orderno ||
      parsedOrder?.$?.awb ||
      order?.$?.awb ||
      "";

    return {
      id: order?._id || orderNo || String(idx),
      buyurtmaRaqami: orderNo,
      yuboruvchiShahri: senderTown || senderTownResolved || order?.senderTown || "",
      hisobFakturaRaqami:
        order?.barcode || parsedOrder?.barcode || order?.$?.awb || parsedOrder?.$?.awb || orderNo,
      buyurtmaSanasi: pickText(sender?.date) || pickText(parsedSender?.date) || order?.createdAt || "",
      zaborVaqti:
        pickText(receiver?.time_min) ||
        pickText(parsedReceiver?.time_min) ||
        "",
      zaborVaqtiGacha:
        pickText(receiver?.time_max) ||
        pickText(parsedReceiver?.time_max) ||
        "",
      qabulQiluvchiKompaniya:
        pickText(receiver?.company) ||
        pickText(parsedReceiver?.company) ||
        "",
      qabulQiluvchiAloqaShaxsi:
        pickText(receiver?.person) ||
        pickText(parsedReceiver?.person) ||
        "",
      qabulQiluvchiShahri: receiverTown || receiverTownResolved || order?.receiverTown || "",
      qabulQiluvchiHududi:
        pickText(receiver?.area) || pickText(parsedReceiver?.area) || "",
      qabulQiluvchiManzili:
        pickText(receiver?.address) ||
        pickText(parsedReceiver?.address) ||
        "",
      qabulQiluvchiTelefoni:
        pickText(receiver?.phone) ||
        pickText(parsedReceiver?.phone) ||
        "",
      holat: statusTitle || order?.currentStatus || "",
      etkazibBerishHaqiqiySanasi: order.delivereddate || parsedOrder?.delivereddate || "",
      etkazibBerishMalumoti: order.deliveredto || parsedOrder?.deliveredto || "",
      haqiqiyEtkazibBerishVaqti: order.deliveredtime || parsedOrder?.deliveredtime || "",
      ustamaTolov: order.inshprice || parsedOrder?.inshprice || "0",
      vazni: order.weight || parsedOrder?.weight || "0",
      etkazibBerishNarxi: order.price || parsedOrder?.price || "0",
      jonatmalarTuri: order.type || parsedOrder?.type || "",
      yuboruvchiKompaniya:
        pickText(sender?.company) || pickText(parsedSender?.company) || "",
      yuboruvchiISHO:
        pickText(sender?.person) || pickText(parsedSender?.person) || "",
      yuboruvchiManzili:
        pickText(sender?.address) ||
        pickText(parsedSender?.address) ||
        "",
      shtrixKod: order.barcode || parsedOrder?.barcode || "",
      yuboruvchiTelefoni:
        pickText(sender?.phone) || pickText(parsedSender?.phone) || "",
      tavsif: order.instruction || parsedOrder?.instruction || "",
      topshiriq: order.enclosure || parsedOrder?.enclosure || "",
      etkazibBerishRejimi: order.service || parsedOrder?.service || "",
      elonQilinganQiymat: order.deliveryprice?.$?.total || parsedOrder?.deliveryprice?.$?.total || "0",
      joylarSoni: order.quantity || parsedOrder?.quantity || "0",
      etkazibBerishRejaSanasi:
        pickText(receiver?.date) || pickText(parsedReceiver?.date) || "",
      coordinates: receiverCoords,
    };
  });

  const statusStats = transformedData.reduce(
    (acc, order) => {
      const meta = getStatusMeta(order.holat);
      if (meta.group === "new") acc.newCount += 1;
      if (meta.group === "processing") acc.processingCount += 1;
      if (meta.group === "delivered") acc.deliveredCount += 1;
      return acc;
    },
    { newCount: 0, processingCount: 0, deliveredCount: 0 }
  );

  // Filter data based on search term
  const filteredData = transformedData.filter((item) =>
    Object.values(item).some((value) =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);
  const currentPageIds = currentData.map((item) => item.id);
  const isAllCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedOrderIds.includes(id));

  const toggleSelectAllCurrentPage = () => {
    setSelectedOrderIds((prev) => {
      if (isAllCurrentPageSelected) {
        return prev.filter((id) => !currentPageIds.includes(id));
      }
      const merged = new Set([...prev, ...currentPageIds]);
      return Array.from(merged);
    });
  };

  const toggleSelectOrder = (id) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleColumn = (columnKey) => {
    setVisibleColumnKeys((prev) => {
      if (prev.includes(columnKey)) {
        if (prev.length <= 1) return prev;
        return prev.filter((key) => key !== columnKey);
      }
      return [...prev, columnKey];
    });
  };

  const showAllColumns = () => {
    setVisibleColumnKeys(columnPickerColumns.map((column) => column.key));
  };

  const resetColumnsToDefault = () => {
    setVisibleColumnKeys(
      EMU_TABLE_COLUMNS.filter((column) => column.key !== "actions").map((column) => column.key)
    );
  };

  const handleTableMouseDown = (event) => {
    const container = tableScrollRef.current;
    if (!container) return;
    tableDragRef.current = {
      isDragging: true,
      startX: event.pageX - container.offsetLeft,
      startScrollLeft: container.scrollLeft,
    };
    container.classList.add("cursor-grabbing");
  };

  const handleTableMouseLeave = () => {
    const container = tableScrollRef.current;
    tableDragRef.current.isDragging = false;
    container?.classList.remove("cursor-grabbing");
  };

  const handleTableMouseUp = () => {
    const container = tableScrollRef.current;
    tableDragRef.current.isDragging = false;
    container?.classList.remove("cursor-grabbing");
  };

  const handleTableMouseMove = (event) => {
    const container = tableScrollRef.current;
    if (!container || !tableDragRef.current.isDragging) return;
    event.preventDefault();
    const x = event.pageX - container.offsetLeft;
    const walk = x - tableDragRef.current.startX;
    container.scrollLeft = tableDragRef.current.startScrollLeft - walk;
  };

  useEffect(() => {
    setSelectedOrderIds([]);
  }, [currentPage, searchTerm, filterParams.client, filterParams.datefrom, filterParams.dateto, filterParams.limit, filterParams.companyId]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const getPaginationRange = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const showOrderOnMap = (order) => {
    setSelectedOrder(order);
    setShowMap(true);
  };

  const clearFilter = () => {
    setFilterParams({
      client: "Пусто",
      datefrom: "",
      dateto: "",
      limit: isLiveSource ? 500 : 100,
      companyId: "",
      sync: false,
    });
    fetchOrders();
    if (!isLiveSource) fetchAnalytics();
    setShowFilter(false);
    setCurrentPage(1);
  };

  const applyFilter = () => {
    fetchOrders();
    if (!isLiveSource) fetchAnalytics();
    setShowFilter(false);
    setCurrentPage(1); // Reset to first page after filtering
  };

  const handleOrderFormChange = (key, value) => {
    setOrderForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleProductSelect = (productId) => {
    const chosen = products.find((p) => String(p?._id) === String(productId));
    const firstVariantId = chosen?.variants?.[0]?._id || "";
    setOrderForm((prev) => ({
      ...prev,
      productId,
      variantId: firstVariantId,
    }));
  };

  const handleRegionSelect = async (regionName) => {
    setOrderForm((prev) => ({
      ...prev,
      receiverRegion: regionName,
      receiverPvzCode: "",
      receiverTown: "",
      receiverAddress: "",
    }));
    await fetchPvzByRegion(regionName);
  };

  const handlePvzSelect = (pvzCode) => {
    const chosen = (pvzOptions || []).find((point) => String(point?.code?.[0] || "") === String(pvzCode));
    if (!chosen) {
      setOrderForm((prev) => ({ ...prev, receiverPvzCode: pvzCode }));
      return;
    }
    const town = chosen?.town?.[0]?._ || chosen?.town?.[0]?.$?.regionname || "";
    const address = chosen?.address?.[0] || "";
    setOrderForm((prev) => ({
      ...prev,
      receiverPvzCode: pvzCode,
      receiverTown: prev.receiverTown || town,
      receiverAddress: prev.receiverAddress || address,
    }));
  };

  const calculateOrderPrice = async () => {
    setCreateError("");
    setCalculatingPrice(true);
    try {
      const payload = {
        senderTown: orderForm.senderTown || "Ташкент",
        senderAddress: orderForm.senderAddress || "Tashkent",
        receiverTown: orderForm.receiverTown || orderForm.receiverRegion || "Tashkent",
        receiverAddress: orderForm.receiverAddress || "Tashkent",
        receiverPvz: orderForm.receiverPvzCode || undefined,
        weight: Math.max(1, Number(orderForm.weight) || 1),
        service: orderForm.service || "1",
        payType: orderForm.payType || "CASH",
      };
      const result = await emuApi.calculateDelivery(payload);
      const calc = result?.data?.calculator?.calc || result?.calculator?.calc || null;
      const price =
        calc?.$?.price ||
        calc?.price ||
        result?.price ||
        result?.cost ||
        result?.deliveryPrice ||
        0;
      setPricePreview(Number(price) || 0);
    } catch (error) {
      setCreateError(
        error?.response?.data?.message || error?.response?.data?.msg || "Narxni hisoblashda xatolik"
      );
      setPricePreview(null);
    } finally {
      setCalculatingPrice(false);
    }
  };

  const submitCreateOrder = async () => {
    setCreateError("");
    setCreateSuccess("");
    if (!orderForm.receiverPhone || !orderForm.receiverPerson || !orderForm.receiverAddress) {
      setCreateError("Qabul qiluvchi: telefon, ism va manzil majburiy");
      return;
    }
    if (!orderForm.productId) {
      setCreateError("Mahsulot tanlanishi majburiy");
      return;
    }

    setCreatingOrder(true);
    try {
      const receiverPvz = (pvzOptions || []).find(
        (point) => String(point?.code?.[0] || "") === String(orderForm.receiverPvzCode || "")
      );
      const receiverCoords = parsePvzCoords(receiverPvz);
      const itemName =
        selectedProduct?.name ||
        selectedProduct?.productName ||
        selectedProduct?.name_ru ||
        "Mahsulot";
      const itemQuantity = Math.max(1, Number(orderForm.productQuantity) || 1);
      const itemMass = Math.max(1, Number(orderForm.weight) || 1);
      const itemPrice = Number(
        selectedVariant?.discountedPrice ??
          selectedVariant?.price ??
          selectedProduct?.variants?.[0]?.discountedPrice ??
          selectedProduct?.variants?.[0]?.price ??
          0
      );
      const orderNo = `ORD-${Date.now()}`;
      const today = new Date().toISOString().slice(0, 10);
      const items = [
        {
          name: itemName,
          quantity: itemQuantity,
          mass: itemMass,
          retprice: Number.isFinite(itemPrice) ? itemPrice : 0,
        },
      ];

      if (!items.length) {
        setCreateError("Kamida bitta item yuborilishi kerak");
        return;
      }

      const payload = {
        orderNo,
        paytype: orderForm.payType || "CASH",
        service: orderForm.service || "1",
        type: "1",
        weight: itemMass,
        senderTown: orderForm.senderTown || "Ташкент",
        senderAddress: orderForm.senderAddress || "Tashkent",
        sender: {
          company:
            companies.find((c) => String(c._id) === String(orderForm.companyId))?.name ||
            "Default Company",
          town: orderForm.senderTown || "Ташкент",
          address: orderForm.senderAddress || "Tashkent",
          person: orderForm.senderPerson || "Sender",
          phone: orderForm.senderPhone || "+998900000000",
          date: today,
          time_min: "09:00",
          time_max: "18:00",
        },
        receiver: {
          town: orderForm.receiverTown || orderForm.receiverRegion || "",
          address: orderForm.receiverAddress,
          person: orderForm.receiverPerson,
          phone: orderForm.receiverPhone,
          company: orderForm.receiverCompany || "",
          receiverPvz: orderForm.receiverPvzCode || undefined,
          lat: receiverCoords?.lat != null ? String(receiverCoords.lat) : undefined,
          lon: receiverCoords?.lon != null ? String(receiverCoords.lon) : undefined,
          country: "UZ",
        },
        receiverTown: orderForm.receiverTown || orderForm.receiverRegion || "",
        receiverAddress: orderForm.receiverAddress,
        receiverPhone: orderForm.receiverPhone,
        receiverPerson: orderForm.receiverPerson,
        receiverCompany: orderForm.receiverCompany || "",
        receiverPvz: orderForm.receiverPvzCode || undefined,
        receiverLat: receiverCoords?.lat,
        receiverLon: receiverCoords?.lon,
        quantity: itemQuantity,
        payType: orderForm.payType || "CASH",
        instruction: orderForm.instruction || "",
        enclosure: orderForm.enclosure || "",
        items,
        products: [
          {
            productId: orderForm.productId,
            variantId: orderForm.variantId || undefined,
            productQuantity: itemQuantity,
          },
        ],
        location: {
          la: receiverCoords?.lat != null ? String(receiverCoords.lat) : undefined,
          lo: receiverCoords?.lon != null ? String(receiverCoords.lon) : undefined,
          lat: receiverCoords?.lat,
          lon: receiverCoords?.lon,
          address: orderForm.receiverAddress,
        },
        companyId: isSuperAdmin ? orderForm.companyId || undefined : undefined,
      };

      await emuApi.createExpressOrder(payload, { role: actorRole, actorCompanyId });
      setCreateSuccess("Buyurtma EMU ga yuborildi");
      fetchOrders();
      if (!isLiveSource) fetchAnalytics();
      setShowCreateOrder(false);
    } catch (error) {
      setCreateError(
        error?.response?.data?.message ||
          error?.response?.data?.msg ||
          error?.message ||
          "Buyurtma yaratishda xatolik"
      );
    } finally {
      setCreatingOrder(false);
    }
  };

  const renderFilterModal = () => {
    if (!showFilter) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white p-6 max-w-md w-full mx-4 rounded-2xl border border-emerald-100 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Filter parametrlari
            </h3>
            <button
              onClick={() => setShowFilter(false)}
              className="text-gray-500 cursor-pointer hover:text-gray-700 text-2xl leading-none"
            >
              <X />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Holat filtri
              </label>
              <select
                name=""
                id=""
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                value={filterParams.client}
                onChange={(e) =>
                  setFilterParams({ ...filterParams, client: e.target.value })
                }
              >
                <option value="Пусто">Hammasi</option>
                <option value="ONLY_DONE">Bajarilganlar</option>
                <option value="ONLY_NOT_DONE">Bajarilmaganlar</option>
                <option value="ONLY_NEW">Yangilar</option>
                <option value="ONLY_DELIVERY">Yetkazib berilganlar</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Boshlanish sanasi
              </label>
              <input
                type="date"
                value={filterParams.datefrom}
                onChange={(e) =>
                  setFilterParams({ ...filterParams, datefrom: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tugash sanasi
              </label>
              <input
                type="date"
                value={filterParams.dateto}
                onChange={(e) =>
                  setFilterParams({ ...filterParams, dateto: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Limit (nechta buyurtma)
              </label>
              <select
                value={filterParams.limit}
                onChange={(e) =>
                  setFilterParams({
                    ...filterParams,
                    limit: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>

            {isSuperAdmin && !isLiveSource && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kompaniya
                </label>
                <select
                  value={filterParams.companyId}
                  onChange={(e) =>
                    setFilterParams({ ...filterParams, companyId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  <option value="">Barcha kompaniyalar</option>
                  {companies.map((company) => (
                    <option key={company._id} value={company._id}>
                      {company.name || company.company_name || company._id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isLiveSource && (
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(filterParams.sync)}
                  onChange={(e) =>
                    setFilterParams({ ...filterParams, sync: e.target.checked })
                  }
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Jonli natijani lokal bazaga sinxronlash
              </label>
            )}
          </div>

          <div className="flex justify-end mt-6 space-x-3">
            <button
              onClick={clearFilter}
              className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
            >
              Tozalash
            </button>
            <button
              onClick={applyFilter}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Qo'llash
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCreateOrderModal = () => {
    if (!showCreateOrder) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
        <div className="w-full max-w-4xl bg-white rounded-2xl border border-emerald-100 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm sm:text-base font-semibold text-slate-800">
              EMU buyurtma yaratish
            </h3>
            <button
              onClick={() => setShowCreateOrder(false)}
              className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[75vh] overflow-auto">
            {createError && (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
                {createError}
              </div>
            )}
            {createSuccess && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">
                {createSuccess}
              </div>
            )}

            {isSuperAdmin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kompaniya</label>
                <select
                  value={orderForm.companyId}
                  onChange={(e) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      companyId: e.target.value,
                      productId: "",
                      variantId: "",
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Kompaniyani tanlang</option>
                  {companies.map((company) => (
                    <option key={company._id} value={company._id}>
                      {company.name || company.company_name || company._id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mahsulot</label>
                <select
                  value={orderForm.productId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  disabled={loadingProducts || (isSuperAdmin && !orderForm.companyId)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">
                    {loadingProducts
                      ? "Yuklanmoqda..."
                      : isSuperAdmin && !orderForm.companyId
                      ? "Avval kompaniya tanlang"
                      : "Mahsulot tanlang"}
                  </option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name || product.productName || product._id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Variant</label>
                <select
                  value={orderForm.variantId}
                  onChange={(e) => handleOrderFormChange("variantId", e.target.value)}
                  disabled={!selectedProduct}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Variant tanlang (ixtiyoriy)</option>
                  {(selectedProduct?.variants || []).map((variant) => (
                    <option key={variant._id} value={variant._id}>
                      {variant?.unitValue || variant?.unit || variant?.color || variant?._id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Yuboruvchi shahar</label>
                <input
                  value={orderForm.senderTown}
                  onChange={(e) => handleOrderFormChange("senderTown", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Yuboruvchi manzil</label>
                <input
                  value={orderForm.senderAddress}
                  onChange={(e) => handleOrderFormChange("senderAddress", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Qabul qiluvchi region</label>
                <select
                  value={orderForm.receiverRegion}
                  onChange={(e) => handleRegionSelect(e.target.value)}
                  disabled={loadingRegions}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">{loadingRegions ? "Yuklanmoqda..." : "Region tanlang"}</option>
                  {regionOptions.map((region, idx) => {
                    const name = region?.name?.[0] || region?.name || "";
                    return (
                      <option key={`${name}-${idx}`} value={name}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">PVZ</label>
                <select
                  value={orderForm.receiverPvzCode}
                  onChange={(e) => handlePvzSelect(e.target.value)}
                  disabled={loadingPvz || !orderForm.receiverRegion}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">{loadingPvz ? "Yuklanmoqda..." : "PVZ tanlang"}</option>
                  {pvzOptions.map((point, idx) => {
                    const code = point?.code?.[0] || "";
                    const title = `${point?.town?.[0]?._ || ""} - ${point?.address?.[0] || code}`;
                    return (
                      <option key={`${code}-${idx}`} value={code}>
                        {title}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Qabul qiluvchi ism</label>
                <input
                  value={orderForm.receiverPerson}
                  onChange={(e) => handleOrderFormChange("receiverPerson", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Qabul qiluvchi telefon</label>
                <input
                  value={orderForm.receiverPhone}
                  onChange={(e) => handleOrderFormChange("receiverPhone", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Qabul qiluvchi manzil</label>
                <input
                  value={orderForm.receiverAddress}
                  onChange={(e) => handleOrderFormChange("receiverAddress", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vazn (kg)</label>
                <input
                  type="number"
                  min={1}
                  value={orderForm.weight}
                  onChange={(e) => handleOrderFormChange("weight", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Miqdor</label>
                <input
                  type="number"
                  min={1}
                  value={orderForm.productQuantity}
                  onChange={(e) => handleOrderFormChange("productQuantity", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To'lov turi</label>
                <select
                  value={orderForm.payType}
                  onChange={(e) => handleOrderFormChange("payType", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="CASH">Naqd</option>
                  <option value="CARD">Karta</option>
                </select>
              </div>
            </div>

            {Boolean(orderForm.receiverRegion) && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <div className="mb-2 text-sm font-medium text-emerald-800">PVZ xaritasi</div>
                {pvzWithCoords.length > 0 ? (
                  <>
                    <div
                      ref={pvzMapRef}
                      className={`w-full rounded-lg border border-emerald-100 bg-white overflow-hidden ${
                        pvzMapReady ? "block h-56" : "hidden h-0"
                      }`}
                    />
                    {!pvzMapReady && !pvzMapError && (
                      <p className="mt-2 text-xs text-slate-500">Xarita yuklanmoqda...</p>
                    )}
                    {pvzMapError && (
                      <p className="mt-2 text-xs text-rose-600">{pvzMapError}</p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-600">
                    Tanlangan regionda koordinatali PVZ topilmadi.
                  </p>
                )}
              </div>
            )}

            {pricePreview != null && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 text-sky-800 px-3 py-2 text-sm">
                Yetkazib berish narxi: <span className="font-semibold">{pricePreview}</span>
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
            <button
              onClick={calculateOrderPrice}
              disabled={calculatingPrice}
              className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-60 cursor-pointer"
            >
              {calculatingPrice ? "Hisoblanmoqda..." : "Narxni hisoblash"}
            </button>
            <button
              onClick={submitCreateOrder}
              disabled={creatingOrder}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
            >
              {creatingOrder ? "Yuborilmoqda..." : "EMU buyurtma yaratish"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 to-slate-50">
      {/* Header Section */}
      {renderFilterModal()}
      {renderCreateOrderModal()}
      <div className="bg-white/85 border-b border-emerald-100 py-4 backdrop-blur-md sticky top-0 z-20">
        <div className="rounded-2xl border border-emerald-100/80 bg-gradient-to-r from-white to-emerald-50/40 px-4 py-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {isLiveSource
                    ? "EMU jonli buyurtmalar"
                    : isSuperAdmin
                    ? "EMU buyurtmalar jadvali"
                    : "EMU buyurtmalari"}
                </h1>
                {(isLiveSource || isSuperAdmin) && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {isLiveSource ? "Serverdan jonli" : "Mahalliy baza"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {isLiveSource
                  ? "Ma'lumotlar EMU serveridan bevosita olinadi."
                  : isSuperAdmin
                  ? "Ma'lumotlar ichki bazada saqlangan buyurtmalardan olinadi."
                  : "Ma'lumotlar sizning kompaniyangiz buyurtmalaridan olinadi."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isSuperAdmin && (
                <button
                  onClick={() =>
                    navigate(isLiveSource ? "/emu/integration" : "/emu/integration/live")
                  }
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 cursor-pointer transition-all shadow-sm hover:shadow-md"
                  title={isLiveSource ? "Mahalliy sahifaga o'tish" : "Jonli sahifaga o'tish"}
                >
                  <span>{isLiveSource ? "Mahalliy" : "Jonli"}</span>
                </button>
              )}
              {!isLiveSource && isSuperAdmin && (
                <>
                  <button
                    onClick={() => setShowCreateOrder(true)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition-all shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Yangi buyurtma</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowFilter(!showFilter);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition-all shadow-sm hover:shadow-md"
                  >
                    <Filter className="w-4 h-4" />
                    <span>Filtr</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="py-4">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-all">
            <h3 className="text-sm font-medium text-slate-500">
              Jami buyurtmalar
            </h3>
            <p className="text-3xl font-semibold text-slate-900 mt-1">
              {analyticsData.totalOrders || transformedData.length}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-all">
            <h3 className="text-sm font-medium text-slate-500">Yangi</h3>
            <p className="text-3xl font-semibold text-slate-900 mt-1">
              {statusStats.newCount}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-all">
            <h3 className="text-sm font-medium text-slate-500">Jarayonda</h3>
            <p className="text-3xl font-semibold text-slate-900 mt-1">
              {statusStats.processingCount}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-all">
            <h3 className="text-sm font-medium text-slate-500">Yetkazilgan</h3>
            <p className="text-3xl font-semibold text-emerald-600 mt-1">
              {Number(
                analyticsData?.totalStatusSummary?.DELIVERED ||
                  analyticsData?.totalStatusSummary?.delivered ||
                  statusStats.deliveredCount
              )}
            </p>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white shadow-sm border border-emerald-100 overflow-visible rounded-2xl">
          <div className="flex justify-end p-3 border-b border-emerald-100 bg-white relative">
            <div ref={columnSettingsRef} className="relative">
              <button
                onClick={() => setShowColumnSettings((prev) => !prev)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
                title="Ustunlarni sozlash"
              >
                <Settings2 className="w-4 h-4" />
                <span className="text-sm font-medium">Ustunlar</span>
              </button>
              {showColumnSettings && (
                <div className="absolute right-0 mt-2 w-[520px] max-w-[92vw] rounded-xl border border-slate-200 bg-white shadow-xl z-20 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-800">Ko'rinadigan ustunlar</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={showAllColumns}
                        className="px-2 py-1 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 cursor-pointer"
                      >
                        Barchasi
                      </button>
                      <button
                        onClick={resetColumnsToDefault}
                        className="px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium hover:bg-slate-100 cursor-pointer"
                      >
                        Standart
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {columnPickerColumns.map((column) => (
                      <label key={column.key} className="flex items-center gap-2 text-sm text-slate-700 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={visibleColumnKeys.includes(column.key)}
                          onChange={() => toggleColumn(column.key)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{column.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div
            ref={tableScrollRef}
            className="overflow-x-auto max-h-[calc(100vh-300px)] cursor-grab select-none"
            onMouseDown={handleTableMouseDown}
            onMouseLeave={handleTableMouseLeave}
            onMouseUp={handleTableMouseUp}
            onMouseMove={handleTableMouseMove}
          >
            <table className="w-max min-w-full">
              {/* Sticky Header */}
              <thead className="bg-gradient-to-r from-emerald-50 to-teal-50 sticky top-0 z-10">
                <tr>
                  <th className="w-12 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      checked={isAllCurrentPageSelected}
                      onChange={toggleSelectAllCurrentPage}
                    />
                  </th>
                  {visibleColumns.map((column) => (
                    <th
                      key={column.key}
                      className={`${column.width} px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-emerald-100 last:border-r-0 whitespace-nowrap align-top`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="bg-white divide-y divide-slate-100">
                {currentData.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`${index % 2 === 0 ? "bg-white" : "bg-slate-50/35"} hover:bg-emerald-50/60 transition-colors`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        checked={selectedOrderIds.includes(item.id)}
                        onChange={() => toggleSelectOrder(item.id)}
                      />
                    </td>
                    {visibleColumns.map((column) => (
                      <td
                        key={column.key}
                        className={`${column.width} px-3 py-3 text-sm text-slate-800 border-r border-slate-100 last:border-r-0 align-top whitespace-nowrap`}
                      >
                        {column.key === "actions" ? (
                          <div className="flex space-x-2">
                            {(() => {
                              const canOpenMap = Boolean(
                                item.coordinates ||
                                  item.qabulQiluvchiManzili ||
                                  item.qabulQiluvchiShahri
                              );
                              return (
                            <button
                              onClick={() => showOrderOnMap(item)}
                              disabled={!canOpenMap}
                              className={`p-1 cursor-pointer ${
                                canOpenMap
                                  ? "text-emerald-600 hover:bg-emerald-100"
                                  : "text-gray-400 cursor-not-allowed"
                              }`}
                              title={
                                canOpenMap
                                  ? "Xaritada ko'rish"
                                  : "Manzil ma'lumoti mavjud emas"
                              }
                            >
                              <Map className="w-4 h-4" />
                            </button>
                              );
                            })()}
                            <button
                              className="p-1 cursor-pointer text-green-600 hover:bg-green-100"
                              title="Batafsil ko'rish"
                              onClick={() =>
                                navigate(
                                  `/emu/order/${item.buyurtmaRaqami}${
                                    (isSuperAdmin
                                      ? filterParams.companyId
                                      : actorCompanyId)
                                      ? `?companyId=${encodeURIComponent(
                                          isSuperAdmin
                                            ? filterParams.companyId
                                            : actorCompanyId
                                        )}`
                                      : ""
                                  }`
                                )
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        ) : column.key === "holat" ? (
                          (() => {
                            const meta = getStatusMeta(item[column.key]);
                            return (
                              <div>
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg border whitespace-nowrap ${meta.tone}`}
                                >
                                  {meta.label}
                                </span>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="whitespace-nowrap" title={item[column.key]}>
                            {item[column.key] || "-"}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-6 py-3 border-t border-emerald-100">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-700">
                  <span>Ko'rsatilmoqda </span>
                  <span className="font-medium">{startIndex + 1}</span>
                  <span> dan </span>
                  <span className="font-medium">
                    {Math.min(endIndex, filteredData.length)}
                  </span>
                  <span> gacha, jami </span>
                  <span className="font-medium">{filteredData.length}</span>
                  <span> ta natija</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative cursor-pointer inline-flex items-center px-2 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-l-md"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {getPaginationRange().map((page, index) => (
                    <React.Fragment key={index}>
                      {page === "..." ? (
                        <span className="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700">
                          ...
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`relative cursor-pointer inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === currentPage
                              ? "z-10 bg-emerald-50 border-emerald-500 text-emerald-700"
                              : "bg-white border-slate-300 text-slate-500 hover:bg-emerald-50"
                          }`}
                        >
                          {page}
                        </button>
                      )}
                    </React.Fragment>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex cursor-pointer items-center px-2 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-r-md"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map Modal */}
      <MapModal
        showMap={showMap}
        selectedOrder={selectedOrder}
        setShowMap={setShowMap}
      />
    </div>
  );
};
