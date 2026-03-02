import $api from "../../http/api";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GlobalTable from "../../components/global_table/GlobalTable";
import {
  RefreshCcw,
  Search,
  Settings,
  X,
  MoreVertical,
  Pencil,
  Trash2,
  Funnel,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { formatDate } from "../../utils/functions/functions.utils";
import QRCodeScanner from "./CamScan";
import UpdateOrderModal from "../../components/modals/order/OrderUpdateModal";
import { useSelector } from "react-redux";

const STATUS_META = {
  qabul_qilinmagan: { label: "Qabul qilinmagan", className: "bg-orange-100 text-orange-700" },
  jarayonda: { label: "Jarayonda", className: "bg-blue-100 text-blue-700" },
  yetkazish_jarayonida: {
    label: "Yetkazish jarayonida",
    className: "bg-amber-100 text-amber-700",
  },
  yetkazilgan: { label: "Yetkazilgan", className: "bg-emerald-100 text-emerald-700" },
};

const PAYMENT_OPTIONS = [
  { value: "", label: "To'lov turi (barchasi)" },
  { value: "online", label: "Online" },
  { value: "cash", label: "Naqd" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Holat (barchasi)" },
  { value: "qabul_qilinmagan", label: "Qabul qilinmagan" },
  { value: "jarayonda", label: "Jarayonda" },
  { value: "yetkazish_jarayonida", label: "Yetkazish jarayonida" },
  { value: "yetkazilgan", label: "Yetkazilgan" },
];

const PAID_OPTIONS = [
  { value: "", label: "To'lov holati (barchasi)" },
  { value: "true", label: "To'langan" },
  { value: "false", label: "To'lanmagan" },
];

const SORT_OPTIONS = [
  { value: "desc", label: "Sana: yangi -> eski" },
  { value: "asc", label: "Sana: eski -> yangi" },
];

const getStatusMeta = (status) =>
  STATUS_META[status] || {
    label: status || "Noma'lum",
    className: "bg-slate-100 text-slate-700",
  };

const getAddressText = (location) => {
  if (!location) return "Noma'lum";
  if (typeof location === "string") return location;
  if (typeof location === "object") return location.address || location.name || "Noma'lum";
  return "Noma'lum";
};

const getCompanyName = (order) => {
  if (order?.company_name && String(order.company_name).trim()) {
    return String(order.company_name).trim();
  }
  if (order?.company?.name && String(order.company.name).trim()) {
    return String(order.company.name).trim();
  }
  const orderCompany = order?.companyId;
  const userCompany = order?.user?.companyId;
  const candidate = orderCompany || userCompany || null;
  if (!candidate) return "-";
  if (typeof candidate === "string") return "-";
  return candidate?.name || candidate?.title || candidate?.companyName || "-";
};

const formatMoney = (value) =>
  `${new Intl.NumberFormat("uz-UZ").format(Number(value) || 0)} so'm`;

const getOrderTotal = (order) => {
  const direct = Number(order?.totalSellingPrice ?? order?.sellingPrice);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const items = Array.isArray(order?.items) ? order.items : [];
  return items.reduce((sum, item) => {
    const lineTotal = Number(item?.totalSellingPrice ?? item?.sellingPrice);
    if (Number.isFinite(lineTotal) && lineTotal > 0) return sum + lineTotal;
    const unit = Number(item?.price ?? item?.variantPrice ?? 0);
    const qty = Number(item?.productQuantity ?? item?.quantity ?? 1);
    return sum + unit * qty;
  }, 0);
};

const openYandexMap = (location) => {
  const lat = location?.la || location?.lat || location?.latitude;
  const lon = location?.lo || location?.lng || location?.lon || location?.longitude;
  const address = getAddressText(location);
  const url =
    lat && lon
      ? `https://yandex.com/maps/?pt=${encodeURIComponent(`${lon},${lat}`)}&z=15&l=map`
      : `https://yandex.com/maps/?text=${encodeURIComponent(address)}`;
  window.open(url, "_blank", "noopener,noreferrer");
};

export const OrderPage = () => {
  const { user } = useSelector((state) => state.user);
  const actorRole = String(user?.role || "").toLowerCase().replace(/[_\s]/g, "");
  const isSuperAdmin = actorRole === "superadmin";
  const actorCompanyId = String(user?.companyId?._id || user?.companyId || "");

  const navigate = useNavigate();
  const settingsButtonRef = useRef(null);
  const actionMenuRef = useRef(null);
  const debounceRef = useRef(null);

  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [dataLoad, setDataLoad] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, right: 0 });
  const [visibleColumns, setVisibleColumns] = useState({
    product: true,
    paid: true,
    paymentMethodOnline: true,
    user_name: true,
    company_name: true,
    user_phoneNumber: true,
    date: true,
    location: true,
    selling_price: true,
    status: true,
    setting: true,
  });

  const [productData, setProductData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paidFilter, setPaidFilter] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateSort, setDateSort] = useState("desc");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [draftFilters, setDraftFilters] = useState({
    statusFilter: "",
    paidFilter: "",
    paymentTypeFilter: "",
    dateFrom: "",
    dateTo: "",
    dateSort: "desc",
  });

  const [openActionOrderId, setOpenActionOrderId] = useState(null);
  const [actionPosition, setActionPosition] = useState({ top: 0, right: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateData, setUpdateData] = useState({
    id: "",
    location: "",
    status: "qabul_qilinmagan",
    paid: false,
    paymentMethodOnline: false,
    canceled: false,
  });

  const debouncedSetSearch = useCallback((value) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearchTerm(value);
      setCurrentPage(1);
    }, 400);
  }, []);

  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchTerm(value);
      debouncedSetSearch(value);
    },
    [debouncedSetSearch]
  );

  const mapOrderToRow = useCallback(
    (order) => {
      const statusMeta = getStatusMeta(order.status);
      const address = getAddressText(order.location);
      const fullName = `${order.user?.firstName || ""} ${order.user?.lastName || ""}`.trim();

      return {
        id: order._id,
        raw: order,
        product: order.productId?.name || order.items?.[0]?.product?.name || "N/A",
        paid: (
          <span
            className={`inline-flex min-w-[116px] justify-center rounded-md px-2 py-1 text-xs font-semibold text-white ${
              order.paid ? "bg-emerald-600" : "bg-rose-500"
            }`}
          >
            {order.paid ? "To'langan" : "To'lanmagan"}
          </span>
        ),
        paymentMethodOnline: order.paymentMethodOnline ? "Online" : "Naqd",
        user_name: fullName || "Noma'lum",
        company_name: getCompanyName(order),
        user_phoneNumber: order.user?.phoneNumber || "-",
        date: formatDate(order.createdAt),
        location: (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openYandexMap(order.location);
            }}
            title="Yandex xaritada ochish"
            className="cursor-pointer text-left text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            {address}
          </button>
        ),
        selling_price: formatMoney(getOrderTotal(order)),
        status: (
          <span
            className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusMeta.className}`}
          >
            {statusMeta.label}
          </span>
        ),
        setting: (
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
            onClick={(event) => {
              event.stopPropagation();
              const rect = event.currentTarget.getBoundingClientRect();
              setActionPosition({
                top: rect.bottom + window.scrollY + 6,
                right: window.innerWidth - rect.right,
              });
              setOpenActionOrderId((prev) => (prev === order._id ? null : order._id));
            }}
            title="Amallar"
          >
            <MoreVertical size={15} />
          </button>
        ),
      };
    },
    []
  );

  const fetchProducts = useCallback(
    async (page = 1, search = debouncedSearchTerm) => {
      setDataLoad(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.append("page", String(page));
        queryParams.append("limit", String(rowsPerPage));
        queryParams.append("sortByCreatedAt", dateSort);

        if (search.trim()) queryParams.append("user_name", search.trim());
        if (statusFilter) queryParams.append("status", statusFilter);
        if (paidFilter !== "") queryParams.append("paid", paidFilter);
        if (paymentTypeFilter === "online") queryParams.append("paymentMethodOnline", "true");
        if (paymentTypeFilter === "cash") queryParams.append("paymentMethodOnline", "false");
        if (dateFrom) {
          queryParams.append("dateFrom", dateFrom);
          queryParams.append("datefrom", dateFrom);
        }
        if (dateTo) {
          queryParams.append("dateTo", dateTo);
          queryParams.append("dateto", dateTo);
        }
        if (!isSuperAdmin && actorCompanyId) {
          queryParams.append("companyId", actorCompanyId);
        }

        const { data } = await $api.get(`/order/get/all?${queryParams.toString()}`);
        const list = Array.isArray(data?.data) ? data.data : [];

        setProductData(list.map(mapOrderToRow));
        setCurrentPage(Number(data?.pagination?.page || page));
        setTotalPages(Number(data?.pagination?.pages || 1));
        setTotalItems(Number(data?.pagination?.total || 0));
      } catch (error) {
        setProductData([]);
        setCurrentPage(1);
        setTotalPages(1);
        setTotalItems(0);
      } finally {
        setDataLoad(false);
      }
    },
    [
      rowsPerPage,
      dateSort,
      statusFilter,
      paidFilter,
      paymentTypeFilter,
      dateFrom,
      dateTo,
      isSuperAdmin,
      actorCompanyId,
      debouncedSearchTerm,
      mapOrderToRow,
    ]
  );

  const handleRowClick = useCallback(
    (row) => {
      if (row?.id) navigate(`/sales/order/${row.id}`);
    },
    [navigate]
  );

  const handlePageChange = useCallback(
    (pageNumber) => {
      setCurrentPage(pageNumber);
      fetchProducts(pageNumber, debouncedSearchTerm);
    },
    [fetchProducts, debouncedSearchTerm]
  );

  const handleRefresh = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setStatusFilter("");
    setPaidFilter("");
    setPaymentTypeFilter("");
    setDateFrom("");
    setDateTo("");
    setDateSort("desc");
    setDraftFilters({
      statusFilter: "",
      paidFilter: "",
      paymentTypeFilter: "",
      dateFrom: "",
      dateTo: "",
      dateSort: "desc",
    });
    setCurrentPage(1);
    setOpenActionOrderId(null);
    fetchProducts(1, "");
  }, [fetchProducts]);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setCurrentPage(1);
    fetchProducts(1, "");
  }, [fetchProducts]);

  const openFilterModal = useCallback(() => {
    setDraftFilters({
      statusFilter,
      paidFilter,
      paymentTypeFilter,
      dateFrom,
      dateTo,
      dateSort,
    });
    setShowFilterModal(true);
  }, [statusFilter, paidFilter, paymentTypeFilter, dateFrom, dateTo, dateSort]);

  const applyFilters = useCallback(() => {
    setStatusFilter(draftFilters.statusFilter);
    setPaidFilter(draftFilters.paidFilter);
    setPaymentTypeFilter(draftFilters.paymentTypeFilter);
    setDateFrom(draftFilters.dateFrom);
    setDateTo(draftFilters.dateTo);
    setDateSort(draftFilters.dateSort);
    setCurrentPage(1);
    setShowFilterModal(false);
  }, [draftFilters]);

  const closeActionMenu = useCallback(() => {
    setOpenActionOrderId(null);
  }, []);

  const openEditModal = useCallback(() => {
    const row = productData.find((item) => item.id === openActionOrderId);
    if (!row?.raw) return;

    const order = row.raw;
    setSelectedOrderId(order._id);
    setUpdateData({
      id: order._id,
      location: order.location || { address: getAddressText(order.location) },
      status: order.status || "qabul_qilinmagan",
      paid: Boolean(order.paid),
      paymentMethodOnline: Boolean(order.paymentMethodOnline),
      canceled: Boolean(order.canceled),
    });
    setShowUpdateModal(true);
    closeActionMenu();
  }, [productData, openActionOrderId, closeActionMenu]);

  const openDeleteConfirm = useCallback(() => {
    setSelectedOrderId(openActionOrderId);
    setShowDeleteConfirm(true);
    closeActionMenu();
  }, [openActionOrderId, closeActionMenu]);

  const handleDeleteOrder = useCallback(async () => {
    if (!selectedOrderId) return;
    try {
      await $api.delete(`/order/delete/${selectedOrderId}`);
      setShowDeleteConfirm(false);
      setSelectedOrderId(null);
      fetchProducts(currentPage, debouncedSearchTerm);
    } catch (error) {
      setShowDeleteConfirm(false);
    }
  }, [selectedOrderId, fetchProducts, currentPage, debouncedSearchTerm]);

  const handleUpdateOrder = useCallback(async () => {
    try {
      setIsUpdating(true);
      const { id, location, ...rest } = updateData;
      if (!id) return;
      const currentOrder = productData.find((item) => item.id === id)?.raw;
      const normalizedLocation =
        typeof location === "string" ? location.trim() : getAddressText(location).trim();
      const fallbackLocation = getAddressText(currentOrder?.location).trim();

      const payload = {
        ...rest,
        location: normalizedLocation || fallbackLocation,
      };

      await $api.patch(`/order/update/${id}`, payload);
      setShowUpdateModal(false);
      fetchProducts(currentPage, debouncedSearchTerm);
    } finally {
      setIsUpdating(false);
    }
  }, [updateData, fetchProducts, currentPage, debouncedSearchTerm, productData]);

  const handleSettingsClick = useCallback(() => {
    if (settingsButtonRef.current && !showColumnSettings) {
      const rect = settingsButtonRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setModalPosition({
        top: rect.bottom + scrollTop + 6,
        right: window.innerWidth - rect.right,
      });
    }
    setShowColumnSettings((prev) => !prev);
  }, [showColumnSettings]);

  const closeColumnModal = useCallback(() => setShowColumnSettings(false), []);

  const toggleColumn = useCallback((columnKey) => {
    setVisibleColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }));
  }, []);

  useEffect(() => {
    fetchProducts(1, debouncedSearchTerm);
  }, [
    fetchProducts,
    debouncedSearchTerm,
    statusFilter,
    paidFilter,
    paymentTypeFilter,
    dateFrom,
    dateTo,
    dateSort,
    rowsPerPage,
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setOpenActionOrderId(null);
      }
    };
    if (openActionOrderId) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openActionOrderId]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const columns = useMemo(
    () => [
      { key: "product", label: "Mahsulot" },
      { key: "paid", label: "To'lov holati" },
      { key: "paymentMethodOnline", label: "To'lov turi" },
      { key: "user_name", label: "Mijoz" },
      { key: "company_name", label: "Kompaniya" },
      { key: "user_phoneNumber", label: "Mijoz tel" },
      { key: "date", label: "Buyurtma sanasi" },
      { key: "status", label: "Buyurtma holati" },
      { key: "location", label: "Manzil" },
      { key: "selling_price", label: "Umumiy narx" },
      {
        key: "setting",
        label: (
          <button
            ref={settingsButtonRef}
            className="p-1 hover:bg-gray-100 rounded items-center"
            onClick={handleSettingsClick}
            title="Ustun sozlamalari"
          >
            <Settings className="w-4 h-4 font-[900] text-[#2db789] cursor-pointer" />
          </button>
        ),
      },
    ],
    [handleSettingsClick]
  );

  const activeFiltersCount = useMemo(() => {
    const values = [statusFilter, paidFilter, paymentTypeFilter, dateFrom, dateTo];
    return values.filter(Boolean).length;
  }, [statusFilter, paidFilter, paymentTypeFilter, dateFrom, dateTo]);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-gradient-to-br from-emerald-50 via-white to-green-50 p-3 sm:p-5 rounded-2xl">
      <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm mb-4 px-4 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900">Sotuvlar</h1>
            <RefreshCcw
              size={15}
              className="text-[#333] cursor-pointer hover:text-green-600 transition-colors"
              onClick={handleRefresh}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Mijoz qidirish"
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-9 pr-9 py-2 border outline-none border-emerald-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent w-72 max-w-full"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={openFilterModal}
              className="relative inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filter
              {activeFiltersCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-xs text-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <QRCodeScanner />
          </div>
        </div>
      </div>

      <GlobalTable
        columns={columns}
        visibleColumns={visibleColumns}
        sampleData={productData}
        load={dataLoad}
        onRowClick={handleRowClick}
        useServerPagination={true}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={rowsPerPage}
        onPageChange={handlePageChange}
      />

      <AnimatePresence>
        {showFilterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[75] bg-black/35 flex items-center justify-center p-4"
            onClick={() => setShowFilterModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="w-full max-w-xl rounded-2xl border border-emerald-100 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-emerald-100 px-5 py-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Funnel className="w-4 h-4 text-emerald-600" />
                  Filterlar
                </h3>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-5">
                <select
                  value={draftFilters.statusFilter}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({ ...prev, statusFilter: e.target.value }))
                  }
                  className="h-10 rounded-lg border border-emerald-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <select
                  value={draftFilters.paidFilter}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({ ...prev, paidFilter: e.target.value }))
                  }
                  className="h-10 rounded-lg border border-emerald-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {PAID_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <select
                  value={draftFilters.paymentTypeFilter}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({ ...prev, paymentTypeFilter: e.target.value }))
                  }
                  className="h-10 rounded-lg border border-emerald-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {PAYMENT_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <select
                  value={draftFilters.dateSort}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({ ...prev, dateSort: e.target.value }))
                  }
                  className="h-10 rounded-lg border border-emerald-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {SORT_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={draftFilters.dateFrom}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                  }
                  className="h-10 rounded-lg border border-emerald-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="date"
                  value={draftFilters.dateTo}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                  }
                  className="h-10 rounded-lg border border-emerald-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-emerald-100 bg-slate-50 px-5 py-4">
                <button
                  type="button"
                  onClick={() =>
                    setDraftFilters({
                      statusFilter: "",
                      paidFilter: "",
                      paymentTypeFilter: "",
                      dateFrom: "",
                      dateTo: "",
                      dateSort: "desc",
                    })
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Tozalash
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Qo'llash
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showColumnSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0, scaleY: 0 }}
            animate={{ height: "auto", opacity: 1, scaleY: 1 }}
            exit={{ height: 0, opacity: 0, scaleY: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-64 z-50"
            style={{
              top: `${modalPosition.top}px`,
              right: `${modalPosition.right}px`,
              transformOrigin: "top right",
            }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Ustun sozlamalari</h3>
                <button onClick={closeColumnModal} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center justify-end space-x-2 cursor-pointer"
                  >
                    <span className="text-sm text-gray-700">
                      {typeof col.label === "string" ? col.label : "Sozlama"}
                    </span>
                    <input
                      type="checkbox"
                      checked={visibleColumns[col.key] ?? true}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded text-green-600"
                    />
                  </label>
                ))}
              </div>
              <div className="border-t pt-3">
                <div className="text-sm text-gray-600 mb-2">Qatorlar soni:</div>
                <div className="flex space-x-1">
                  {[25, 50, 100].map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        setRowsPerPage(num);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1 text-sm border rounded ${
                        rowsPerPage === num
                          ? "bg-green-50 border-green-200 text-green-600"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openActionOrderId && (
          <motion.div
            ref={actionMenuRef}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="fixed z-[70] w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
            style={{ top: actionPosition.top, right: actionPosition.right }}
          >
            <button
              type="button"
              onClick={openEditModal}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <Pencil size={15} />
              Tahrirlash
            </button>
            <button
              type="button"
              onClick={openDeleteConfirm}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
            >
              <Trash2 size={15} />
              O'chirish
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/35 flex items-center justify-center px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            >
              <h3 className="text-lg font-semibold text-slate-900">Buyurtmani o'chirish</h3>
              <p className="mt-2 text-sm text-slate-600">
                Haqiqatan ham bu buyurtmani o'chirmoqchimisiz?
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOrder}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  O'chirish
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <UpdateOrderModal
        showUpdateModal={showUpdateModal}
        setShowUpdateModal={setShowUpdateModal}
        updateData={updateData}
        setUpdateData={setUpdateData}
        handleUpdateOrder={handleUpdateOrder}
        isUpdating={isUpdating}
      />
    </div>
  );
};
