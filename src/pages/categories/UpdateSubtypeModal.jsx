import React, { useEffect, useState } from "react";
import { X, Languages } from "lucide-react";
import { autoTranslateFromUzbek } from "../../utils/translation/autoTranslate";

export const UpdateSubCategoryModal = ({
  isOpen,
  onClose,
  onSave,
  subtypeData,
  categoryName,
  companies = [],
  isSuperAdmin = false,
  selectedCompanyId = "",
  onCompanyChange,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    name_ru: "",
    name_en: "",
  });
  const [errors, setErrors] = useState({});
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

  useEffect(() => {
    if (!subtypeData) return;
    setFormData({
      name: subtypeData.name || "",
      name_ru: subtypeData.name_ru || "",
      name_en: subtypeData.name_en || "",
    });
    setErrors({});
  }, [subtypeData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
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

  const validate = () => {
    const nextErrors = {};
    if (!formData.name.trim()) nextErrors.name = "Nom (UZ) majburiy";
    if (!formData.name_ru.trim()) nextErrors.name_ru = "Nom (RU) majburiy";
    if (!formData.name_en.trim()) nextErrors.name_en = "Nom (EN) majburiy";
    if (isSuperAdmin && !selectedCompanyId) nextErrors.companyId = "Kompaniyani tanlang";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!subtypeData?._id) {
      setErrors({ submit: "Sub-kategoriya topilmadi" });
      return;
    }

    setIsLoading(true);
    try {
      await onSave(formData, subtypeData._id, subtypeData.categoryId || subtypeData.category?._id);
      onClose();
    } catch (error) {
      setErrors({
        submit: error?.response?.data?.message || "Sub-kategoriyani yangilashda xatolik",
      });
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
        onClick={onClose}
      />
      <div className="relative z-10 flex min-h-full items-center justify-center p-4">
        <div
          className={`w-full max-w-lg rounded-2xl border border-emerald-100 bg-white shadow-2xl transition-all duration-200 ${
            isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-emerald-100 px-5 py-4">
            <h2 className="text-3xl font-semibold text-slate-900">Sub-kategoriyani yangilash</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
            {categoryName && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <span className="font-medium">Asosiy kategoriya:</span> {categoryName}
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
                  className="w-full rounded-lg border border-emerald-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
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
                Nom (UZ) <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                onBlur={runAutoTranslate}
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Sub-kategoriya nomi"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Nom (RU) <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                name="name_ru"
                value={formData.name_ru}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Название подкатегории"
              />
              {errors.name_ru && <p className="mt-1 text-sm text-red-600">{errors.name_ru}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Nom (EN) <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                name="name_en"
                value={formData.name_en}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Sub-category name"
              />
              {errors.name_en && <p className="mt-1 text-sm text-red-600">{errors.name_en}</p>}
            </div>

            {errors.submit && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {errors.submit}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-emerald-100 bg-slate-50 -mx-5 px-5 py-4 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                disabled={isLoading}
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#249B73] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f8966] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
              >
                {isLoading ? "Saqlanmoqda..." : "Yangilash"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
