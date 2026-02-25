import { useEffect, useRef, useState } from "react";
import $api from "../../../http/api";
import { X, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useSelector } from "react-redux";

export default function UpdateNotificationModal({
  isOpen,
  onClose,
  productId,
  onUpdate,
}) {
  const { user } = useSelector((state) => state.user);
  const actorCompanyId = user?.companyId?._id || user?.companyId || null;
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const [formData, setFormData] = useState({
    message: "",
    message_ru: "",
    message_en: "",
    userId: "",
    forAllUsers: true,
  });
  const [errors, setErrors] = useState({});

  // User selection state
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [allUsers, setAllUsers] = useState([]);

  // Animation control
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setIsVisible(true);
      setTimeout(() => {
        setIsAnimating(true);
      }, 10);
    } else {
      document.body.style.overflow = "auto";
      setIsAnimating(false);
      setTimeout(() => {
        setIsVisible(false);
      }, 300);
    }
  }, [isOpen]);

  // Notification ma'lumotlarini olish
  const fetchNotificationData = async () => {
    try {
      setIsLoading(true);
      const response = await $api.get("/notifications/all");

      // productId orqali kerakli notificationni topish
      const notification = response.data.notificationsAll.find(
        (item) => item._id === productId
      );

      if (notification) {
        setFormData({
          message: notification.message || "",
          message_ru: notification.message_ru || "",
          message_en: notification.message_en || "",
          userId: notification.userId?._id || "",
          forAllUsers: notification.forAllUsers,
        });
      }
    } catch (error) {
      console.error("Notification ma'lumotlarini yuklashda xatolik:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Foydalanuvchilarni olish
  const fetchUsers = async () => {
    try {
      const params = {
        limit: 50,
        page: currentPage,
        query: searchTerm,
      };
      if (actorCompanyId) {
        params.companyId = actorCompanyId;
      }

      const response = await $api.get("/users/get/all", { params });
      const payload = response.data || {};
      const rawUsers = payload?.data || payload?.users || [];

      const filteredUsers = rawUsers.filter((item) => {
        const role = String(item?.role || "").toLowerCase();
        const itemCompanyId = item?.companyId?._id || item?.companyId;
        const sameCompany = actorCompanyId
          ? String(itemCompanyId || "") === String(actorCompanyId)
          : true;
        return role === "employee" && sameCompany;
      });

      setAllUsers({
        ...payload,
        data: filteredUsers,
      });
    } catch (error) {
      console.error("Foydalanuvchilarni yuklashda xatolik:", error);
    }
  };

  // Modal ochilganda notification va foydalanuvchilarni olish
  useEffect(() => {
    if (isOpen && productId) {
      fetchNotificationData();
      fetchUsers();
    }
  }, [isOpen, productId]);

  // Users fetch when search or page changes
  useEffect(() => {
    if (isOpen && !formData.forAllUsers) {
      fetchUsers();
    }
  }, [currentPage, searchTerm, isOpen, formData.forAllUsers]);

  // ESC tugmasi bilan yopish
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [isOpen, onClose]);

  // Input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Send type change handler
  const handleSendTypeChange = (sendToAll) => {
    setFormData((prev) => ({
      ...prev,
      forAllUsers: sendToAll,
      userId: sendToAll ? "" : prev.userId,
    }));
    if (!sendToAll) {
      setSearchTerm("");
      setCurrentPage(1);
    }
  };

  // User select handler
  const handleUserSelect = (userId) => {
    setFormData((prev) => ({
      ...prev,
      userId: prev.userId === userId ? "" : userId,
    }));
  };

  // Search change handler
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Validatsiya funksiyasi
  const validateForm = () => {
    const newErrors = {};
    if (!formData.message.trim()) {
      newErrors.message = "Xabar (O'zbek) majburiy";
    }
    if (!formData.message_ru.trim()) {
      newErrors.message_ru = "Xabar (Rus) majburiy";
    }
    if (!formData.message_en.trim()) {
      newErrors.message_en = "Xabar (Ingliz) majburiy";
    }
    if (!formData.forAllUsers && !formData.userId) {
      newErrors.userId = "Foydalanuvchi tanlanishi kerak";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Bildirishnomani yangilash
  const handleUpdate = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      const dataToSend = {
        message: formData.message,
        message_ru: formData.message_ru,
        message_en: formData.message_en,
        userId: formData.forAllUsers ? null : formData.userId,
        forAllUsers: formData.forAllUsers,
      };

      const response = await $api.patch(
        `/notifications/update/${productId}`,
        dataToSend
      );

      console.log("Bildirishnoma muvaffaqiyatli yangilandi:", response.data);
      onUpdate(response.data);
      onClose();
    } catch (error) {
      console.error("Bildirishnomani yangilashda xatolik:", error);
   
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 ease-in-out ${
          isAnimating ? "opacity-30" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div className="relative z-50 flex h-full items-center justify-end ">
        <div
          className={`w-3/5 h-screen bg-white shadow-2xl transform transition-all duration-300 ease-in-out ${
            isAnimating
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0"
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Bildirishnomani tahrirlash
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 cursor-pointer hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-600">
                    Ma'lumotlar yuklanmoqda...
                  </span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Xabar (O'zbek) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Xabar (O'zbek) <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                        errors.message
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                      placeholder="Xabar nomini kiriting"
                    />
                    {errors.message && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.message}
                      </p>
                    )}
                  </div>

                  {/* Xabar (Rus) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Xabar (Rus) <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      name="message_ru"
                      value={formData.message_ru}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                        errors.message_ru
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                      placeholder="Название сообщения"
                    />
                    {errors.message_ru && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.message_ru}
                      </p>
                    )}
                  </div>

                  {/* Xabar (Ingliz) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Xabar (Ingliz) <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      name="message_en"
                      value={formData.message_en}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                        errors.message_en
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                      placeholder="Xabar matnini kiriting"
                    />
                    {errors.message_en && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.message_en}
                      </p>
                    )}
                  </div>

                  {/* Kimga yuborish */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Kimga yuborish <span className="text-red-800">*</span>
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="sendType"
                          checked={formData.forAllUsers}
                          onChange={() => handleSendTypeChange(true)}
                          className="mr-3 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">
                          Hamma foydalanuvchilarga
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="sendType"
                          checked={!formData.forAllUsers}
                          onChange={() => handleSendTypeChange(false)}
                          className="mr-3 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">
                          Tanlangan foydalanuvchilarga
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* User Selection */}
                  {!formData.forAllUsers && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            placeholder="Foydalanuvchini qidiring..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                          />
                        </div>
                      </div>

                      {errors.userId && (
                        <p className="mb-3 text-sm text-red-600">
                          {errors.userId}
                        </p>
                      )}

                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {allUsers?.data?.length > 0 ? (
                          allUsers.data.map((user) => (
                            <label
                              key={user._id}
                              className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              <input
                                type="radio"
                                name="selectedUser"
                                checked={formData.userId === user._id}
                                onChange={() => handleUserSelect(user._id)}
                                className="mr-3 text-green-600 focus:ring-green-500"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {user.email} • {user.phoneNumber}
                                </div>
                              </div>
                            </label>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">
                            Foydalanuvchi topilmadi
                          </p>
                        )}
                      </div>

                      {/* Pagination */}
                      {allUsers?.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <button
                            disabled={currentPage === 1}
                            onClick={() =>
                              setCurrentPage((prev) => Math.max(prev - 1, 1))
                            }
                            className="flex items-center text-sm text-green-600 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Oldingi
                          </button>
                          <span className="text-sm text-gray-600">
                            {allUsers.currentPage} / {allUsers.totalPages}
                          </span>
                          <button
                            disabled={currentPage === allUsers.totalPages}
                            onClick={() =>
                              setCurrentPage((prev) =>
                                Math.min(prev + 1, allUsers.totalPages)
                              )
                            }
                            className="flex items-center text-sm text-green-600 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
                          >
                            Keyingi
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm cursor-pointer font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  disabled={isSubmitting}
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={isSubmitting || isLoading}
                  className="flex items-center px-4 cursor-pointer py-2 text-sm font-medium text-white bg-[#165275] border border-transparent rounded hover:bg-[#165275d4] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saqlanmoqda...
                    </>
                  ) : (
                    "Saqlash"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
