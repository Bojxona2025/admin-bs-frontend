import React, { useCallback, useEffect, useMemo, useState } from "react";
import GlobalTable from "../../components/global_table/GlobalTable";
import * as XLSX from "xlsx";
import $api from "../../http/api";
import { useSelector } from "react-redux";
import { X } from "lucide-react";

const PERIOD_OPTIONS = [
  { key: "kunlik", label: "Bugun", apiValue: "Неделя" },
  { key: "haftalik", label: "Bu hafta", apiValue: "Неделя" },
  { key: "oylik", label: "Bu oy", apiValue: "Месяц" },
  { key: "yillik", label: "Bu yil", apiValue: "Год" },
  { key: "10yillik", label: "10 yil", apiValue: "Год" },
];

const formatNumber = (num) => new Intl.NumberFormat("uz-UZ").format(num || 0);

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("uz-UZ");
};

const toDateTimeLocalValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const getPeriodText = (periodKey) => {
  const found = PERIOD_OPTIONS.find((item) => item.key === periodKey);
  return found?.label || "Tanlangan davr";
};

const getPeriodRange = (periodKey) => {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);

  if (periodKey === "kunlik") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  } else if (periodKey === "haftalik") {
    const day = now.getDay() || 7;
    start = new Date(now);
    start.setDate(now.getDate() - day + 1);
    start.setHours(0, 0, 0, 0);
  } else if (periodKey === "oylik") {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  } else if (periodKey === "yillik") {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  } else if (periodKey === "10yillik") {
    start = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
};

const mapIncomesToRows = (incomes = []) =>
  incomes.map((income) => {
    const numericAmount = Number(income?.amount || 0);
    const source = income?.source || "Tushum";
    const category = income?.category || "Qo'lda kiritilgan";
    const description = income?.note || income?.description || "-";

    return {
      id: income?._id,
      date: formatDate(income?.incomeDate || income?.createdAt),
      source,
      amount: formatNumber(numericAmount),
      numericAmount,
      currency: income?.currency || "UZS",
      category,
      description,
      sourceRaw: income?.source || "",
      noteRaw: income?.note || "",
      incomeDateRaw: income?.incomeDate || income?.createdAt || "",
      companyIdRaw: income?.companyId?._id || income?.companyId || "",
      profit: "-",
      setting: null,
    };
  });

const findTopSource = (rows) => {
  if (!rows?.length) return "";
  const sourceMap = {};
  rows.forEach((item) => {
    sourceMap[item.source] = (sourceMap[item.source] || 0) + item.numericAmount;
  });

  let maxAmount = 0;
  let top = "";
  Object.entries(sourceMap).forEach(([name, amount]) => {
    if (amount > maxAmount) {
      maxAmount = amount;
      top = name;
    }
  });
  return top;
};

const normalizeRole = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[_\s]/g, "");

const getNestedCompanyId = (candidate) => {
  if (!candidate) return "";
  if (typeof candidate === "string") return candidate;
  return (
    candidate?._id ||
    candidate?.id ||
    candidate?.companyId?._id ||
    candidate?.companyId?.id ||
    candidate?.companyId ||
    ""
  );
};

const extractCompanyList = (payload) => {
  const roots = [
    payload,
    payload?.data,
    payload?.result,
    payload?.body,
    payload?.data?.result,
    payload?.result?.data,
  ];

  for (const root of roots) {
    if (!root) continue;
    if (Array.isArray(root)) return root;
    if (Array.isArray(root?.data)) return root.data;
    if (Array.isArray(root?.companies)) return root.companies;
    if (Array.isArray(root?.items)) return root.items;
    if (Array.isArray(root?.rows)) return root.rows;
  }

  return [];
};

const extractTotalPages = (payload) => {
  return Number(
    payload?.totalPages ||
      payload?.pages ||
      payload?.pagination?.pages ||
      payload?.pagination?.totalPages ||
      payload?.meta?.totalPages ||
      payload?.meta?.pages ||
      1
  );
};

