import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  BadgeDollarSign,
  CreditCard,
  ExternalLink,
  RefreshCcw,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import GlobalTable from "../../components/global_table/GlobalTable";
import $api from "../../http/api";

const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/[_\s]/g, "");

const toId = (value) => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return String(
    value?._id ||
      value?.id ||
      value?.companyId ||
      value?.company_id ||
      value?.orderId ||
      ""
  );
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const timestamp = Number(value);
  const date =
    Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp) : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("uz-UZ");
};

const formatMoney = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "0";
  return new Intl.NumberFormat("uz-UZ").format(amount);
};

const getStateLabel = (state) => {
  const numeric = Number(state);
  if (numeric === 2) return "To'langan";
  if (numeric === 1) return "Yaratilgan";
  if (numeric === -1) return "Bekor qilingan";
  if (numeric === -2) return "Qaytarilgan";
  return String(state ?? "-");
};

const extractRows = (payload) => {
  const data = payload?.data ?? payload;
  const list =
    data?.transactions ||
    data?.data ||
    data?.items ||
    data?.results ||
    payload?.transactions ||
    [];
  return Array.isArray(list) ? list : [];
};

const isEmptyLikeError = (error) => {
  const status = Number(error?.response?.status || 0);
  const msg = String(
    error?.response?.data?.message || error?.response?.data?.msg || ""
  ).toLowerCase();
  if (status === 404) return true;
  if (msg.includes("not found")) return true;
  if (msg.includes("topilmadi")) return true;
  if (msg.includes("no transaction")) return true;
  return false;
};

