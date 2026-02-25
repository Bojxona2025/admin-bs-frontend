import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCcw, Search, Settings, Plus, Trash2 } from "lucide-react";
import GlobalTable from "../../components/global_table/GlobalTable";
import $api from "../../http/api";
import { CreateNotificationsModal } from "../../components/modals/notifications/CreateNotificationsModal";
import DeleteModal from "../../components/modals/delete/DeleteModal";
import { connectNotificationRealtime } from "../../utils/notificationRealtime";
import { useSelector } from "react-redux";

export const NotificationAdminPanel = () => {
  const navigate = useNavigate();
  const { userId } = useParams(); // userId ni URL dan olish
  const { user } = useSelector((state) => state.user);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [rowsPerLimit, setRowsPerLimit] = useState(30);
  const [dataLoad, setDataLoad] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const settingsButtonRef = useRef(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, right: 0 });
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    message: true,
    message_ru: true,
    message_en: true,
    forAllUsers: true,
    userId: true,
    setting: true,
  });
  const [productData, setProductData] = useState([]);
  const [paginationData, setPaginationData] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    position: { top: 0, left: 0 },
    productId: null,
  });

  // Qator bosilganda detail sahifasiga o'tish
  const handleRowClick = (rowData) => {
    if (rowData.userId && rowData.userId !== "Noma'lum") {
      const originalProduct = productData.find(
        (item) => item.id === rowData.id
      );
      if (originalProduct && originalProduct.originalUserId) {
        navigate(`/notifications/${originalProduct.originalUserId}`);
      } else {
        navigate(`/notifications/${rowData.id}`);
      }
    } else {
      navigate(`/notifications/${rowData.id}`);
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      await $api.delete(`/notifications/delete/${id}`);
      fetchProducts(paginationData.currentPage);
    } catch (error) {
      console.error("O'chirishda xato:", error);
    } finally {
      handleCloseModal();
    }
  };

  const handleProductUpdate = (updatedProduct) => {
    console.log("Mahsulot yangilandi:", updatedProduct);
    // Ro'yxatni qayta yuklash
    fetchProducts(paginationData.currentPage);
  };

  const handleSettingsClick = () => {
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
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "message", label: "Xabar (O'zbek)" },
    { key: "message_ru", label: "Xabar (Rus)" },
    { key: "message_en", label: "Xabar (Ingliz)" },
    { key: "userId", label: "Qabul qiluvchi" },
    { key: "forAllUsers", label: "Barcha foydalanuvchilar uchun" },
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
  ];

  const handleDeleteClick = (e, productId) => {
    e.stopPropagation(); // Row click event ni to'xtatish
    const rect = e.currentTarget.getBoundingClientRect();
    setDeleteModal({
      isOpen: true,
      position: {
        top: rect.bottom + window.scrollY + 5,
        right: window.innerWidth - rect.right + window.scrollX,
      },
      productId,
    });
  };

  const handleCloseModal = () => {
    setDeleteModal({ ...deleteModal, isOpen: false });
  };

  const toggleColumn = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setPaginationData((prev) => ({ ...prev, currentPage: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchProducts(1);
  }, [userId, rowsPerLimit, debouncedSearchTerm]); // userId/filter o'zgarganda qayta yuklash

  useEffect(() => {
    const disconnect = connectNotificationRealtime({
      onRefresh: () => fetchProducts(paginationData.currentPage),
    });

    const handleCreated = () => fetchProducts(paginationData.currentPage);
    window.addEventListener("notification:created", handleCreated);

    return () => {
      disconnect?.();
      window.removeEventListener("notification:created", handleCreated);
    };
  }, [paginationData.currentPage]);

  const handlePageChange = (pageNumber) => {
    fetchProducts(pageNumber);
  };

  async function fetchProducts(page = paginationData.currentPage) {
    setDataLoad(true);
    try {
      let endpoint = "/notifications/all";
      const params = {
        page,
        limit: rowsPerLimit,
      };

      if (debouncedSearchTerm) {
        params.query = debouncedSearchTerm;
        params.search = debouncedSearchTerm;
      }

      let { data } = await $api.get(endpoint, { params });

      const notifications =
        data.notifications ||
        data.notificationsAll ||
        data.data ||
        [];

      const formatted = notifications
        .filter((notification) => {
          // Agar userId mavjud bo'lsa, faqat shu user ga tegishli yoki forAllUsers=true bo'lgan xabarlarni ko'rsatish
          if (userId) {
            const notificationUserId =
              notification?.userId?._id || notification?.userId || null;
            return (
              String(notificationUserId || "") === String(userId) ||
              notification.forAllUsers
            );
          }
          return true; // Agar userId yo'q bo'lsa, barcha xabarlarni ko'rsatish
        })
        .map((product) => ({
          id: product._id,
          message: product.message || "Noma'lum",
          message_ru: product.message_ru,
          message_en: product.message_en,
          forAllUsers: product.forAllUsers ? "Ha" : "Yo'q",
          userId: product.userId
            ? `${product.userId.firstName} ${product.userId.lastName}`
            : "Noma'lum",
          originalUserId: product.userId?._id, // Original user ID ni saqlash
          setting: (
            <button
              onClick={(e) => handleDeleteClick(e, product._id)}
              className="select-none cursor-pointer p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              title="O'chirish"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ),
        }));

      setProductData(formatted);
      const totalItems =
        data.totalNotifications ||
        data.total ||
        data.count ||
        formatted.length;
      const totalPages =
        data.totalPages || Math.max(1, Math.ceil(totalItems / rowsPerLimit));

      setPaginationData({
        currentPage: data.currentPage || data.page || page,
        totalPages,
        totalItems,
      });
    } catch (error) {
      console.log(error);
      setProductData([]);
      setPaginationData({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
      });
    } finally {
      setDataLoad(false);
    }
  }

  async function handleCreateNotification(data) {
    try {
      const basePayload = {
        ...data,
        notificationType: data.notificationType || "system",
      };
      if (user?.role === "superadmin" && data.companyId) {
        basePayload.companyId = data.companyId;
      }

      let notificationsCreated = [];
      if (!basePayload.forAllUsers && Array.isArray(data.userIds) && data.userIds.length > 0) {
        const requests = data.userIds.map((uid) =>
          $api.post("/notifications/create", {
            ...basePayload,
            userId: uid,
            forAllUsers: false,
          })
        );
        const responses = await Promise.all(requests);
        notificationsCreated = responses
          .map((res) => res?.data?.createdData)
          .filter(Boolean);
      } else {
        const { data: notification } = await $api.post(
          "/notifications/create",
          basePayload
        );
        if (notification?.createdData) {
          notificationsCreated = [notification.createdData];
        }
      }

      if (notificationsCreated.length > 0) {
        const prepared = notificationsCreated.map((created) => ({
          id: created._id,
          name: created.name,
          name_ru: created.name_ru,
          name_en: created.name_en,
          message: created.message || "Noma'lum",
          message_ru: created.message_ru,
          message_en: created.message_en,
          forAllUsers: created.forAllUsers ? "Ha" : "Yo'q",
          userId: created.userId
            ? `${created.userId.firstName} ${created.userId.lastName}`
            : "Noma'lum",
          originalUserId: created.userId?._id,
          setting: (
            <button
              onClick={(e) => handleDeleteClick(e, created._id)}
              className="select-none cursor-pointer p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              title="O'chirish"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ),
        }));
        setProductData((prev) => [...prepared, ...prev]);
      }

      window.dispatchEvent(new CustomEvent("notification:created"));
      fetchProducts(1);
    } catch (error) {
      console.log("Xatolik:", error);
    }
  }

  const filteredData = useMemo(() => productData, [productData]);

  return (
    <div className="relative bg-slate-50 min-h-[calc(100vh-4rem)] p-3 sm:p-5 lg:p-6 rounded-2xl">
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-5 mb-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {userId ? "Foydalanuvchi xabarlari" : "Bildirishnomalar"}
              </h1>
              <RefreshCcw
                size={14}
                className="text-slate-500 cursor-pointer hover:text-emerald-700 transition-colors"
                onClick={() => fetchProducts(paginationData.currentPage)}
              />
            </div>
            <div className="flex items-center gap-3">
              {!userId && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center cursor-pointer space-x-2 px-4 py-2 bg-[#249B73] text-white rounded-lg hover:bg-[#1f8966] focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yangi bildirishnoma</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Bildirishnoma qidirish"
                  className="w-full pl-10 pr-4 py-2.5 border outline-none border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

            <div className="text-sm text-slate-600">
              Jami: <span className="font-semibold text-slate-900">{paginationData.totalItems}</span> ta
            </div>
          </div>
        </div>
      </div>

      <GlobalTable
        columns={columns}
        visibleColumns={visibleColumns}
        sampleData={filteredData}
        load={dataLoad}
        useServerPagination={true}
        currentPage={paginationData.currentPage}
        totalPages={paginationData.totalPages}
        totalItems={paginationData.totalItems}
        itemsPerPage={rowsPerLimit}
        onPageChange={handlePageChange}
        onRowClick={handleRowClick}
      />

      {!userId && (
        <CreateNotificationsModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateNotification}
        />
      )}

      <AnimatePresence>
        {showColumnSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0, scaleY: 0 }}
            animate={{ height: "auto", opacity: 1, scaleY: 1 }}
            exit={{ height: 0, opacity: 0, scaleY: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden w-64 z-50"
            style={{
              top: `${modalPosition.top}px`,
              right: `${modalPosition.right}px`,
              transformOrigin: "top right",
            }}
          >
            <div className="p-4">
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center justify-end space-x-2 cursor-pointer"
                  >
                    <span className="text-sm text-slate-700">
                      {typeof col.label === "string" ? col.label : "⚙️"}
                    </span>
                    <input
                      type="checkbox"
                      checked={visibleColumns[col.key] ?? true}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded text-green-600 cursor-pointer"
                    />
                  </label>
                ))}
              </div>

              <div className="pt-2 text-center">
                <div className="text-sm text-slate-700 font-medium mb-2">
                  Qatorlar soni:
                </div>
                <div className="inline-flex border border-slate-300 rounded overflow-hidden">
                  {[30, 50, 100].map((num, idx) => (
                    <button
                      key={num}
                      onClick={() => {
                        setRowsPerLimit(num);
                        setPaginationData((prev) => ({ ...prev, currentPage: 1 }));
                      }}
                      className={`px-4 py-1 text-sm border-l first:border-l-0 cursor-pointer border-slate-300
          ${idx === 0 ? "rounded-l" : ""} 
          ${idx === 2 ? "rounded-r" : ""}
          ${
            rowsPerLimit === num
              ? "bg-[#249B73] text-white"
              : "bg-white text-slate-700 hover:bg-slate-100"
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

      <DeleteModal
        isOpen={deleteModal.isOpen}
        position={deleteModal.position}
        onClose={handleCloseModal}
        onDelete={handleDeleteProduct}
        productId={deleteModal.productId}
        onUpdate={handleProductUpdate}
        isDelete={true}
        isUpdate={true}
      />
    </div>
  );
};
