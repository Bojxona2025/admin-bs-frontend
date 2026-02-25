import { useState, useEffect } from "react";
import {
  X,
  Save,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Languages,
} from "lucide-react";
import $api from "../../../http/api";
import { useSelector } from "react-redux";

export const CreateNotificationsModal = ({ isOpen, onClose, onSave }) => {
  const { user } = useSelector((state) => state.user);
  const actorRole = String(user?.role || "").toLowerCase().replace(/[_\s]/g, "");
  const isEmployee = actorRole === "employee";
  const isAdmin = actorRole === "admin";
  const [formData, setFormData] = useState({
    name: "",
    name_ru: "",
    name_en: "",
    message: "",
    message_ru: "",
    message_en: "",
    sendToAllUsers: true,
    selectedUsers: [],
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // User selection state
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [allUsers, setAllUsers] = useState([]);
  const [isOn, setIsOn] = useState(false);
  const isSuperAdmin = actorRole === "superadmin";
  const actorCompanyId = user?.companyId?._id || user?.companyId || null;

  const toggleSwitch = () => {
    setIsOn(!isOn);
  };

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: "",
      submit: "",
    }));
  };

  const handleSendTypeChange = (sendToAll) => {
    if (isEmployee && !sendToAll) return;
    setFormData((prev) => ({
      ...prev,
      sendToAllUsers: sendToAll,
      selectedUsers: sendToAll ? [] : prev.selectedUsers || [],
    }));
    if (!sendToAll) {
      setSearchTerm("");
      setCurrentPage(1);
    }
  };

  const handleUserSelect = (userId) => {
    setFormData((prev) => ({
      ...prev,
      selectedUsers: prev.selectedUsers?.includes(userId)
        ? prev.selectedUsers.filter((id) => id !== userId)
        : [...(prev.selectedUsers || []), userId],
    }));
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (isOpen && !isEmployee) fetchUsers();
  }, [currentPage, searchTerm, isOpen, isEmployee]);

  useEffect(() => {
    if (!isOpen) return;
    if (isEmployee) {
      setFormData((prev) => ({
        ...prev,
        sendToAllUsers: true,
        selectedUsers: [],
      }));
    }
  }, [isOpen, isEmployee]);

  async function fetchUsers() {
    try {
      const params = {
        limit: 50,
        page: currentPage,
        query: searchTerm,
      };
      if (isAdmin && actorCompanyId) {
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
  }

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Xabar nomi majburiy";
    }
    if (!formData.name_ru.trim()) {
      newErrors.name_ru = "Rus tilidagi nom majburiy";
    }
    if (!formData.name_en.trim()) {
      newErrors.name_en = "Ingliz tilidagi nom majburiy";
    }
    if (!formData.message.trim()) {
      newErrors.message = "O'zbek tilidagi xabar majburiy";
    }
    if (!formData.message_ru.trim()) {
      newErrors.message_ru = "Rus tilidagi xabar majburiy";
    }
    if (!formData.message_en.trim()) {
      newErrors.message_en = "Ingliz tilidagi xabar majburiy";
    }
    if (!formData.sendToAllUsers && (!formData.selectedUsers || formData.selectedUsers.length === 0)) {
      newErrors.selectedUsers = "Kamida bitta foydalanuvchi tanlanishi kerak";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTranslate = async () => {
    const sourceName =
      formData.name?.trim() || formData.name_ru?.trim() || formData.name_en?.trim() || "";
    const sourceMessage =
      formData.message?.trim() ||
      formData.message_ru?.trim() ||
      formData.message_en?.trim() ||
      "";

    if (!sourceName && !sourceMessage) {
      setErrors((prev) => ({
        ...prev,
        submit: "Avval kamida bitta tilda sarlavha yoki xabar kiriting",
      }));
      return;
    }

    setIsTranslating(true);
    try {
      const { data } = await $api.post("/integration/translate", {
        name: sourceName || sourceMessage || "",
        description: sourceMessage || sourceName || "",
        short_description: sourceMessage || sourceName || "",
        meta_title: sourceName || sourceMessage || "",
        meta_description: sourceMessage || sourceName || "",
      });

      setFormData((prev) => ({
        ...prev,
        // Qo'lda yozilgan maydonlarni o'zgartirmaymiz, faqat bo'shlarini to'ldiramiz
        name: prev.name || sourceName || "",
        name_ru: data?.name_ru || prev.name_ru,
        name_en: data?.name_en || prev.name_en,
        message: prev.message || sourceMessage || "",
        message_ru: data?.description_ru || prev.message_ru,
        message_en: data?.description_en || prev.message_en,
      }));

      setErrors((prev) => ({
        ...prev,
        submit: "",
      }));
    } catch (error) {
      console.error("Tarjima qilishda xatolik:", error);
      setErrors((prev) => ({
        ...prev,
        submit:
          error?.response?.data?.message ||
          "Tarjima qilishda xatolik yuz berdi",
      }));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    setIsLoading(true);
    try {
      if (isOn === true) {
        if (!formData.sendToAllUsers && formData.selectedUsers?.length > 0) {
          await Promise.all(
            formData.selectedUsers.map((uid) =>
              $api.post("/notifications/fcm/send", {
                userId: uid,
                title: formData.name,
                body: formData.message,
              })
            )
          );
        } else {
          await $api.post("/notifications/fcm/send/all", {
            title: formData.name,
            body: formData.message,
          });
        }
      }

      const dataToSend = {
        name: formData.name,
        name_ru: formData.name_ru,
        name_en: formData.name_en,
        message: formData.message,
        message_ru: formData.message_ru,
        message_en: formData.message_en,
        forAllUsers: formData.sendToAllUsers,
        userId:
          formData.sendToAllUsers || (formData.selectedUsers || []).length === 0
            ? null
            : formData.selectedUsers[0],
        userIds:
          formData.sendToAllUsers || (formData.selectedUsers || []).length === 0
            ? []
            : formData.selectedUsers,
        notificationType: "system",
      };
      if (isSuperAdmin && actorCompanyId) {
        dataToSend.companyId = actorCompanyId;
      }
      await onSave(dataToSend);
      resetForm();
      onClose();
    } catch (error) {
      console.error("Xabar yaratishda xatolik:", error);
      setErrors({ submit: "Xabar yaratishda xatolik yuz berdi" });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      name_ru: "",
      name_en: "",
      message: "",
      message_ru: "",
      message_en: "",
      sendToAllUsers: true,
      selectedUsers: [],
    });
    setErrors({});
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 ease-in-out ${
          isAnimating ? "opacity-45" : "opacity-0"
        }`}
        onClick={handleClose}
      />
      <div className="relative z-50 flex min-h-full items-center justify-center p-4 md:p-6">
        <div
          className={`w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl border border-emerald-100 shadow-2xl transform transition-all duration-300 ease-in-out ${
            isAnimating
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-4 scale-95 opacity-0"
          }`}
        >
          <div className="flex flex-col h-full max-h-[92vh]">
            <div className="flex items-center justify-between p-5 md:p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Yangi Xabar Yaratish
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#249B73] rounded-lg cursor-pointer hover:bg-[#1f8c68] disabled:opacity-60"
                >
                  <Languages className="w-3.5 h-3.5" />
                  {isTranslating ? "Tarjima..." : "Tarjima"}
                </button>
                <button
                  onClick={handleClose}
                  className="p-2 text-gray-400 cursor-pointer hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 p-5 md:p-6 space-y-6 overflow-y-auto">
                {errors.submit && (
                  <div className="flex items-center p-3 text-red-800 bg-red-100 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span className="text-sm">{errors.submit}</span>
                  </div>
                )}
                {/* Message Name (Uzbek) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Xabar sarlavhasi (O'zbek){" "}
                    <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border outline-none rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                      errors.name
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder="Xabar nomini kiriting"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                {/* Message Name (Russian) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Xabar sarlavhasi (Rus){" "}
                    <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="name_ru"
                    value={formData.name_ru}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border outline-none rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                      errors.name_ru
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder="Название сообщения"
                  />
                  {errors.name_ru && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.name_ru}
                    </p>
                  )}
                </div>

                {/* Message Name (English) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Xabar sarlavhasi (Ingliz){" "}
                    <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="name_en"
                    value={formData.name_en}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border outline-none rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                      errors.name_en
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder="Xabar sarlavhasini kiriting"
                  />
                  {errors.name_en && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.name_en}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Xabar (O'zbek) <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border outline-none rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                      errors.message
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder="Xabar matnini kiriting"
                  />
                  {errors.message && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Xabar (Rus) <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="message_ru"
                    value={formData.message_ru}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border outline-none rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                      errors.message_ru
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder="Введите текст сообщения"
                  />
                  {errors.message_ru && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.message_ru}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Xabar (Ingliz) <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="message_en"
                    value={formData.message_en}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border outline-none rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
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

                <div className="rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Mobile uchun yuborish
                  </label>
                  <div
                    onClick={toggleSwitch}
                    className={`relative w-14 h-7 rounded-full cursor-pointer transition-colors duration-300 ${
                      isOn ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                        isOn ? "transform translate-x-7" : ""
                      }`}
                    />
                  </div>
                </div>

                {/* Send To Options */}
                <div className="rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Kimga yuborish <span className="text-red-800">*</span>
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="sendType"
                        checked={formData.sendToAllUsers}
                        onChange={() => handleSendTypeChange(true)}
                        className="mr-3 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">
                        Hamma foydalanuvchilarga
                      </span>
                    </label>
                    {!isEmployee && (
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="sendType"
                          checked={!formData.sendToAllUsers}
                          onChange={() => handleSendTypeChange(false)}
                          className="mr-3 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">
                          Tanlangan foydalanuvchilarga
                        </span>
                      </label>
                    )}
                  </div>
                </div>

                {/* User Selection */}
                {!formData.sendToAllUsers && !isEmployee && (
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

                    {errors.selectedUsers && (
                      <p className="mb-3 text-sm text-red-600">
                        {errors.selectedUsers}
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
                              type="checkbox"
                              name="selectedUser"
                              checked={formData.selectedUsers?.includes(user._id)}
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
                  </div>
                )}
                {allUsers.totalPages > 1 && (
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

              {/* Footer */}
              <div className="p-4 md:p-5 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm cursor-pointer font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleSubmit}
                    className="flex items-center px-4 cursor-pointer py-2 text-sm font-medium text-white bg-[#249B73] border border-transparent rounded hover:bg-[#1f8c68] focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Yuborilmoqda...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Yuborish
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
