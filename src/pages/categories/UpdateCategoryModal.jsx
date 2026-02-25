import React, { useState, useEffect } from "react";
import { X, Save, AlertCircle, Trash2 } from "lucide-react";

export const UpdateCategoryModal = ({
  isOpen,
  onClose,
  onSave,
  categoryData,
  onDelete,
}) => {
  console.log(categoryData);
  const [formData, setFormData] = useState({
    name: "",
    name_ru: "",
    name_en: "",
    top: false,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle modal opening animation
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

  useEffect(() => {
    if (categoryData) {
      setFormData({
        name: categoryData.name || "",
        name_ru: categoryData.name_ru || "",
        name_en: categoryData.name_en || "",
        top: categoryData.top || false,
      });
    }
  }, [categoryData]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Kategoriya nomi majburiy";
    }

    if (!formData.name_ru.trim()) {
      newErrors.name_ru = "Rus tilidagi nom majburiy";
    }

    if (!formData.name_en.trim()) {
      newErrors.name_en = "Ingliz tilidagi nom majburiy";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!categoryData || !categoryData._id) {
      setErrors({ submit: "Kategoriya ma'lumotlari topilmadi" });
      return;
    }

    setIsLoading(true);

    try {
      await onSave(formData, categoryData._id);
      onClose();
    } catch (error) {
      console.error("Yangilashda xatolik:", error);
      setErrors({ submit: "Yangilashda xatolik yuz berdi" });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      name_ru: "",
      name_en: "",
      top: false,
    });
    setErrors({});
  };

  const handleClose = () => {
    // Reset form to original values
    if (categoryData) {
      setFormData({
        name: categoryData.name || "",
        name_ru: categoryData.name_ru || "",
        name_en: categoryData.name_en || "",
        top: categoryData.top || false,
      });
    }
    setErrors({});
    onClose();
  };

  // Don't render if not visible
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 ease-in-out ${
          isAnimating ? "opacity-30" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-2xl transform transition-all duration-300 ease-in-out ${
            isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Kategoriyani yangilash
              </h2>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 cursor-pointer hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                {errors.submit && (
                  <div className="flex items-center p-3 text-red-800 bg-red-100 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span className="text-sm">{errors.submit}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategoriya nomi (O'zbek){" "}
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
                    placeholder="Kategoriya nomini kiriting"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategoriya nomi (Rus){" "}
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
                    placeholder="Название категории"
                  />
                  {errors.name_ru && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.name_ru}
                    </p>
                  )}
                </div>

                {/* Kategoriya nomi (English) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategoriya nomi (Ingliz){" "}
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
                    placeholder="Kategoriya nomini kiriting"
                  />
                  {errors.name_en && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.name_en}
                    </p>
                  )}
                </div>

                {/* Top kategoriya checkbox */}
                <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    name="top"
                    id="top"
                    checked={formData.top}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                  />
                  <label
                    htmlFor="top"
                    className="ml-3 text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    Top kategoriya
                  </label>
                  <div className="ml-auto">
                    <span className="text-xs text-gray-500">
                      Asosiy sahifada ko'rsatish
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onDelete && onDelete(categoryData)}
                    className="flex items-center px-4 cursor-pointer py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    O'chirish
                  </button>

                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 text-sm cursor-pointer font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                      disabled={isLoading}
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleSubmit}
                      className="flex items-center px-4 cursor-pointer py-2 text-sm font-medium text-white bg-[#2db789] border border-transparent rounded-lg  focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Saqlanmoqda...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Yangilash
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
    </div>
  );
};
