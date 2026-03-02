import { useState, useEffect } from "react";
import { X, Save, AlertCircle, Paperclip, Languages } from "lucide-react";
import { autoTranslateFromUzbek } from "../../utils/translation/autoTranslate";

export const CreateCategoryModal = ({
  isOpen,
  onClose,
  onSave,
  companies = [],
  isSuperAdmin = false,
  selectedCompanyId = "",
  onCompanyChange,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    name_ru: "",
    name_en: "",
    category_img: null,
  });
  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoTranslating, setIsAutoTranslating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      document.body.style.overflow = "auto";
      setIsAnimating(false);
      setTimeout(() => setIsVisible(false), 220);
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      name: "",
      name_ru: "",
      name_en: "",
      category_img: null,
    });
    setImagePreview(null);
    setErrors({});
    setIsAutoTranslating(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const runAutoTranslate = async () => {
    if (!formData.name.trim()) return;
    setIsAutoTranslating(true);
    try {
      const translated = await autoTranslateFromUzbek(formData.name);
      setFormData((prev) => ({
        ...prev,
        name_ru: prev.name_ru.trim() ? prev.name_ru : translated.name_ru,
        name_en: prev.name_en.trim() ? prev.name_en : translated.name_en,
      }));
    } finally {
      setIsAutoTranslating(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        category_img: "Faqat rasm fayllari ruxsat etiladi",
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        category_img: "Fayl hajmi 5MB dan kichik bo'lishi kerak",
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, category_img: file }));
    const reader = new FileReader();
    reader.onload = (event) => setImagePreview(event.target?.result || null);
    reader.readAsDataURL(file);

    if (errors.category_img) {
      setErrors((prev) => ({ ...prev, category_img: "" }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!formData.name.trim()) nextErrors.name = "Kategoriya nomi majburiy";
    if (!formData.name_ru.trim()) nextErrors.name_ru = "Rus tilidagi nom majburiy";
    if (!formData.name_en.trim()) nextErrors.name_en = "Ingliz tilidagi nom majburiy";
    if (!formData.category_img) nextErrors.category_img = "Kategoriya rasmi majburiy";
    if (isSuperAdmin && !selectedCompanyId) nextErrors.companyId = "Kompaniyani tanlang";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name.trim());
      formDataToSend.append("name_ru", formData.name_ru.trim());
      formDataToSend.append("name_en", formData.name_en.trim());
      formDataToSend.append("category_img", formData.category_img);
      await onSave(formDataToSend);
      handleClose();
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        submit: error?.response?.data?.message || "Kategoriya yaratishda xatolik yuz berdi",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-black/35 transition-opacity duration-200 ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      <div className="relative z-10 flex min-h-full items-center justify-center p-4">
        <div
          className={`w-full max-w-3xl rounded-2xl border border-emerald-100 bg-white shadow-2xl transition-all duration-200 ${
            isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-emerald-100 px-6 py-5">
            <h2 className="text-3xl font-semibold text-slate-900">Yangi Kategoriya</h2>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
            {errors.submit && (
              <div className="flex items-center rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{errors.submit}</span>
              </div>
            )}

            {isSuperAdmin && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Kompaniya <span className="text-red-700">*</span>
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => onCompanyChange?.(e.target.value)}
                  className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Kompaniyani tanlang</option>
                  {companies.map((company) => (
                    <option key={company._id} value={company._id}>
                      {company.name || company.title || company.companyName || company._id}
                    </option>
                  ))}
                </select>
                {errors.companyId && <p className="mt-1 text-sm text-red-600">{errors.companyId}</p>}
              </div>
            )}

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
              <button
                type="button"
                onClick={runAutoTranslate}
                disabled={isAutoTranslating || !formData.name.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#249B73] px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Languages className="w-4 h-4" />
                {isAutoTranslating ? "Tarjima qilinmoqda..." : "UZ matndan RU/EN to'ldirish"}
              </button>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Kategoriya nomi (O'zbek) <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                onBlur={runAutoTranslate}
                placeholder="Kategoriya nomini kiriting"
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Kategoriya nomi (Rus) <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                name="name_ru"
                value={formData.name_ru}
                onChange={handleInputChange}
                placeholder="Название категории"
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {errors.name_ru && <p className="mt-1 text-sm text-red-600">{errors.name_ru}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Kategoriya nomi (Ingliz) <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                name="name_en"
                value={formData.name_en}
                onChange={handleInputChange}
                placeholder="Category name"
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {errors.name_en && <p className="mt-1 text-sm text-red-600">{errors.name_en}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Kategoriya rasmi <span className="text-red-700">*</span>
              </label>
              <div
                className={`rounded-lg border-2 border-dashed p-6 text-center ${
                  errors.category_img ? "border-red-300 bg-red-50" : "border-emerald-200"
                }`}
              >
                {imagePreview ? (
                  <div className="space-y-3">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mx-auto h-32 w-32 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setFormData((prev) => ({ ...prev, category_img: null }));
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Olib tashlash
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Paperclip className="mx-auto h-8 w-8 text-slate-400" />
                    <label htmlFor="create-category-image" className="cursor-pointer text-sm text-[#249B73]">
                      Rasm yuklash
                    </label>
                    <p className="text-xs text-slate-500">PNG, JPG, GIF (max 5MB)</p>
                  </div>
                )}
                <input
                  id="create-category-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
              {errors.category_img && <p className="mt-1 text-sm text-red-600">{errors.category_img}</p>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-emerald-100 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={handleSubmit}
              className="inline-flex items-center rounded-lg bg-[#249B73] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f8966] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
