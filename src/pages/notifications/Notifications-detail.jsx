import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCcw,
  Search,
  Bell,
  User,
  Calendar,
} from "lucide-react";
import $api from "../../http/api";

const NotificationsDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [paginationData, setPaginationData] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });
  const [rowsPerLimit, setRowsPerLimit] = useState(20);

  // Filterlangan notificationlar
  const filteredNotifications = notifications.filter(
    (notification) =>
      notification.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message_ru
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      notification.message_en?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Notificationlarni olish
  const fetchNotifications = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await $api.get(`/notifications/my`);

      setNotifications(data.notifications || []);
      setPaginationData({
        currentPage: page,
        totalPages: data.totalPages || 1,
        totalItems: data.totalNotifications || 0,
      });
    } catch (error) {
      console.error("Notificationlarni olishda xato:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId, rowsPerLimit]);

  const handlePageChange = (pageNumber) => {
    fetchNotifications(pageNumber);
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("uz-UZ", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Noma'lum sana";
    }
  };

  const getNotificationStatus = (isRead) => {
    return isRead ? "O'qilgan" : "O'qilmagan";
  };

  const getStatusColor = (isRead) => {
    return isRead
      ? "bg-green-100 text-green-800"
      : "bg-yellow-100 text-yellow-800";
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        <span className="ml-2">Yuklanmoqda...</span>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5 lg:p-6 bg-slate-50 min-h-[calc(100vh-4rem)] rounded-2xl">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-5">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex cursor-pointer items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Ortga qaytish</span>
              </button>
              <div className="h-6 w-px bg-slate-300"></div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
                <Bell className="w-6 h-6 text-emerald-600" />
                <span>Foydalanuvchi bildirishnomalari</span>
              </h1>
              <RefreshCcw
                size={16}
                className="text-slate-500 cursor-pointer hover:text-emerald-700 transition-colors"
                onClick={() => fetchNotifications(paginationData.currentPage)}
              />
            </div>
          </div>

          {/* User Info */}
          {userInfo && (
            <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {userInfo.firstName} {userInfo.lastName}
                  </h3>
                  <p className="text-sm text-slate-600">{userInfo.email}</p>
                  <p className="text-xs text-slate-500">ID: {userId}</p>
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="mt-4 flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Xabarlarni qidirish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border outline-none border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-80"
              />
            </div>
            <div className="text-sm text-slate-600">
              Jami: {paginationData.totalItems} ta bildirishnoma
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="p-4 sm:p-6">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Bildirishnomalar topilmadi
              </h3>
              <p className="text-slate-600">
                {searchTerm
                  ? "Qidiruv bo'yicha hech narsa topilmadi"
                  : "Bu foydalanuvchi uchun hali notification yuborilmagan"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification, index) => (
                <div
                  key={notification._id || index}
                  className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            notification.isRead
                          )}`}
                        >
                          {getNotificationStatus(notification.isRead)}
                        </span>
                        <div className="flex items-center text-sm text-slate-500">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(notification.createdAt)}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {notification.message && (
                          <div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              O'zbek:
                            </span>
                            <p className="text-gray-900 mt-1">
                              {notification.message}
                            </p>
                          </div>
                        )}

                        {notification.message_ru && (
                          <div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Русский:
                            </span>
                            <p className="text-gray-900 mt-1">
                              {notification.message_ru}
                            </p>
                          </div>
                        )}

                        {notification.message_en && (
                          <div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              English:
                            </span>
                            <p className="text-gray-900 mt-1">
                              {notification.message_en}
                            </p>
                          </div>
                        )}
                      </div>

                      {notification.forAllUsers && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Barcha foydalanuvchilar uchun
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {paginationData.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {paginationData.currentPage} / {paginationData.totalPages} sahifa
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(paginationData.currentPage - 1)}
                disabled={paginationData.currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Oldingi
              </button>
              <button
                onClick={() => handlePageChange(paginationData.currentPage + 1)}
                disabled={
                  paginationData.currentPage === paginationData.totalPages
                }
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Keyingi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsDetail;
