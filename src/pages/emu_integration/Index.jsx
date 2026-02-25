import $api from "../../http/api";
import { MapModal } from "./map";
import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Map,
  Eye,
  X,
  Calculator,
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

export const EmuIntegrationPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user);
  const actorRole = String(user?.role || "").toLowerCase().replace(/[_\s]/g, "");
  const isSuperAdmin = actorRole === "superadmin";
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [emuOrdersData, setEmuOrdersData] = useState({});
  const [companies, setCompanies] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [filterParams, setFilterParams] = useState({
    client: "Пусто",
    datefrom: "",
    dateto: "",
    limit: 50,
    companyId: "",
  });
  const [showFilter, setShowFilter] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorCompanyId, setCalculatorCompanyId] = useState("");

  const getStatusMeta = (rawStatus) => {
    const value = (rawStatus || "").toString().trim();
    const normalized = value.toLowerCase();

    if (
      normalized.includes("доставлен") ||
      normalized.includes("yetkaz") ||
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
      normalized.includes("возврат") ||
      normalized.includes("отмена") ||
      normalized.includes("не достав") ||
      normalized.includes("failed")
    ) {
      return {
        label: "Yetkazilmadi / bekor",
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

  useEffect(() => {
    if (isSuperAdmin) {
      fetchCompanies();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setCalculatorCompanyId(String(user?.companyId?._id || user?.companyId || ""));
    }
  }, [isSuperAdmin, user]);

  async function fetchCompanies() {
    try {
      const endpoints = ["/company/all", "/companies/all", "/company/get/all"];
      let payload = null;

      for (const endpoint of endpoints) {
        try {
          const { data } = await $api.get(endpoint);
          payload = data;
          if (payload) break;
        } catch {
          // next endpoint
        }
      }

      const list = payload?.data || payload?.companies || [];
      setCompanies(list);
    } catch {
      setCompanies([]);
    }
  }

  async function fetchOrders() {
    try {
      const params = {
        done: filterParams.client,
        datefrom: filterParams.datefrom,
        dateto: filterParams.dateto,
        limit: filterParams.limit,
      };
      if (isSuperAdmin && filterParams.companyId) {
        params.companyId = filterParams.companyId;
      }
      let { data } = await $api.get(`/emu/get/orders`, { params });
      setEmuOrdersData(data.orders);
    } catch (error) {
      setEmuOrdersData({});
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  // Transform backend data to display format
  const transformedData = Object.keys(emuOrdersData).map((key) => {
    const order = emuOrdersData[key];
    return {
      id: key,
      buyurtmaRaqami: order.$?.orderno || order.$?.awb || "",
      yuboruvchiShahri: order.sender?.town?._ || "",
      hisobFakturaRaqami: order.barcode || order.$?.awb || "",
      buyurtmaSanasi: order.sender?.date || "",
      zaborVaqti: order.receiver?.time_min || "",
      zaborVaqtiGacha: order.receiver?.time_max || "",
      qabulQiluvchiKompaniya: order.receiver?.company || "",
      qabulQiluvchiAloqaShaxsi: order.receiver?.person || "",
      qabulQiluvchiShahri: order.receiver?.town?._ || "",
      qabulQiluvchiManzili: order.receiver?.address || "",
      qabulQiluvchiTelefoni: order.receiver?.phone || "",
      holat: order.status?.$?.title || order.status?._ || "",
      etkazibBerishHaqiqiySanasi: order.delivereddate || "",
      etkazibBerishMalumoti: order.deliveredto || "",
      haqiqiyEtkazibBerishVaqti: order.deliveredtime || "",
      ustamaTolov: order.inshprice || "0",
      vazni: order.weight || "0",
      etkazibBerishNarxi: order.price || "0",
      jonatmalarTuri: order.type || "",
      yuboruvchiKompaniya: order.sender?.company || "",
      yuboruvchiISHO: order.sender?.person || "",
      yuboruvchiManzili: order.sender?.address || "",
      shtrixKod: order.barcode || "",
      yuboruvchiTelefoni: order.sender?.phone || "",
      tavsif: order.instruction || "",
      topshiriq: order.enclosure || "",
      etkazibBerishRejimi: order.service || "",
      elonQilinganQiymat: order.deliveryprice?.$?.total || "0",
      joylarSoni: order.quantity || "0",
      etkazibBerishRejaSanasi: order.receiver?.date || "",
      coordinates: order.receiver?.coords?.$,
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

  const columns = [
    { key: "buyurtmaRaqami", label: "Buyurtma raqami", width: "w-32" },
    { key: "yuboruvchiShahri", label: "Yuboruvchi shahri", width: "w-32" },
    { key: "hisobFakturaRaqami", label: "Hisob-faktura raqami", width: "w-36" },
    { key: "buyurtmaSanasi", label: "Buyurtma sanasi", width: "w-32" },
    { key: "zaborVaqti", label: "Zabor vaqti", width: "w-24" },
    { key: "zaborVaqtiGacha", label: "Zabor vaqti gacha", width: "w-32" },
    {
      key: "qabulQiluvchiKompaniya",
      label: "Qabul qiluvchi kompaniya",
      width: "w-48",
    },
    {
      key: "qabulQiluvchiAloqaShaxsi",
      label: "Qabul qiluvchining aloqa shaxsi",
      width: "w-48",
    },
    {
      key: "qabulQiluvchiShahri",
      label: "Qabul qiluvchi shahri",
      width: "w-36",
    },
    {
      key: "qabulQiluvchiManzili",
      label: "Qabul qiluvchining manzili",
      width: "w-48",
    },
    {
      key: "qabulQiluvchiTelefoni",
      label: "Qabul qiluvchining telefoni",
      width: "w-40",
    },
    { key: "holat", label: "Holat", width: "w-24" },
    { key: "vazni", label: "Vazni (kg)", width: "w-24" },
    {
      key: "etkazibBerishNarxi",
      label: "Yetkazib berish narxi",
      width: "w-36",
    },
    { key: "actions", label: "Amallar", width: "w-32" },
  ];

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
      limit: 50,
      companyId: "",
    });
    fetchOrders(); // Fetch without filter
    setShowFilter(false);
    setCurrentPage(1);
  };

  const applyFilter = () => {
    fetchOrders(filterParams);
    setShowFilter(false);
    setCurrentPage(1); // Reset to first page after filtering
  };

  const FilterModal = () => {
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
                Client ID
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
              </select>
            </div>

            {isSuperAdmin && (
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

  const CalculatorModal = () => {
    if (!showCalculator) return null;

    const effectiveCompanyId = isSuperAdmin
      ? calculatorCompanyId
      : String(user?.companyId?._id || user?.companyId || "");
    const calculatorSrc = effectiveCompanyId
      ? `https://home.courierexe.ru/245/calculator?companyId=${encodeURIComponent(
          effectiveCompanyId
        )}`
      : "https://home.courierexe.ru/245/calculator";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
        <div className="w-full max-w-6xl bg-white rounded-2xl border border-emerald-100 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <button
              onClick={() => setShowCalculator(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Orqaga</span>
            </button>
            <h3 className="text-sm sm:text-base font-semibold text-slate-800">
              Yetkazib berish kalkulyatori
            </h3>
            <button
              onClick={() => setShowCalculator(false)}
              className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
              title="Yopish"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isSuperAdmin && (
            <div className="px-4 py-3 border-b border-slate-200 bg-white">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Kompaniya tanlang
              </label>
              <select
                value={calculatorCompanyId}
                onChange={(e) => setCalculatorCompanyId(e.target.value)}
                className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                <option value="">Kompaniya tanlang</option>
                {companies.map((company) => (
                  <option key={company._id} value={company._id}>
                    {company.name || company.company_name || company._id}
                  </option>
                ))}
              </select>
            </div>
          )}

          <iframe
            id="emu-calculator-frame"
            src={calculatorSrc}
            title="Delivery Calculator"
            className="w-full h-[70vh] border-none block"
            scrolling="auto"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 to-slate-50">
      {/* Header Section */}
      <FilterModal />
      <CalculatorModal />
      <div className="bg-white/85 border-b border-emerald-100 py-4 backdrop-blur-md sticky top-0 z-20">
        <div className="">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              EMU Yetkazib berish jadvali
            </h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setShowFilter(!showFilter);
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition-all shadow-sm hover:shadow-md"
              >
                <Filter className="w-4 h-4" />
                <span>Filter</span>
              </button>
              <button
                onClick={() => {
                  if (isSuperAdmin && !calculatorCompanyId) {
                    setCalculatorCompanyId(companies?.[0]?._id || "");
                  }
                  setShowCalculator(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 cursor-pointer transition-all shadow-sm hover:shadow-md"
              >
                <Calculator className="w-4 h-6" />
              </button>
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
              {Object.keys(emuOrdersData).length}
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
              {statusStats.deliveredCount}
            </p>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white shadow-sm border border-emerald-100 overflow-hidden rounded-2xl">
          <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
            <table className="w-full">
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
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={`${column.width} px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-emerald-100 last:border-r-0`}
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
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`${column.width} px-4 py-3 text-sm text-slate-800 border-r border-slate-100 last:border-r-0`}
                      >
                        {column.key === "actions" ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => showOrderOnMap(item)}
                              disabled={!item.coordinates}
                              className={`p-1 cursor-pointer ${
                                item.coordinates
                                  ? "text-emerald-600 hover:bg-emerald-100"
                                  : "text-gray-400 cursor-not-allowed"
                              }`}
                              title={
                                item.coordinates
                                  ? "Xaritada ko'rish"
                                  : "Koordinatalar mavjud emas"
                              }
                            >
                              <Map className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1 cursor-pointer text-green-600 hover:bg-green-100"
                              title="Batafsil ko'rish"
                              onClick={() =>
                                navigate(
                                  `/emu/order/${item.buyurtmaRaqami}${
                                    isSuperAdmin && filterParams.companyId
                                      ? `?companyId=${filterParams.companyId}`
                                      : ""
                                  }`
                                )
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        ) : column.key === "holat" ? (
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg border ${getStatusMeta(item[column.key]).tone}`}
                            >
                              {getStatusMeta(item[column.key]).label}
                            </span>
                            <p className="text-[11px] leading-4 text-slate-500 break-words">
                              {item[column.key] || "Status kelmagan"}
                            </p>
                          </div>
                        ) : (
                          <div className="truncate" title={item[column.key]}>
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