const useDebouncedValue = (value, delay = 500) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const PaymentsPage = () => {
  const { user } = useSelector((state) => state.user);
  const actorRole = normalizeRole(user?.role);
  const isSuperAdmin = actorRole === "superadmin";
  const actorCompanyId =
    toId(user?.companyId) || toId(user?.company) || toId(user?.companyData) || "";

  const [loading, setLoading] = useState(false);
  const [rawTransactions, setRawTransactions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [uiMessage, setUiMessage] = useState(null);

  const debouncedQuery = useDebouncedValue(query, 5000);

  const showError = (text) => setUiMessage({ type: "error", text });
  const showSuccess = (text) => setUiMessage({ type: "success", text });

  const loadCompanies = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const { data } = await $api.get("/company/all", { params: { page: 1, limit: 300 } });
      const rows = data?.data || data?.companies || data?.items || [];
      setCompanies(Array.isArray(rows) ? rows : []);
    } catch {
      setCompanies([]);
    }
  }, [isSuperAdmin]);

  const loadTransactions = useCallback(
    async (nextPage = 1) => {
      setLoading(true);
      try {
        let data;
        try {
          const res = await $api.get("/payme/get/transactions", {
            params: { page: nextPage, limit: 20 },
          });
          data = res?.data;
        } catch (firstErr) {
          // Ba'zi backendlar shu nomdan foydalanadi
          const res = await $api.get("/payme/get/transaction/all", {
            params: { page: nextPage, limit: 20 },
          });
          data = res?.data;
          if (!data) throw firstErr;
        }

        const rows = extractRows(data);
        setRawTransactions(rows);
        setPage(Number(data?.currentPage || data?.page || nextPage || 1));
        setTotalPages(Number(data?.totalPages || data?.pages || 1));
      } catch (error) {
        setRawTransactions([]);
        if (isEmptyLikeError(error)) {
          setPage(1);
          setTotalPages(1);
          setTotalItems(0);
          return;
        }
        showError(error?.response?.data?.message || "To'lovlarni olishda xatolik");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    loadTransactions(1);
  }, [loadTransactions]);

  useEffect(() => {
    if (!uiMessage) return;
    const t = setTimeout(() => setUiMessage(null), 3500);
    return () => clearTimeout(t);
  }, [uiMessage]);

  useEffect(() => {
    const q = String(debouncedQuery || "").trim().toLowerCase();
    const filtered = rawTransactions.filter((item) => {
      const txCompanyId = toId(item?.companyId || item?.company || item?.order?.companyId);

      if (isSuperAdmin) {
        if (selectedCompanyId && txCompanyId !== selectedCompanyId) return false;
      } else {
        if (!actorCompanyId) return false;
        if (!txCompanyId) return false;
        if (txCompanyId !== actorCompanyId) return false;
      }

      if (stateFilter && String(item?.state ?? "") !== stateFilter) return false;

      if (!q) return true;
      const hay = [
        item?._id,
        item?.payme_transaction_id,
        item?.orderId,
        item?.order_id,
        item?.reason,
        item?.state,
        item?.companyId?.name,
        item?.company?.name,
      ]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");

      return hay.includes(q);
    });

    const mapped = filtered.map((item, idx) => ({
      id: toId(item?._id || item?.id || item?.payme_transaction_id || `${idx}`),
      index: idx + 1,
      payme_transaction_id: item?.payme_transaction_id || item?.transactionId || item?.id || "-",
      orderId: item?.orderId || item?.order_id || "-",
      company:
        item?.companyId?.name ||
        item?.company?.name ||
        toId(item?.companyId || item?.company) ||
        "-",
      amount: `${formatMoney(item?.price || item?.amount)} so'm`,
      state: getStateLabel(item?.state),
      create_time: formatDateTime(item?.create_time || item?.createdAt),
      perform_time: formatDateTime(item?.perform_time),
      cancel_time: formatDateTime(item?.cancel_time),
      reason: item?.reason ?? "-",
      actions: isSuperAdmin ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2 py-1 rounded bg-sky-100 text-sky-700 cursor-pointer"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const id = toId(item?._id || item?.id);
                if (!id) return;
                const { data: single } = await $api.get(`/payme/get/transaction/${id}`);
                console.log("payme transaction detail", single);
                showSuccess("Transaction konsolga chiqarildi");
              } catch (error) {
                showError(error?.response?.data?.message || "Transaction ochilmadi");
              }
            }}
          >
            <ExternalLink size={13} />
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded bg-red-100 text-red-700 cursor-pointer"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const id = toId(item?._id || item?.id);
                if (!id) return;
                await $api.delete(`/payme/delete/by/${id}`);
                showSuccess("Transaction o'chirildi");
                await loadTransactions(page);
              } catch (error) {
                showError(error?.response?.data?.message || "O'chirishda xatolik");
              }
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ) : (
        "-"
      ),
    }));

    setTransactions(mapped);
    setTotalItems(mapped.length);
    setTotalPages(1);
    setPage(1);
  }, [rawTransactions, debouncedQuery, isSuperAdmin, selectedCompanyId, actorCompanyId, stateFilter, loadTransactions]);

  const stats = useMemo(() => {
    const totalAmount = transactions.reduce((sum, row) => {
      const n = Number(String(row.amount).replace(/[^\d.-]/g, ""));
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    return {
      total: transactions.length,
      amount: totalAmount,
      paid: transactions.filter((row) => row.state === "To'langan").length,
    };
  }, [transactions]);

  const columns = [
    { key: "index", label: "T/r" },
    { key: "payme_transaction_id", label: "Payme transaction" },
    { key: "orderId", label: "Buyurtma ID" },
    { key: "company", label: "Kompaniya" },
    { key: "amount", label: "Miqdor" },
    { key: "state", label: "Holat" },
    { key: "create_time", label: "Yaratilgan vaqti" },
    { key: "perform_time", label: "To'langan vaqti" },
    { key: "cancel_time", label: "Bekor qilingan vaqti" },
    { key: "reason", label: "Sabab" },
    ...(isSuperAdmin ? [{ key: "actions", label: "Amallar" }] : []),
  ];

  const visibleColumns = {
    index: true,
    payme_transaction_id: true,
    orderId: true,
    company: true,
    amount: true,
    state: true,
    create_time: true,
    perform_time: true,
    cancel_time: true,
    reason: true,
    actions: isSuperAdmin,
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Moliya: To'lovlar</h1>
          </div>
          <button
            type="button"
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-2 cursor-pointer"
            onClick={() => loadTransactions(page)}
          >
            <RefreshCcw size={15} />
            Yangilash
          </button>
        </div>
      </div>

      {uiMessage && (
        <div
          className={`rounded-xl border px-3 py-2 text-sm ${
            uiMessage.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {uiMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-200 bg-white p-4">
          <p className="text-sm text-slate-500 inline-flex items-center gap-1">
            <Wallet size={15} /> Jami transaction
          </p>
          <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-white p-4">
          <p className="text-sm text-slate-500 inline-flex items-center gap-1">
            <CreditCard size={15} /> To'langanlar
          </p>
          <p className="text-3xl font-bold text-emerald-700">{stats.paid}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-white p-4">
          <p className="text-sm text-slate-500 inline-flex items-center gap-1">
            <BadgeDollarSign size={15} /> Jami miqdor
          </p>
          <p className="text-3xl font-bold text-slate-900">{formatMoney(stats.amount)} so'm</p>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-white p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              className="w-full border border-emerald-200 rounded-lg pl-9 pr-3 py-2"
              placeholder="Transaction, buyurtma, sabab... (5 soniyada qidiradi)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="border border-emerald-200 rounded-lg px-3 py-2"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="">Barcha holat</option>
            <option value="2">To'langan</option>
            <option value="1">Yaratilgan</option>
            <option value="-1">Bekor qilingan</option>
            <option value="-2">Qaytarilgan</option>
          </select>
          {isSuperAdmin ? (
            <select
              className="border border-emerald-200 rounded-lg px-3 py-2"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
            >
              <option value="">Barcha kompaniyalar</option>
              {companies.map((c) => (
                <option key={toId(c)} value={toId(c)}>
                  {c?.name || c?.company_name || toId(c)}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            onClick={() => loadTransactions(1)}
          >
            Yangilash
          </button>
        </div>
      </div>

      <GlobalTable
        columns={columns}
        visibleColumns={visibleColumns}
        sampleData={transactions}
        load={loading}
        useServerPagination={false}
        currentPage={1}
        totalPages={1}
        totalItems={totalItems}
        itemsPerPage={20}
      />
    </div>
  );
};

export default PaymentsPage;