const AccountsPage = () => {
  const { user } = useSelector((state) => state.user);
  const actorRole = normalizeRole(user?.role);
  const isSuperAdmin = actorRole === "superadmin";
  const actorCompanyId =
    getNestedCompanyId(user?.companyId) ||
    getNestedCompanyId(user?.company) ||
    getNestedCompanyId(user?.companyData) ||
    getNestedCompanyId(user?.company_id) ||
    localStorage.getItem("companyId") ||
    "";
  const [loading, setLoading] = useState(true);
  const [tableRows, setTableRows] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("kunlik");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statsRevenue, setStatsRevenue] = useState(0);
  const [operationsCount, setOperationsCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [topSource, setTopSource] = useState("");
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [submittingIncome, setSubmittingIncome] = useState(false);
  const [submittingIncomeEdit, setSubmittingIncomeEdit] = useState(false);
  const [activeIncomeMenuId, setActiveIncomeMenuId] = useState("");
  const [showIncomeEditModal, setShowIncomeEditModal] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState("");
  const [editIncomeForm, setEditIncomeForm] = useState({
    source: "",
    amount: "",
    currency: "UZS",
    note: "",
    incomeDate: "",
    companyId: "",
  });
  const [companies, setCompanies] = useState([]);
  const [uiMessage, setUiMessage] = useState(null);
  const [incomeForm, setIncomeForm] = useState({
    source: "",
    amount: "",
    currency: "UZS",
    note: "",
    incomeDate: "",
    companyId: "",
  });

  const [visibleColumns] = useState({
    date: true,
    source: true,
    amount: true,
    currency: true,
    category: true,
    description: true,
    profit: true,
    setting: true,
  });

  const columns = [
    { key: "date", label: "Sana" },
    { key: "source", label: "Manba" },
    { key: "amount", label: "Miqdor" },
    { key: "currency", label: "Valyuta" },
    { key: "category", label: "Kategoriya" },
    { key: "description", label: "Tavsif" },
    { key: "profit", label: "Foyda %" },
    { key: "setting", label: "" },
  ];

  const onlinePercent = useMemo(() => {
    if (!operationsCount) return 0;
    return Math.round((onlineCount / operationsCount) * 100);
  }, [onlineCount, operationsCount]);

  const openIncomeEdit = (item) => {
    setEditIncomeForm({
      source: item.sourceRaw || item.source || "",
      amount: String(item.numericAmount || 0),
      currency: item.currency || "UZS",
      note: item.noteRaw || "",
      incomeDate: toDateTimeLocalValue(item.incomeDateRaw),
      companyId: item.companyIdRaw || "",
    });
    setEditingIncomeId(item.id || "");
    setShowIncomeEditModal(true);
    setActiveIncomeMenuId("");
  };

  const handleDeleteIncome = async (item) => {
    const ok = window.confirm("Tushumni o'chirmoqchimisiz?");
    if (!ok) return;
    setActiveIncomeMenuId("");
    const endpoints = [`/income/delete/${item.id}`, `/income/remove/${item.id}`, `/income/${item.id}`];
    let deleted = false;
    for (const endpoint of endpoints) {
      try {
        await $api.delete(endpoint);
        deleted = true;
        break;
      } catch {
        // try next endpoint
      }
    }
    if (!deleted) {
      setUiMessage({
        type: "error",
        text: "Tushumni o'chirishda xatolik bo'ldi",
      });
      return;
    }
    setUiMessage({
      type: "success",
      text: "Tushum o'chirildi",
    });
    fetchTable(currentPage, debouncedSearch);
  };

  const displayRows = useMemo(
    () =>
      tableRows.map((item) => ({
        ...item,
        setting: (
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveIncomeMenuId((prev) => (prev === item.id ? "" : item.id))}
              className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer px-2"
            >
              ...
            </button>
            {activeIncomeMenuId === item.id && (
              <div className="absolute right-0 z-10 min-w-32 bg-white border border-slate-200 rounded-lg shadow-lg p-1">
                <button
                  type="button"
                  onClick={() => openIncomeEdit(item)}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100 cursor-pointer"
                >
                  Tahrirlash
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteIncome(item)}
                  className="w-full text-left px-3 py-2 text-sm rounded text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  O'chirish
                </button>
              </div>
            )}
          </div>
        ),
      })),
    [tableRows, activeIncomeMenuId]
  );

  const fetchTable = useCallback(
    async (page = 1, search = debouncedSearch) => {
      setLoading(true);
      try {
        const periodRange = getPeriodRange(selectedPeriod);
        const params = {
          page,
          limit: 10,
          from: periodRange.from,
          to: periodRange.to,
        };

        if (search?.trim()) {
          params.q = search.trim();
        }

        const { data } = await $api.get("/income/all", { params });
        const payload = data || {};
        const list =
          payload?.data ||
          payload?.items ||
          payload?.incomes ||
          payload?.result?.data ||
          payload?.result?.items ||
          [];
        const mapped = mapIncomesToRows(list);

        const total =
          Number(payload?.totalItems) ||
          Number(payload?.total) ||
          Number(payload?.pagination?.total) ||
          Number(payload?.count) ||
          mapped.length;

        const amountFromSummary =
          Number(payload?.summary?.totalAmount) ||
          Number(payload?.totals?.amount) ||
          Number(payload?.totalAmount) ||
          0;
        const amountFromRows = mapped.reduce((sum, row) => sum + Number(row.numericAmount || 0), 0);
        const revenue = amountFromSummary || amountFromRows;

        setTableRows(mapped);
        setTopSource(findTopSource(mapped));
        setCurrentPage(
          payload?.currentPage || payload?.page || payload?.pagination?.page || page
        );
        setTotalPages(
          payload?.totalPages || payload?.pages || payload?.pagination?.pages || 1
        );
        setTotalItems(total);
        setStatsRevenue(revenue);
        setOperationsCount(total);
        setOnlineCount(0);
      } catch (error) {
        setTableRows([]);
        setTopSource("");
        setCurrentPage(1);
        setTotalPages(1);
        setTotalItems(0);
        setStatsRevenue(0);
        setOperationsCount(0);
        setOnlineCount(0);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, selectedPeriod]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchTable(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch, fetchTable, selectedPeriod]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchCompanies();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!uiMessage) return;
    const timer = setTimeout(() => setUiMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [uiMessage]);

  const fetchCompanies = async () => {
    const endpoints = ["/company/all", "/companies/all", "/company/get/all"];

    for (const endpoint of endpoints) {
      try {
        const first = await $api.get(endpoint, { params: { page: 1, limit: 500 } });
        const firstData = first?.data || {};
        let merged = extractCompanyList(firstData);

        const totalPages = extractTotalPages(firstData);

        if (totalPages > 1) {
          const restRequests = [];
          for (let p = 2; p <= totalPages; p += 1) {
            restRequests.push($api.get(endpoint, { params: { page: p, limit: 500 } }));
          }
          const restResponses = await Promise.all(restRequests);
          restResponses.forEach((res) => {
            const payload = res?.data || {};
            const items = extractCompanyList(payload);
            merged = [...merged, ...items];
          });
        }

        const uniqById = Array.from(
          new Map(
            merged.map((item) => [item?._id || item?.id || item?.companyId, item])
          ).values()
        ).filter((item) => item?._id || item?.id || item?.companyId);

        setCompanies(uniqById);
        return;
      } catch {
        // try next endpoint
      }
    }
    setCompanies([]);
  };

  const resetIncomeForm = () => {
    setIncomeForm({
      source: "",
      amount: "",
      currency: "UZS",
      note: "",
      incomeDate: "",
      companyId: "",
    });
  };

  const handleCreateIncome = async (e) => {
    e.preventDefault();
    if (!incomeForm.source.trim() || !incomeForm.amount || !incomeForm.incomeDate) {
      setUiMessage({ type: "error", text: "Majburiy maydonlarni to'ldiring" });
      return;
    }
    if (isSuperAdmin && !incomeForm.companyId) {
      setUiMessage({ type: "error", text: "Kompaniyani tanlang" });
      return;
    }
    if (!isSuperAdmin && !actorCompanyId) {
      setUiMessage({ type: "error", text: "Sizning kompaniyangiz aniqlanmadi" });
      return;
    }

    const payload = {
      source: incomeForm.source.trim(),
      amount: Number(incomeForm.amount),
      currency: incomeForm.currency || "UZS",
      note: incomeForm.note?.trim() || "",
      incomeDate: new Date(incomeForm.incomeDate).toISOString(),
      ...(isSuperAdmin && incomeForm.companyId
        ? { companyId: incomeForm.companyId }
        : !isSuperAdmin && actorCompanyId
        ? { companyId: actorCompanyId }
        : {}),
    };

    try {
      setSubmittingIncome(true);
      await $api.post("/income/create", payload);
      setUiMessage({ type: "success", text: "Tushum muvaffaqiyatli yaratildi" });
      setShowIncomeModal(false);
      resetIncomeForm();
      fetchTable(1, debouncedSearch);
    } catch (error) {
      setUiMessage({
        type: "error",
        text: error?.response?.data?.message || "Tushum yaratilmadi",
      });
    } finally {
      setSubmittingIncome(false);
    }
  };

  const handleUpdateIncome = async (e) => {
    e.preventDefault();
    if (!editingIncomeId) return;
    if (!editIncomeForm.source.trim() || !editIncomeForm.amount || !editIncomeForm.incomeDate) {
      setUiMessage({ type: "error", text: "Majburiy maydonlarni to'ldiring" });
      return;
    }
    if (isSuperAdmin && !editIncomeForm.companyId) {
      setUiMessage({ type: "error", text: "Kompaniyani tanlang" });
      return;
    }
    if (!isSuperAdmin && !actorCompanyId) {
      setUiMessage({ type: "error", text: "Sizning kompaniyangiz aniqlanmadi" });
      return;
    }

    const payload = {
      source: editIncomeForm.source.trim(),
      amount: Number(editIncomeForm.amount),
      currency: editIncomeForm.currency || "UZS",
      note: editIncomeForm.note?.trim() || "",
      incomeDate: new Date(editIncomeForm.incomeDate).toISOString(),
      ...(isSuperAdmin && editIncomeForm.companyId
        ? { companyId: editIncomeForm.companyId }
        : !isSuperAdmin && actorCompanyId
        ? { companyId: actorCompanyId }
        : {}),
    };

    try {
      setSubmittingIncomeEdit(true);
      const patchEndpoints = [
        `/income/update/${editingIncomeId}`,
        `/income/edit/${editingIncomeId}`,
        `/income/${editingIncomeId}`,
      ];
      let updated = false;
      for (const endpoint of patchEndpoints) {
        try {
          await $api.patch(endpoint, payload);
          updated = true;
          break;
        } catch {
          // try next endpoint
        }
      }
      if (!updated) {
        throw new Error("Update endpoint topilmadi");
      }

      setUiMessage({ type: "success", text: "Tushum yangilandi" });
      setShowIncomeEditModal(false);
      setEditingIncomeId("");
      fetchTable(currentPage, debouncedSearch);
    } catch (error) {
      setUiMessage({
        type: "error",
        text: error?.response?.data?.message || "Tushum yangilanmadi",
      });
    } finally {
      setSubmittingIncomeEdit(false);
    }
  };

  const exportToExcel = () => {
    const exportData = tableRows.map((item) => ({
      Sana: item.date,
      Manba: item.source,
      Miqdor: item.numericAmount,
      Valyuta: item.currency,
      Kategoriya: item.category,
      Tavsif: item.description,
      "Foyda %": item.profit,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tushum Ma'lumotlari");
    const fileName = `Tushum_${getPeriodText(
      selectedPeriod
    )}_${new Date().toLocaleDateString("uz-UZ")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <div className="max-w-[100%] mx-auto py-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 bg-white/95 border border-emerald-100 rounded-2xl p-5 shadow-sm">
          <div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900">
              Tushum Tahlili
            </h1>
            <p className="text-slate-600 font-medium">
              Moliyaviy hisobotlar va tushum statistikasi
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 cursor-pointer text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              Excel yuklab olish
            </button>

            <button
              onClick={() => setShowIncomeModal(true)}
              className="bg-green-600 hover:bg-green-700 cursor-pointer text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              Yangi tushum
            </button>

          </div>
        </div>

        {uiMessage && (
          <div
            className={`mb-4 rounded-xl border px-3 py-2 text-sm ${
              uiMessage.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {uiMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {getPeriodText(selectedPeriod)} umumiy tushum
                </p>
                <p className="text-3xl font-bold text-gray-800 mb-1">
                  {formatNumber(statsRevenue)}
                </p>
                <p className="text-sm text-gray-600">so'm</p>
                <div className="flex items-center mt-2">
                  <span className="text-green-600 text-sm font-semibold">
                    +{onlinePercent}%
                  </span>
                  <span className="text-gray-400 text-sm ml-1">onlayn ulushi</span>
                </div>
              </div>
              <div className="p-4 bg-green-100 rounded-lg">
                <span className="text-2xl font-bold text-green-600">$</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Jami operatsiyalar
                </p>
                <p className="text-3xl font-bold text-gray-800 mb-1">
                  {operationsCount}
                </p>
                <p className="text-sm text-gray-600">ta tushum</p>
                <div className="flex items-center mt-2">
                  <span className="text-green-600 text-sm font-semibold">Aktiv</span>
                </div>
              </div>
              <div className="p-4 bg-gray-100 rounded-lg">
                <span className="text-2xl font-bold text-gray-600">#</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Eng yaxshi manba
                </p>
                <p className="text-lg font-bold text-gray-800 mb-1 truncate">
                  {topSource || "Ma'lumot yo'q"}
                </p>
                <p className="text-sm text-gray-600">Eng ko'p daromad</p>
                <div className="flex items-center mt-2">
                  <span className="text-green-600 text-sm font-semibold">TOP-1</span>
                </div>
              </div>
              <div className="p-4 bg-green-100 rounded-lg">
                <span className="text-xl font-bold text-green-600">*</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  O'rtacha foyda
                </p>
                <p className="text-3xl font-bold text-gray-800 mb-1">
                  {onlinePercent}%
                </p>
                <p className="text-sm text-gray-600">Onlayn ulushi</p>
                <div className="flex items-center mt-2">
                  <span className="text-green-600 text-sm font-semibold">
                    Yaxshi ko'rsatkich
                  </span>
                </div>
              </div>
              <div className="p-4 bg-gray-100 rounded-lg">
                <span className="text-2xl font-bold text-gray-600">%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-900 to-green-900 p-6 border-b border-emerald-800">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-white font-semibold mr-3">Davr:</span>
                {PERIOD_OPTIONS.map((period) => (
                  <button
                    key={period.key}
                    onClick={() => {
                      setSelectedPeriod(period.key);
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedPeriod === period.key
                        ? "bg-white text-emerald-900 shadow-md"
                        : "bg-emerald-800/70 text-white hover:bg-emerald-700"
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Qidiruv..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-4 py-2 pl-10 w-64 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                />
                <svg
                  className="w-5 h-5 text-gray-400 absolute left-3 top-2.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="p-1">
            <GlobalTable
              columns={columns}
              visibleColumns={visibleColumns}
              sampleData={displayRows}
              load={loading}
              itemsPerPage={10}
              useServerPagination={true}
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        </div>

        {showIncomeModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateIncome}
              className="w-full max-w-xl bg-white rounded-2xl border border-emerald-100 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Yangi tushum</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowIncomeModal(false);
                    resetIncomeForm();
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Manba (masalan: Naqd savdo)"
                  value={incomeForm.source}
                  onChange={(e) => setIncomeForm((p) => ({ ...p, source: e.target.value }))}
                />
                <input
                  type="number"
                  min="0"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Miqdor"
                  value={incomeForm.amount}
                  onChange={(e) => setIncomeForm((p) => ({ ...p, amount: e.target.value }))}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={incomeForm.currency}
                    onChange={(e) => setIncomeForm((p) => ({ ...p, currency: e.target.value }))}
                  >
                    <option value="UZS">UZS</option>
                    <option value="USD">USD</option>
                    <option value="RUB">RUB</option>
                  </select>
                  <input
                    type="datetime-local"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={incomeForm.incomeDate}
                    onChange={(e) => setIncomeForm((p) => ({ ...p, incomeDate: e.target.value }))}
                  />
                </div>
                {isSuperAdmin && (
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={incomeForm.companyId}
                    onChange={(e) => setIncomeForm((p) => ({ ...p, companyId: e.target.value }))}
                  >
                    <option value="">Kompaniya tanlang</option>
                    {companies.map((company) => (
                      <option key={company._id} value={company._id}>
                        {company.name || company.company_name || company._id}
                      </option>
                    ))}
                  </select>
                )}
                <textarea
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Izoh"
                  value={incomeForm.note}
                  onChange={(e) => setIncomeForm((p) => ({ ...p, note: e.target.value }))}
                />
              </div>
              <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowIncomeModal(false);
                    resetIncomeForm();
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submittingIncome}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-60"
                >
                  {submittingIncome ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        )}



        {showIncomeEditModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <form
              onSubmit={handleUpdateIncome}
              className="w-full max-w-xl bg-white rounded-2xl border border-emerald-100 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Tushumni tahrirlash</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowIncomeEditModal(false);
                    setEditingIncomeId("");
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Manba"
                  value={editIncomeForm.source}
                  onChange={(e) => setEditIncomeForm((p) => ({ ...p, source: e.target.value }))}
                />
                <input
                  type="number"
                  min="0"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Miqdor"
                  value={editIncomeForm.amount}
                  onChange={(e) => setEditIncomeForm((p) => ({ ...p, amount: e.target.value }))}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editIncomeForm.currency}
                    onChange={(e) =>
                      setEditIncomeForm((p) => ({ ...p, currency: e.target.value }))
                    }
                  >
                    <option value="UZS">UZS</option>
                    <option value="USD">USD</option>
                    <option value="RUB">RUB</option>
                  </select>
                  <input
                    type="datetime-local"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editIncomeForm.incomeDate}
                    onChange={(e) =>
                      setEditIncomeForm((p) => ({ ...p, incomeDate: e.target.value }))
                    }
                  />
                </div>
                {isSuperAdmin && (
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editIncomeForm.companyId}
                    onChange={(e) =>
                      setEditIncomeForm((p) => ({ ...p, companyId: e.target.value }))
                    }
                  >
                    <option value="">Kompaniya tanlang</option>
                    {companies.map((company) => (
                      <option key={company._id} value={company._id}>
                        {company.name || company.company_name || company._id}
                      </option>
                    ))}
                  </select>
                )}
                <textarea
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Izoh"
                  value={editIncomeForm.note}
                  onChange={(e) => setEditIncomeForm((p) => ({ ...p, note: e.target.value }))}
                />
              </div>
              <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowIncomeEditModal(false);
                    setEditingIncomeId("");
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submittingIncomeEdit}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-60"
                >
                  {submittingIncomeEdit ? "Saqlanmoqda..." : "Yangilash"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountsPage;
