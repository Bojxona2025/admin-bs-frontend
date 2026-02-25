import $api from "../../http/api";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

import { motion, AnimatePresence } from "framer-motion";
import GlobalTable from "../../components/global_table/GlobalTable";
import {
  Factory,
  RefreshCcw,
  Search,
  Settings,
  X,
  Plus,
  ChevronUp,
  ChevronDown,
  ArrowDownWideNarrow,
  Send,
  SendHorizontal,
} from "lucide-react";
import ActionModal from "../../components/modals/action/ActionModal";
import { formatDate } from "../../utils/functions/functions.utils";
import QRCodeScanner from "./CamScan";

export const OrderPage = () => {
  const navigate = useNavigate();
  const [sendModelOpen, setSendModelOpen] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [dataLoad, setDataLoad] = useState(false);
  const settingsButtonRef = useRef(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, right: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [modalPosition2, setModalPosition2] = useState({ top: 0, right: 0 });

  // Filter states
  const [paidFilter, setPaidFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateSort, setDateSort] = useState("desc");

  const [visibleColumns, setVisibleColumns] = useState({
    product: true,
    paid: true,
    paymentMethodOnline: true,
    user_name: true,
    user_phoneNumber: true,
    date: true,
    location: true,
    selling_price: true,
    status: true,
    setting: true,
  });
  const [emuData, setEmuData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [paginationData, setPaginationData] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [updateData, setUpdateData] = useState({
    location: "",
    status: "yetkazish_jarayonida",
    paid: false,
    paymentMethodOnline: false,
    canceled: false,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const debounceRef = useRef(null);

  // Memoize the debounce function to prevent recreation on every render
  const debouncedSetSearch = useCallback((value) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedSearchTerm(value);
    }, 500);
  }, []);

  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchTerm(value);
      debouncedSetSearch(value);
    },
    [debouncedSetSearch]
  );

  function handleSend(e, product) {
    e.stopPropagation();
    setEmuData(product);
    setSendModelOpen(true);
    // Handle send action for the specific product
  }

  // Filter handlers
  const handlePaidFilterToggle = useCallback(() => {
    if (paidFilter === "") {
      setPaidFilter("true");
    } else if (paidFilter === "true") {
      setPaidFilter("false");
    } else {
      setPaidFilter("");
    }
    setCurrentPage(1);
  }, [paidFilter]);

  const handleStatusFilterChange = useCallback((status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  }, []);

  const handleDateSortToggle = useCallback(() => {
    if (dateSort === "desc") {
      setDateSort("asc");
    } else if (dateSort === "asc") {
      setDateSort("desc");
    }
    setCurrentPage(1);
  }, [dateSort]);

  const fetchProducts = useCallback(
    async (
      page = 1,
      search = "",
      {
        status = statusFilter,
        paid = paidFilter,
        sortByCreatedAt = dateSort,
      } = {}
    ) => {
      setDataLoad(true);
      try {
        const queryParams = new URLSearchParams();

        if (search.trim()) queryParams.append("user_name", search);
        if (status) queryParams.append("status", status);
        if (paid !== "") queryParams.append("paid", paid);
        if (sortByCreatedAt)
          queryParams.append("sortByCreatedAt", sortByCreatedAt);
        queryParams.append("page", page);
        queryParams.append("limit", rowsPerPage);

        const apiURL = `/order/get/all?${queryParams.toString()}`;

        const { data } = await $api.get(apiURL);

        const formatted = data.data.map((product) => ({
          id: product._id,
          product: product.productId?.name || "N/A",
          paid: product.paid ? (
            <div className="text-center h-4 bg-[#249B73] rounded text-white">
              To'langan
            </div>
          ) : (
            <div className="text-center h-4 bg-red-500 rounded text-white">
              To'lanmagan
            </div>
          ),
          location: product.location?.address || "Noma’lum",
          paymentMethodOnline: product.paymentMethodOnline ? "Online" : "Naqd",
          user_name: `${product.user?.firstName || ""} ${
            product.user?.lastName || ""
          }`.trim(),
          user_phoneNumber: product.user?.phoneNumber || "",
          date: formatDate(product.createdAt),
          selling_price: product.sellingPrice,
          status: product.status,
          setting: (
            <div className="flex items-center gap-2">
              <img
                src="../../../public/clear.cache.gif"
                alt="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.target.getBoundingClientRect();
                  setModalPosition2({
                    top: rect.bottom + window.scrollY,
                    right: window.innerWidth - rect.right,
                  });
                  setSelectedProductId(product._id);
                  setUpdateData({
                    id: product._id,
                    location: product.location,
                    status: product.status,
                    paid: product.paid,
                    paymentMethodOnline: product.paymentMethodOnline,
                    canceled: product.canceled || false,
                  });
                  setIsActionModalOpen(true);
                }}
                style={{
                  width: "14px",
                  height: "13px",
                  marginLeft: "6px",
                  background:
                    "url(../../../../../public/E0D95F7D8A23F376D1CE74F712D5D566.cache.png) no-repeat -845px -156px",
                }}
                border="0"
              />
              <SendHorizontal
                size={14}
                className="text-[#2db789]"
                onClick={(e) => handleSend(e, product)}
              />
            </div>
          ),
        }));

        setProductData(formatted);
        setPaginationData({
          currentPage: data.pagination.page,
          totalItems: data.pagination.total,
          totalPages: data.pagination.pages,
        });

        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.pages);
        setTotalItems(data.pagination.total);
      } catch (error) {
        setProductData([]);
        setPaginationData({});
        setCurrentPage(1);
        setTotalPages(1);
        setTotalItems(0);
      } finally {
        setDataLoad(false);
      }
    },
    [rowsPerPage, statusFilter, paidFilter, dateSort]
  );

  // Effect for filters
  useEffect(() => {
    setCurrentPage(1);
    fetchProducts(1, debouncedSearchTerm);
  }, [paidFilter, statusFilter, dateSort, fetchProducts, debouncedSearchTerm]);

  useEffect(() => {
    console.log("Debounced search term:", debouncedSearchTerm);
    setCurrentPage(1);
    fetchProducts(1, debouncedSearchTerm);
  }, [debouncedSearchTerm, fetchProducts]);

  const handleUpdateOrder = useCallback(async () => {
    try {
      setIsUpdating(true);
      const { id, ...rest } = updateData;
      await $api.patch(`/order/update/${id}`, rest);
      fetchProducts(currentPage, debouncedSearchTerm);
      setShowUpdateModal(false);
    } catch (err) {
      console.error("Update error:", err);
    } finally {
      setIsUpdating(false);
    }
  }, [updateData, fetchProducts, currentPage, debouncedSearchTerm]);

  const handleSettingsClick = useCallback(() => {
    if (settingsButtonRef.current && !showColumnSettings) {
      const rect = settingsButtonRef.current.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;

      setModalPosition({
        top: rect.bottom + scrollTop + 5,
        right: window.innerWidth - rect.left - 60,
      });
    }
    setShowColumnSettings(!showColumnSettings);
    setIsModalOpen(!showColumnSettings);
  }, [showColumnSettings]);

  const handleRefresh = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setCurrentPage(1);
    setPaidFilter("");
    setStatusFilter("");
    setDateSort("desc");
    fetchProducts(1, "");
  }, [fetchProducts]);

  const handlePageChange = useCallback(
    (pageNumber) => {
      setCurrentPage(pageNumber);
      fetchProducts(pageNumber, debouncedSearchTerm);
    },
    [fetchProducts, debouncedSearchTerm]
  );

  const handleRowClick = useCallback(
    (row) => {
      console.log(row);
      navigate(`/sales/order/${row.id}`);
    },
    [navigate]
  );

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setCurrentPage(1);
    fetchProducts(1, "", {});
  }, [fetchProducts]);

  const closeModal = useCallback(() => {
    setShowColumnSettings(false);
    setIsModalOpen(false);
  }, []);

  const toggleColumn = useCallback((columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  }, []);

  useEffect(() => {
    fetchProducts(1, "");
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${
        window.innerWidth - document.documentElement.clientWidth
      }px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isModalOpen]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const statusOptions = [
    { value: "", label: "Barchasi" },
    { value: "qabul_qilinmagan", label: "Qabul qilinmagan" },
    { value: "jarayonda", label: "Jarayonda" },
    { value: "yetkazish_jarayonida", label: "Yetkazish jarayonida" },
    { value: "yetkazilgan", label: "Yetkazilgan" },
  ];

  const columns = useMemo(
    () => [
      { key: "product", label: "Mahsulot" },
      {
        key: "paid",
        label: (
          <div className="flex items-center space-x-1">
            <span>Tolov holati</span>
            <button
              onClick={handlePaidFilterToggle}
              className="p-1 hover:bg-gray-100 rounded"
              title={
                paidFilter === ""
                  ? "Barcha"
                  : paidFilter === "true"
                  ? "To'langan"
                  : "To'lanmagan"
              }
            >
              {paidFilter === "" ? (
                <ArrowDownWideNarrow className="w-3 h-3 text-green-600 cursor-pointer" />
              ) : paidFilter === "true" ? (
                <ChevronUp className="w-3 h-3 text-green-600 cursor-pointer" />
              ) : (
                <ChevronDown className="w-3 h-3 text-red-600 cursor-pointer" />
              )}
            </button>
          </div>
        ),
      },
      { key: "paymentMethodOnline", label: "Tolov turi" },
      { key: "user_name", label: "Mijoz" },
      { key: "user_phoneNumber", label: "Mijoz telefon raqami" },
      {
        key: "date",
        label: (
          <div className="flex items-center space-x-1">
            <span>Buyurtma sanasi</span>
            <button
              onClick={handleDateSortToggle}
              className="p-1 hover:bg-gray-100 rounded"
              title={dateSort === "asc" ? "Eskidan yangiga" : "Yangidan eskiga"}
            >
              {dateSort === "" ? (
                <div className="w-3 h-3 mb-1 cursor-pointer">✓</div>
              ) : dateSort === "asc" ? (
                <ChevronUp className="w-3 h-3 text-green-600 cursor-pointer" />
              ) : (
                <ChevronDown className="w-3 h-3 text-green-600 cursor-pointer" />
              )}
            </button>
          </div>
        ),
      },
      { key: "selling_price", label: "Buyurtmaning umumiy narxi" },
      {
        key: "status",
        label: (
          <div className="flex items-center space-x-1">
            <span>Buyurtma holati</span>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="text-xs px-1 py-0.5 pr-6 focus:outline-none focus:ring-1 focus:ring-green-500 appearance-none bg-transparent cursor-pointer opacity-0 absolute inset-0 w-full h-full"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center pointer-events-none">
                <div className="w-4 h-4 mt-1">
                  {statusFilter === "" ? (
                    <ChevronUp className="w-3 h-3 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-green-600" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ),
      },
      { key: "location", label: "Manzil" },
      {
        key: "setting",
        label: (
          <button
            ref={settingsButtonRef}
            className="p-1 hover:bg-gray-100 rounded items-center"
            onClick={handleSettingsClick}
          >
            <Settings className="w-4 h-4 font-[900] text-[#2db789] cursor-pointer" />
          </button>
        ),
      },
    ],
    [
      handleSettingsClick,
      handlePaidFilterToggle,
      handleDateSortToggle,
      handleStatusFilterChange,
      paidFilter,
      dateSort,
      statusFilter,
    ]
  );

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-gradient-to-br from-emerald-50 via-white to-green-50 p-3 sm:p-5 rounded-2xl">
      <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm mb-5 px-4">
        <div>
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">Yechimlar</h1>
              <RefreshCcw
                size={14}
                className="text-[#333] cursor-pointer hover:text-green-600 transition-colors"
                onClick={handleRefresh}
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Yechim qidirish"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10 pr-4 py-1 border outline-none border-emerald-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent w-64"
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <QRCodeScanner />
            </div>
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
                <h3 className="font-medium text-gray-900">
                  Колонка sozlamalari
                </h3>
                <button
                  onClick={closeModal}
                  className="p-1 hover:bg-gray-100 rounded"
                >
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
                      {typeof col.label === "string" ? col.label : "⚙️"}
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

      <ActionModal
        isOpen={isActionModalOpen}
        position={modalPosition2}
        onClose={() => setIsActionModalOpen(false)}
        productId={selectedProductId}
        isDelete={true}
        isUpdate={true}
        updateData={updateData}
        setUpdateData={setUpdateData}
        handleUpdateOrder={handleUpdateOrder}
        isUpdating={isUpdating}
        onDelete={(id) => {
          setProductData((prev) => prev.filter((p) => p.id !== id));
        }}
      />
    </div>
  );
};
