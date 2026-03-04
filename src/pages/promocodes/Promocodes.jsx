import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Edit3, Funnel, Loader2, Plus, RefreshCcw, Trash2 } from "lucide-react";
import $api from "../../http/api";

const normalizeRole = (role) => String(role || "").toLowerCase().replace(/[_\s]/g, "");
const toId = (value) => String(value?._id || value?.id || value || "").trim();
const isInactiveStatus = (status) => String(status || "").toLowerCase() === "inactive";
const parseUzNumber = (value) => {
  const cleaned = String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .trim();
  if (!cleaned) return NaN;
  return Number(cleaned);
};
const formatDiscount = (type, value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "—";
  if (String(type) === "percent") return `${numeric}%`;
  return `${numeric.toLocaleString("uz-UZ")} so'm`;
};
const formatAmount = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "0";
  return `${numeric.toLocaleString("uz-UZ")} so'm`;
};
const toUzErrorMessage = (message) => {
  const raw = String(message || "").trim();
  if (!raw) return "";
  const lowered = raw.toLowerCase();

  const betweenMatch = lowered.match(/promocode length must be between\s+(\d+)\s+and\s+(\d+)/i);
  if (betweenMatch) {
    return `Promokod uzunligi ${betweenMatch[1]} dan ${betweenMatch[2]} gacha bo'lishi kerak`;
  }
  if (lowered.includes("promocode is required")) return "Promokod kiritilishi shart";
  if (lowered.includes("company id is required")) return "Kompaniya tanlanishi shart";
  if (lowered.includes("invalid id")) return "Noto'g'ri ID";
  if (lowered.includes("invalid status")) return "Noto'g'ri status";
  if (lowered.includes("no update fields")) return "Yangilash uchun maydon yuborilmadi";
  if (lowered.includes("discount type") && lowered.includes("amount") && lowered.includes("percent")) {
    return "Chegirma turi faqat summa yoki foiz bo'lishi mumkin";
  }
  if (lowered.includes("discount value")) {
    if (lowered.includes("greater than 0") || lowered.includes("must be positive")) {
      return "Chegirma qiymati 0 dan katta bo'lishi kerak";
    }
    if (lowered.includes("less than or equal to 100") || lowered.includes("<= 100")) {
      return "Foiz chegirma 100 dan katta bo'lmasligi kerak";
    }
    if (lowered.includes("number")) {
      return "Chegirma qiymati son bo'lishi kerak";
    }
  }
  if (lowered.includes("min order amount")) {
    if (lowered.includes("negative") || lowered.includes("greater than or equal to 0")) {
      return "Minimal buyurtma summasi manfiy bo'lmasligi kerak";
    }
    if (lowered.includes("number")) {
      return "Minimal buyurtma summasi son bo'lishi kerak";
    }
  }
  if (lowered.includes("duplicate") || lowered.includes("already exists")) {
    return "Bu promokod allaqachon mavjud";
  }

  return raw;
};
const normalizeStatus = (value) => {
  if (typeof value === "boolean") return value ? "active" : "inactive";
  const raw = String(value || "").toLowerCase();
  if (["inactive", "false", "0", "disabled", "passive"].includes(raw)) return "inactive";
  return "active";
};
const resolveErrorMessage = (error, fallback = "Amalda xatolik yuz berdi") => {
  const status = Number(error?.response?.status || 0);
  const backendMessage = toUzErrorMessage(
    String(
    error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.response?.data?.msg ||
      ""
    ).trim()
  );

  if (status === 500) return "Serverda xatolik";
  if (status === 409) return backendMessage || "Bu promokod allaqachon mavjud";
  if (status === 404) return backendMessage || "Ma'lumot topilmadi";
  if (status === 403) return backendMessage || "Sizda bu amal uchun ruxsat yo'q";
  if (status === 400) return backendMessage || "Validation xatolik";
  return backendMessage || fallback;
};
const resolveFieldErrors = (error) => {
  const payload = error?.response?.data || {};
  const backendMessage = toUzErrorMessage(
    String(payload?.message || payload?.error || payload?.msg || "").trim()
  );
  const result = {
    promocode: "",
    companyId: "",
    discountType: "",
    discountValue: "",
    minOrderAmount: "",
    general: "",
  };

  const attach = (fieldKey, message) => {
    const key = String(fieldKey || "").toLowerCase();
    const text = toUzErrorMessage(String(message || "").trim());
    if (!text) return;
    if (key.includes("promo")) {
      result.promocode = result.promocode || text;
      return;
    }
    if (key.includes("company")) {
      result.companyId = result.companyId || text;
      return;
    }
    if (key.includes("discounttype") || key.includes("discount_type")) {
      result.discountType = result.discountType || text;
      return;
    }
    if (key.includes("discountvalue") || key.includes("discount_value")) {
      result.discountValue = result.discountValue || text;
      return;
    }
    if (key.includes("minorderamount") || key.includes("min_order_amount")) {
      result.minOrderAmount = result.minOrderAmount || text;
    }
  };

  if (Array.isArray(payload?.errors)) {
    payload.errors.forEach((item) => {
      attach(item?.path || item?.field || item?.param || item?.key, item?.msg || item?.message);
    });
  } else if (payload?.errors && typeof payload.errors === "object") {
    Object.entries(payload.errors).forEach(([key, value]) => {
      const text = toUzErrorMessage(Array.isArray(value) ? value[0] : value);
      attach(key, text);
    });
  }

  if (backendMessage) {
    const lowered = backendMessage.toLowerCase();
    if (lowered.includes("promo")) result.promocode = result.promocode || backendMessage;
    else if (lowered.includes("company")) result.companyId = result.companyId || backendMessage;
    else if (lowered.includes("discount type")) result.discountType = result.discountType || backendMessage;
    else if (lowered.includes("discount value")) {
      result.discountValue = result.discountValue || backendMessage;
    } else if (lowered.includes("min order amount")) {
      result.minOrderAmount = result.minOrderAmount || backendMessage;
    }
    else result.general = backendMessage;
  }

  if (
    !result.promocode &&
    !result.companyId &&
    !result.discountType &&
    !result.discountValue &&
    !result.minOrderAmount &&
    !result.general
  ) {
    result.general = resolveErrorMessage(error, "Saqlashda xatolik");
  }
  return result;
};
const resolvePromocodeList = (payload) => {
  const candidates = [
    payload?.data,
    payload?.promocodes,
    payload?.items,
    payload?.results,
    payload?.rows,
    payload,
  ];
  for (const item of candidates) {
    if (Array.isArray(item)) return item;
  }
  return [];
};
const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("uz-UZ");
};
const normalizeItem = (item) => {
  const id = toId(item?._id || item?.id);
  const company = item?.company || item?.companyId || {};
  return {
    id,
    promocode: String(item?.promocode || "").trim(),
    companyId: toId(company),
    companyName:
      company?.name || company?.title || item?.companyName || item?.company_name || "—",
    discountType: String(item?.discountType || item?.discount_type || "amount").toLowerCase(),
    discountValue: Number(item?.discountValue ?? item?.discount_value ?? 0),
    minOrderAmount: Number(item?.minOrderAmount ?? item?.min_order_amount ?? 0),
    status: normalizeStatus(item?.status ?? item?.isActive),
    createdAt: item?.createdAt || item?.created_at || item?.date || "",
  };
};

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/35 p-4 flex items-center justify-center">
    <div className="w-full max-w-md rounded-2xl bg-white border border-emerald-100 shadow-2xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-100">
        <h3 className="text-lg font-semibold text-emerald-900">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-full text-emerald-700 hover:bg-emerald-50 cursor-pointer"
          aria-label="Yopish"
        >
          ×
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

