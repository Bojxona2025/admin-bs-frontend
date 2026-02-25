import { useState, useEffect } from "react";
import { X, Save, AlertCircle, Paperclip } from "lucide-react";

export const CreateCategoryModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    name_ru: "",
    name_en: "",
    category_img: null,
  });

  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setIsVisible(true);
      setTimeout(() => {
        setIsAnimating(true);
      }, 10);
    } else {
       document.body.style.overflow = 'auto';
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

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({
          ...prev,
          category_img: "Faqat rasm fayllari ruxsat etiladi",
        }));
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          category_img: "Fayl hajmi 5MB dan kichik bo'lishi kerak",
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        category_img: file,
      }));

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);

      if (errors.category_img) {
        setErrors((prev) => ({
          ...prev,
          category_img: "",
        }));
      }
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

    if (!formData.category_img) {
      newErrors.category_img = "Kategoriya rasmi majburiy";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("name_ru", formData.name_ru);
      formDataToSend.append("name_en", formData.name_en);
      formDataToSend.append("category_img", formData.category_img);

      await onSave(formDataToSend);

      resetForm();
      onClose();
    } catch (error) {
      console.error("Kategoriya yaratishda xatolik:", error);
      setErrors({ submit: "Kategoriya yaratishda xatolik yuz berdi" });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      name_ru: "",
      name_en: "",
      category_img: null,
    });
    setImagePreview(null);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

 
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">

      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 ease-in-out ${
          isAnimating ? "opacity-30" : "opacity-0"
        }`}
        onClick={handleClose}
      />

     
      <div className="relative z-50 flex min-h-full items-center justify-end">
        <div
          className={`w-1/2 h-screen bg-white shadow-2xl transform transition-all duration-300 ease-in-out ${
            isAnimating
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0"
          }`}
        >
          <div className="flex flex-col h-full">
          
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Yangi Kategoriya Yaratish
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
                    Kategoriya nomi (O'zbek) <span className="text-red-800">*</span>
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

                {/* Name Russian */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategoriya nomi (Rus) <span className="text-red-800">*</span>
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

                {/* Name English */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategoriya nomi (Ingliz) <span className="text-red-800">*</span>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategoriya rasmi <span className="text-red-800">*</span>
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      errors.category_img
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {imagePreview ? (
                      <div className="space-y-4">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="mx-auto h-32 w-32 object-cover rounded-lg"
                        />
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(null);
                              setFormData((prev) => ({
                                ...prev,
                                category_img: null,
                              }));
                            }}
                            className="text-sm cursor-pointer text-red-600 hover:text-red-800"
                          >
                            Olib tashlash
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Paperclip className="w-8 h-8 text-gray-400 mx-auto" />
                        <div className="text-sm text-gray-600">
                          <label
                            htmlFor="image-upload"
                            className="cursor-pointer text-green-600 hover:text-green-800"
                          >
                            Rasm yuklash
                          </label>
                          <p className="mt-1">PNG, JPG, GIF (max 5MB)</p>
                        </div>
                      </div>
                    )}
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>
                  {errors.category_img && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.category_img}
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm cursor-pointer font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleSubmit}
                    className="flex items-center px-4 cursor-pointer py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saqlanmoqda...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Saqlash
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
