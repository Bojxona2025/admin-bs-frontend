import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

export const CreateSubCategoryModal = ({
  isOpen,
  onClose,
  onSave,
  categoryId,
  categoryName,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    name_ru: "",
    name_en: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
      newErrors.name = "Nom maydoni talab qilinadi";
    }

    if (!formData.name_ru.trim()) {
      newErrors.name_ru = "Rus tilida nom talab qilinadi";
    }

    if (!formData.name_en.trim()) {
      newErrors.name_en = "Ingliz tilida nom talab qilinadi";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const dataToSend = {
        ...formData,
        categoryId: categoryId,
      };

      await onSave(dataToSend, categoryId);

      // Reset form
      setFormData({
        name: "",
        name_ru: "",
        name_en: "",
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error("Sub-kategoriya yaratishda xatolik:", error);
      setErrors({
        submit:
          error.response?.data?.message ||
          "Sub-kategoriya yaratishda xatolik yuz berdi",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      name_ru: "",
      name_en: "",
    });
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
          className={`w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-2xl transform transition-all duration-300 ease-in-out mx-4 ${
            isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Sub-kategoriya yaratish
              </h2>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 cursor-pointer hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                {categoryName && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">
                      <span className="font-medium">Asosiy kategoriya:</span>{" "}
                      {categoryName}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Nom (UZ) <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border outline-none rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                        errors.name
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                      placeholder="Sub-kategoriya nomini kiriting"
                      disabled={loading}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="name_ru"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Nom (RU) <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      id="name_ru"
                      name="name_ru"
                      value={formData.name_ru}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border outline-none rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                        errors.name_ru
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                      placeholder="Название подкategории"
                      disabled={loading}
                    />
                    {errors.name_ru && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.name_ru}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="name_en"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Nom (EN) <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      id="name_en"
                      name="name_en"
                      value={formData.name_en}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border outline-none rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                        errors.name_en
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                      placeholder="Sub-category name"
                      disabled={loading}
                    />
                    {errors.name_en && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.name_en}
                      </p>
                    )}
                  </div>

                  {errors.submit && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{errors.submit}</p>
                    </div>
                  )}
                </form>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-start space-x-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm cursor-pointer font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    disabled={loading}
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    className="flex items-center px-4 cursor-pointer py-2 text-sm font-medium text-white bg-[#2db789] border border-transparent rounded-lg focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Yaratilmoqda...
                      </>
                    ) : (
                      "Yaratish"
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