export const PromocodesPage = () => {
  const { user } = useSelector((state) => state.user);
  const actorRole = normalizeRole(user?.role);
  const isSuperAdmin = actorRole === "superadmin";
  const canUsePromocodePage = ["superadmin", "admin", "employee", "xodim", "companyadmin"].includes(
    actorRole
  );

  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [toast, setToast] = useState({ type: "", message: "" });
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    companyId: "",
    page: 1,
    limit: 20,
  });
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteState, setDeleteState] = useState({ open: false, item: null });
  const [createForm, setCreateForm] = useState({
    promocode: "",
    companyId: "",
    discountType: "amount",
    discountValue: "",
    minOrderAmount: "0",
  });
  const [editForm, setEditForm] = useState({
    id: "",
    promocode: "",
    companyId: "",
    discountType: "amount",
    discountValue: "",
    minOrderAmount: "0",
  });
  const [createErrors, setCreateErrors] = useState({
    promocode: "",
    companyId: "",
    discountType: "",
    discountValue: "",
    minOrderAmount: "",
    general: "",
  });
  const [editErrors, setEditErrors] = useState({
    promocode: "",
    companyId: "",
    discountType: "",
    discountValue: "",
    minOrderAmount: "",
    general: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const createDiscountValue = parseUzNumber(createForm.discountValue);
  const createMinOrderAmount = parseUzNumber(createForm.minOrderAmount || "0");
  const editDiscountValue = parseUzNumber(editForm.discountValue);
  const editMinOrderAmount = parseUzNumber(editForm.minOrderAmount || "0");
  const canCreateSubmit =
    createForm.promocode.trim() &&
    (!isSuperAdmin || createForm.companyId.trim()) &&
    Number.isFinite(createDiscountValue) &&
    createDiscountValue > 0 &&
    Number.isFinite(createMinOrderAmount) &&
    createMinOrderAmount >= 0 &&
    (createForm.discountType !== "percent" || createDiscountValue <= 100);
  const canEditSubmit =
    editForm.promocode.trim() &&
    (!isSuperAdmin || editForm.companyId.trim()) &&
    Number.isFinite(editDiscountValue) &&
    editDiscountValue > 0 &&
    Number.isFinite(editMinOrderAmount) &&
    editMinOrderAmount >= 0 &&
    (editForm.discountType !== "percent" || editDiscountValue <= 100);
  const pageNumbers = useMemo(() => {
    const pages = [];
    const totalPages = Math.max(1, Number(meta.totalPages || 1));
    for (let i = 1; i <= totalPages; i += 1) {
      pages.push(i);
    }
    return pages;
  }, [meta.totalPages]);

  useEffect(() => {
    if (!toast.message) return;
    const timer = setTimeout(() => setToast({ type: "", message: "" }), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchCompanies();
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchPromocodes();
  }, [filters.page, filters.limit, filters.status, filters.companyId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPromocodes(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [filters.q]);

  const fetchCompanies = async () => {
    setCompaniesLoading(true);
    try {
      const { data } = await $api.get("/company/all", {
        params: { page: 1, limit: 300 },
      });
      const list = data?.data || data?.companies || data?.items || [];
      setCompanies(Array.isArray(list) ? list : []);
    } catch {
      setCompanies([]);
    } finally {
      setCompaniesLoading(false);
    }
  };

  const fetchPromocodes = async (forcedPage) => {
    if (!canUsePromocodePage) return;
    const nextPage = Number(forcedPage || filters.page || 1);
    setLoading(true);
    try {
      const params = {
        page: nextPage,
        limit: Number(filters.limit || 20),
      };
      if (filters.q.trim()) params.q = filters.q.trim();
      if (filters.status) params.status = filters.status;
      if (isSuperAdmin && filters.companyId) params.companyId = filters.companyId;

      const { data } = await $api.get("/promocode/all", { params });
      const list = resolvePromocodeList(data);
      const normalized = list.map(normalizeItem);
      const total =
        Number(data?.total || data?.count || data?.totalItems || data?.pagination?.total || 0) ||
        normalized.length;
      const page = Number(data?.page || data?.currentPage || data?.pagination?.page || nextPage);
      const limit = Number(
        data?.limit || data?.perPage || data?.pagination?.limit || params.limit || 20
      );
      const totalPages =
        Number(data?.totalPages || data?.pagination?.totalPages || 0) ||
        Math.max(1, Math.ceil(total / Math.max(1, limit)));

      setRows(normalized);
      setMeta({
        page,
        limit,
        total,
        totalPages,
      });
      if (Number(filters.page) !== Number(page)) {
        setFilters((prev) => ({ ...prev, page }));
      }
    } catch (error) {
      setRows([]);
      setMeta((prev) => ({ ...prev, total: 0, totalPages: 1 }));
      console.error("Promokodlarni yuklashda xatolik:", error);
    } finally {
      setLoading(false);
    }
  };

  const onCreateSubmit = async (e) => {
    e.preventDefault();
    if (!canCreateSubmit || submitting) return;
    setSubmitting(true);
    setCreateErrors({
      promocode: "",
      companyId: "",
      discountType: "",
      discountValue: "",
      minOrderAmount: "",
      general: "",
    });
    try {
      const payload = {
        promocode: createForm.promocode.trim(),
        discountType: createForm.discountType,
        discountValue: Number(createDiscountValue),
        minOrderAmount: Number.isFinite(createMinOrderAmount) ? Number(createMinOrderAmount) : 0,
      };
      if (isSuperAdmin) payload.companyId = createForm.companyId.trim();
      await $api.post("/promocode/create", payload);
      setShowCreate(false);
      setCreateForm({
        promocode: "",
        companyId: "",
        discountType: "amount",
        discountValue: "",
        minOrderAmount: "0",
      });
      setToast({ type: "success", message: "Promokod yaratildi" });
      fetchPromocodes();
    } catch (error) {
      setCreateErrors(resolveFieldErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  const onEditOpen = async (id) => {
    try {
      const { data } = await $api.get(`/promocode/${id}`);
      const payload = data?.data || data?.promocode || data;
      const normalized = normalizeItem(payload);
      setEditForm({
        id: normalized.id,
        promocode: normalized.promocode,
        companyId: normalized.companyId,
        discountType: normalized.discountType || "amount",
        discountValue: String(normalized.discountValue || ""),
        minOrderAmount: String(normalized.minOrderAmount ?? 0),
      });
      setEditErrors({
        promocode: "",
        companyId: "",
        discountType: "",
        discountValue: "",
        minOrderAmount: "",
        general: "",
      });
      setShowEdit(true);
    } catch (error) {
      setToast({ type: "error", message: resolveErrorMessage(error, "Ma'lumotni olib bo'lmadi") });
    }
  };

  const onEditSubmit = async (e) => {
    e.preventDefault();
    if (!canEditSubmit || submitting) return;
    setSubmitting(true);
    setEditErrors({
      promocode: "",
      companyId: "",
      discountType: "",
      discountValue: "",
      minOrderAmount: "",
      general: "",
    });
    try {
      const payload = {
        promocode: editForm.promocode.trim(),
        discountType: editForm.discountType,
        discountValue: Number(editDiscountValue),
        minOrderAmount: Number.isFinite(editMinOrderAmount) ? Number(editMinOrderAmount) : 0,
      };
      if (isSuperAdmin) payload.companyId = editForm.companyId.trim();
      await $api.put(`/promocode/${editForm.id}`, payload);
      setShowEdit(false);
      setToast({ type: "success", message: "Promokod yangilandi" });
      fetchPromocodes();
    } catch (error) {
      setEditErrors(resolveFieldErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  const onToggleStatus = async (item) => {
    try {
      const { data } = await $api.patch(`/promocode/${item.id}/toggle-status`);
      const payload = data?.data || data?.promocode || data;
      const nextStatus = payload ? normalizeItem(payload).status : item.status === "active" ? "inactive" : "active";
      setRows((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, status: nextStatus } : row))
      );
      setToast({ type: "success", message: "Status o'zgartirildi" });
    } catch (error) {
      setToast({ type: "error", message: resolveErrorMessage(error, "Statusni o'zgartirib bo'lmadi") });
    }
  };

  const onDelete = async () => {
    const item = deleteState.item;
    if (!item?.id || submitting) return;
    setSubmitting(true);
    try {
      await $api.delete(`/promocode/${item.id}`);
      setDeleteState({ open: false, item: null });
      setToast({ type: "success", message: "Promokod o'chirildi" });
      fetchPromocodes();
    } catch (error) {
      setToast({ type: "error", message: resolveErrorMessage(error, "O'chirishda xatolik") });
    } finally {
      setSubmitting(false);
    }
  };

  if (!canUsePromocodePage) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-red-700">
        Bu sahifa uchun ruxsat yo'q (403).
      </div>
    );
  }

  return (
    <section className="min-h-[calc(100vh-90px)] rounded-3xl border border-emerald-100 bg-gradient-to-b from-white to-emerald-50/60 p-5 sm:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-950">Promokod boshqaruvi</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer ${
              showFilters
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
            }`}
          >
            <Funnel className="h-4 w-4" />
            Filter
          </button>
          <button
            type="button"
            onClick={() => fetchPromocodes()}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-800 hover:bg-emerald-50 cursor-pointer"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Yangilash
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Yangi promokod
          </button>
        </div>
      </div>

      {showFilters ? (
        <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input
              value={filters.q}
              onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value, page: 1 }))}
              placeholder="Qidiruv"
              className="h-11 rounded-xl border border-emerald-200 px-3 text-sm outline-none focus:border-emerald-500"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
              className="h-11 rounded-xl border border-emerald-200 px-3 text-sm outline-none focus:border-emerald-500 bg-white"
            >
              <option value="">Status: Barchasi</option>
              <option value="active">Faol</option>
              <option value="inactive">Nofaol</option>
            </select>
            {isSuperAdmin ? (
              <select
                value={filters.companyId}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, companyId: e.target.value, page: 1 }))
                }
                className="h-11 rounded-xl border border-emerald-200 px-3 text-sm outline-none focus:border-emerald-500 bg-white"
                disabled={companiesLoading}
              >
                <option value="">Kompaniya: Barchasi</option>
                {companies.map((company) => (
                  <option key={toId(company)} value={toId(company)}>
                    {company?.name || company?.title || toId(company)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="h-11 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm flex items-center text-emerald-800">
                Kompaniya: faqat o'z kompaniyangiz
              </div>
            )}
            <select
              value={String(filters.limit)}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))
              }
              className="h-11 rounded-xl border border-emerald-200 px-3 text-sm outline-none focus:border-emerald-500 bg-white"
            >
              {[10, 20, 30, 50].map((limit) => (
                <option key={limit} value={limit}>
                  Limit: {limit}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {toast.message ? (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            toast.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead>
              <tr className="bg-emerald-50 text-left text-xs uppercase tracking-wide text-emerald-900">
                  <th className="px-4 py-3">promokod</th>
                  <th className="px-4 py-3">kompaniya</th>
                  <th className="px-4 py-3">chegirma</th>
                  <th className="px-4 py-3">minimal summa</th>
                  <th className="px-4 py-3">status</th>
                  <th className="px-4 py-3">yaratilgan vaqti</th>
                  <th className="px-4 py-3">amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <div className="inline-flex items-center gap-2 text-emerald-700">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Yuklanmoqda...
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    Ma'lumot topilmadi
                  </td>
                </tr>
              ) : (
                rows.map((item) => {
                  const inactive = isInactiveStatus(item.status);
                  return (
                    <tr key={item.id} className="border-t border-emerald-50 hover:bg-emerald-50/50">
                      <td className="px-4 py-3 font-medium text-emerald-950">{item.promocode || "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{item.companyName}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDiscount(item.discountType, item.discountValue)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{formatAmount(item.minOrderAmount)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            inactive
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {inactive ? "nofaol" : "faol"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(item.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEditOpen(item.id)}
                            title="Tahrirlash"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 text-emerald-800 hover:bg-emerald-50 cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleStatus(item)}
                            title="Statusni almashtirish"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 text-emerald-800 hover:bg-emerald-50 cursor-pointer"
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </button>
                          {inactive ? (
                            <button
                              type="button"
                              onClick={() => setDeleteState({ open: true, item })}
                              title="O'chirish"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-emerald-900/80">
          Jami: <span className="font-semibold">{meta.total}</span> ta
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({ ...prev, page: Math.max(1, Number(prev.page || 1) - 1) }))
            }
            disabled={Number(filters.page || 1) <= 1}
            className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm text-emerald-800 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            Oldingi
          </button>
          <div className="flex items-center gap-1">
            {pageNumbers.map((pageNo) => (
              <button
                key={pageNo}
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, page: pageNo }))}
                className={`h-8 min-w-8 rounded-lg border px-2 text-sm cursor-pointer ${
                  Number(filters.page || 1) === Number(pageNo)
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                }`}
              >
                {pageNo}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                page: Math.min(Number(meta.totalPages || 1), Number(prev.page || 1) + 1),
              }))
            }
            disabled={Number(filters.page || 1) >= Number(meta.totalPages || 1)}
            className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm text-emerald-800 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            Keyingi
          </button>
        </div>
      </div>

      {showCreate ? (
        <Modal title="Yangi promokod" onClose={() => setShowCreate(false)}>
          <form onSubmit={onCreateSubmit} className="space-y-4">
            {createErrors.general ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {createErrors.general}
              </p>
            ) : null}
            <div>
              <label className="mb-1 block text-sm font-medium text-emerald-900">Promokod</label>
              <input
                value={createForm.promocode}
                onChange={(e) => {
                  setCreateForm((prev) => ({ ...prev, promocode: e.target.value }));
                  setCreateErrors((prev) => ({ ...prev, promocode: "", general: "" }));
                }}
                placeholder="SALE2026"
                className={`h-11 w-full rounded-xl px-3 text-sm outline-none ${
                  createErrors.promocode
                    ? "border border-red-400 bg-red-50/30 focus:border-red-500"
                    : "border border-emerald-200 focus:border-emerald-500"
                }`}
              />
              {createErrors.promocode ? (
                <p className="mt-1 text-xs text-red-600">{createErrors.promocode}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-emerald-900">Chegirma turi</label>
              <select
                value={createForm.discountType}
                onChange={(e) => {
                  setCreateForm((prev) => ({ ...prev, discountType: e.target.value }));
                  setCreateErrors((prev) => ({ ...prev, discountType: "", discountValue: "", general: "" }));
                }}
                className={`h-11 w-full rounded-xl px-3 text-sm outline-none bg-white ${
                  createErrors.discountType
                    ? "border border-red-400 bg-red-50/30 focus:border-red-500"
                    : "border border-emerald-200 focus:border-emerald-500"
                }`}
              >
                <option value="amount">Summa</option>
                <option value="percent">Foiz</option>
              </select>
              {createErrors.discountType ? (
                <p className="mt-1 text-xs text-red-600">{createErrors.discountType}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-emerald-900">
                Chegirma qiymati ({createForm.discountType === "percent" ? "foiz" : "so'm"})
              </label>
              <input
                value={createForm.discountValue}
                onChange={(e) => {
                  setCreateForm((prev) => ({ ...prev, discountValue: e.target.value }));
                  setCreateErrors((prev) => ({ ...prev, discountValue: "", general: "" }));
                }}
                placeholder={createForm.discountType === "percent" ? "10" : "20000"}
                className={`h-11 w-full rounded-xl px-3 text-sm outline-none ${
                  createErrors.discountValue
                    ? "border border-red-400 bg-red-50/30 focus:border-red-500"
                    : "border border-emerald-200 focus:border-emerald-500"
                }`}
              />
              {createErrors.discountValue ? (
                <p className="mt-1 text-xs text-red-600">{createErrors.discountValue}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-emerald-900">
                Minimal buyurtma summasi
              </label>
              <input
                value={createForm.minOrderAmount}
                onChange={(e) => {
                  setCreateForm((prev) => ({ ...prev, minOrderAmount: e.target.value }));
                  setCreateErrors((prev) => ({ ...prev, minOrderAmount: "", general: "" }));
                }}
                placeholder="200000"
                className={`h-11 w-full rounded-xl px-3 text-sm outline-none ${
                  createErrors.minOrderAmount
                    ? "border border-red-400 bg-red-50/30 focus:border-red-500"
                    : "border border-emerald-200 focus:border-emerald-500"
                }`}
              />
              {createErrors.minOrderAmount ? (
                <p className="mt-1 text-xs text-red-600">{createErrors.minOrderAmount}</p>
              ) : null}
            </div>
            {isSuperAdmin ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-emerald-900">Kompaniya</label>
                <select
                  value={createForm.companyId}
                  onChange={(e) => {
                    setCreateForm((prev) => ({ ...prev, companyId: e.target.value }));
                    setCreateErrors((prev) => ({ ...prev, companyId: "", general: "" }));
                  }}
                  className={`h-11 w-full rounded-xl px-3 text-sm outline-none bg-white ${
                    createErrors.companyId
                      ? "border border-red-400 bg-red-50/30 focus:border-red-500"
                      : "border border-emerald-200 focus:border-emerald-500"
                  }`}
                >
                  <option value="">Kompaniyani tanlang</option>
                  {companies.map((company) => (
                    <option key={toId(company)} value={toId(company)}>
                      {company?.name || company?.title || toId(company)}
                    </option>
                  ))}
                </select>
                {createErrors.companyId ? (
                  <p className="mt-1 text-xs text-red-600">{createErrors.companyId}</p>
                ) : null}
              </div>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={!canCreateSubmit || submitting}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? "Saqlanmoqda..." : "Saqlash"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {showEdit ? (
        <Modal title="Promokodni tahrirlash" onClose={() => setShowEdit(false)}>
          <form onSubmit={onEditSubmit} className="space-y-4">
            {editErrors.general ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {editErrors.general}
              </p>
            ) : null}
            <div>
              <label className="mb-1 block text-sm font-medium text-emerald-900">Promokod</label>
              <input
                value={editForm.promocode}
                onChange={(e) => {
                  setEditForm((prev) => ({ ...prev, promocode: e.target.value }));
                  setEditErrors((prev) => ({ ...prev, promocode: "", general: "" }));
                }}
                placeholder="SPRING2026"
                className={`h-11 w-full rounded-xl px-3 text-sm outline-none ${
                  editErrors.promocode
                    ? "border border-red-400 bg-red-50/30 focus:border-red-500"
                    : "border border-emerald-200 focus:border-emerald-500"
                }`}
              />
              {editErrors.promocode ? (
                <p className="mt-1 text-xs text-red-600">{editErrors.promocode}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-emerald-900">Chegirma turi</label>
              <select
                value={editForm.discountType}
                onChange={(e) => {
                  setEditForm((prev) => ({ ...prev, discountType: e.target.value }));
                  setEditErrors((prev) => ({ ...prev, discountType: "", discountValue: "", general: "" }));
                }}
                className={`h-11 w-full rounded-xl px-3 text-sm outline-none bg-white ${
                  editErrors.discountType
                    ? "border border-red-400 bg-red-50/30 focus:border-red-500"
                    : "border border-emerald-200 focus:border-emerald-500"
                }`}
              >
                <option value="amount">Summa</option>
                <option value="percent">Foiz</option>
              </select>
              {editErrors.discountType ? (
                <p className="mt-1 text-xs text-red-600">{editErrors.discountType}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-emerald-900">
                Chegirma qiymati ({editForm.discountType === "percent" ? "foiz" : "so'm"})
              </label>
              <input
                value={editForm.discountValue}
                onChange={(e) => {
                  setEditForm((prev) => ({ ...prev, discountValue: e.target.value }));
                  setEditErrors((prev) => ({ ...prev, discountValue: "", general: "" }));
                }}
                placeholder={editForm.discountType === "percent" ? "10" : "20000"}
                className={`h-11 w-full rounded-xl px-3 text-sm outline-none ${
                  editErrors.discountValue
                    ? "border border-red-400 bg-red-50/30 focus:border-red-500"
                    : "border border-emerald-200 focus:border-emerald-500"
                }`}
              />
              {editErrors.discountValue ? (
                <p className="mt-1 text-xs text-red-600">{editErrors.discountValue}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-emerald-900">
                Minimal buyurtma summasi
              </label>
              <input
                value={editForm.minOrderAmount}
                onChange={(e) => {
                  setEditForm((prev) => ({ ...prev, minOrderAmount: e.target.value }));
                  setEditErrors((prev) => ({ ...prev, minOrderAmount: "", general: "" }));
                }}
                placeholder="200000"
                className={`h-11 w-full rounded-xl px-3 text-sm outline-none ${
                  editErrors.minOrderAmount
                    ? "border border-red-400 bg-red-50/30 focus:border-red-500"
                    : "border border-emerald-200 focus:border-emerald-500"
                }`}
              />
              {editErrors.minOrderAmount ? (
                <p className="mt-1 text-xs text-red-600">{editErrors.minOrderAmount}</p>
              ) : null}
            </div>
            {isSuperAdmin ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-emerald-900">Kompaniya</label>
                <select
                  value={editForm.companyId}
                  onChange={(e) => {
                    setEditForm((prev) => ({ ...prev, companyId: e.target.value }));
                    setEditErrors((prev) => ({ ...prev, companyId: "", general: "" }));
                  }}
                  className={`h-11 w-full rounded-xl px-3 text-sm outline-none bg-white ${
                    editErrors.companyId
                      ? "border border-red-400 bg-red-50/30 focus:border-red-500"
                      : "border border-emerald-200 focus:border-emerald-500"
                  }`}
                >
                  <option value="">Kompaniyani tanlang</option>
                  {companies.map((company) => (
                    <option key={toId(company)} value={toId(company)}>
                      {company?.name || company?.title || toId(company)}
                    </option>
                  ))}
                </select>
                {editErrors.companyId ? (
                  <p className="mt-1 text-xs text-red-600">{editErrors.companyId}</p>
                ) : null}
              </div>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={!canEditSubmit || submitting}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? "Saqlanmoqda..." : "Yangilash"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleteState.open ? (
        <Modal title="Promokodni o'chirish" onClose={() => setDeleteState({ open: false, item: null })}>
          <p className="text-sm text-gray-700">
            <span className="font-medium">{deleteState.item?.promocode}</span> ni o'chirmoqchimisiz?
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteState({ open: false, item: null })}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={submitting}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? "O'chirilmoqda..." : "O'chirish"}
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
};
