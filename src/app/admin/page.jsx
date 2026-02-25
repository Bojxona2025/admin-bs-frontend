"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import $api from "@/app/http/api";

const USER_CREATE_ENDPOINT =
  process.env.NEXT_PUBLIC_USER_CREATE_ENDPOINT || "/users";
const USER_LIST_ENDPOINT =
  process.env.NEXT_PUBLIC_USER_LIST_ENDPOINT || "/users/all";
const USER_TOGGLE_ENDPOINT =
  process.env.NEXT_PUBLIC_USER_TOGGLE_ENDPOINT || "/users/toggle";
const USER_DELETE_ENDPOINT =
  process.env.NEXT_PUBLIC_USER_DELETE_ENDPOINT || "/users/delete";

const COMPANY_CREATE_ENDPOINT =
  process.env.NEXT_PUBLIC_COMPANY_CREATE_ENDPOINT || "/company/create";
const COMPANY_LIST_ENDPOINT =
  process.env.NEXT_PUBLIC_COMPANY_LIST_ENDPOINT || "/company/all";
const COMPANY_TOGGLE_ENDPOINT =
  process.env.NEXT_PUBLIC_COMPANY_TOGGLE_ENDPOINT || "/company/toggle";
const COMPANY_DELETE_ENDPOINT =
  process.env.NEXT_PUBLIC_COMPANY_DELETE_ENDPOINT || "/company/delete";

const normalizeRole = (role) =>
  typeof role === "string" ? role.trim().toUpperCase() : "";

const isSuperAdminRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === "SUPERADMIN" || normalized === "SUPER_ADMIN";
};

const normalizeStatus = (status) =>
  typeof status === "string" ? status.trim().toLowerCase() : "";

const getEntityId = (item) => item?._id || item?.id || "";

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const iframeRef = useRef(null);

  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });
  const [companyForm, setCompanyForm] = useState({
    name: "",
    stir: "",
    status: "active",
  });

  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [savingUser, setSavingUser] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const { adminToken, iframeSrc } = useMemo(() => {
    if (typeof window === "undefined") {
      return { adminToken: null, iframeSrc: "" };
    }

    const token =
      localStorage.getItem("admin_token") || localStorage.getItem("accessToken");
    const adminBaseUrl =
      process.env.NEXT_PUBLIC_ADMIN_PANEL_URL || "http://localhost:5173/";
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
    const assetsBaseUrl = apiBaseUrl.replace(/\/api$/i, "");

    if (!token) {
      return { adminToken: null, iframeSrc: adminBaseUrl };
    }

    const separator = adminBaseUrl.includes("?") ? "&" : "?";
    const srcWithToken = `${adminBaseUrl}${separator}accessToken=${encodeURIComponent(
      token
    )}&token=${encodeURIComponent(token)}&apiBaseUrl=${encodeURIComponent(
      apiBaseUrl
    )}&assetsBaseUrl=${encodeURIComponent(assetsBaseUrl)}`;

    return { adminToken: token, iframeSrc: srcWithToken };
  }, []);

  useEffect(() => {
    if (!adminToken) {
      router.replace("/register");
      return;
    }

    if (typeof window !== "undefined") {
      try {
        const rawUser = localStorage.getItem("user");
        const parsed = rawUser ? JSON.parse(rawUser) : null;
        const role = parsed?.role || parsed?.user?.role || "";
        setIsSuperAdmin(isSuperAdminRole(role));
      } catch {
        setIsSuperAdmin(false);
      }
    }

    setReady(true);
  }, [adminToken, router]);

  const notify = (message, type = "success") => {
    if (typeof window !== "undefined" && window.toast) {
      window.toast(message, type);
      return;
    }
    console.log(`${type}: ${message}`);
  };

  const extractItems = (payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.users)) return payload.users;
    if (Array.isArray(payload.companies)) return payload.companies;
    if (Array.isArray(payload.items)) return payload.items;
    return [];
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await $api.get(USER_LIST_ENDPOINT);
      setUsers(extractItems(res?.data));
    } catch (error) {
      notify(error?.userMessage || "Userlar ro'yxatini olishda xatolik", "error");
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const res = await $api.get(COMPANY_LIST_ENDPOINT);
      setCompanies(extractItems(res?.data));
    } catch (error) {
      notify(
        error?.userMessage || "Companylar ro'yxatini olishda xatolik",
        "error"
      );
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  useEffect(() => {
    if (!ready || !isSuperAdmin) return;
    fetchUsers();
    fetchCompanies();
  }, [ready, isSuperAdmin]);

  const handleIframeLoad = () => {
    if (!iframeRef.current?.contentWindow || !adminToken) return;

    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

    iframeRef.current.contentWindow.postMessage(
      {
        type: "ADMIN_AUTH_TOKEN",
        accessToken: adminToken,
        token: adminToken,
        apiBaseUrl,
        assetsBaseUrl: apiBaseUrl.replace(/\/api$/i, ""),
      },
      "*"
    );
  };

  const createUser = async (e) => {
    e.preventDefault();
    setSavingUser(true);

    try {
      const payload = {
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        password: userForm.password,
        role: userForm.role,
      };

      await $api.post(USER_CREATE_ENDPOINT, payload);
      notify("Foydalanuvchi muvaffaqiyatli yaratildi", "success");
      setUserForm({ name: "", email: "", password: "", role: "user" });
      await fetchUsers();
      setActivePanel(null);
    } catch (error) {
      notify(error?.userMessage || "Foydalanuvchi yaratishda xatolik", "error");
    } finally {
      setSavingUser(false);
    }
  };

  const createCompany = async (e) => {
    e.preventDefault();
    setSavingCompany(true);

    try {
      const payload = {
        name: companyForm.name.trim(),
        stir: companyForm.stir.trim(),
        status: companyForm.status,
      };

      await $api.post(COMPANY_CREATE_ENDPOINT, payload);
      notify("Company muvaffaqiyatli yaratildi", "success");
      setCompanyForm({ name: "", stir: "", status: "active" });
      await fetchCompanies();
      setActivePanel(null);
    } catch (error) {
      notify(error?.userMessage || "Company yaratishda xatolik", "error");
    } finally {
      setSavingCompany(false);
    }
  };

  const handleToggle = async (type, id) => {
    if (!id) return;
    const key = `${type}-toggle-${id}`;
    setPendingAction(key);

    try {
      if (type === "user") {
        await $api.patch(`${USER_TOGGLE_ENDPOINT}/${id}`);
        await fetchUsers();
      } else {
        await $api.patch(`${COMPANY_TOGGLE_ENDPOINT}/${id}`);
        await fetchCompanies();
      }
      notify("Status yangilandi", "success");
    } catch (error) {
      notify(error?.userMessage || "Statusni yangilashda xatolik", "error");
    } finally {
      setPendingAction(null);
    }
  };

  const askDelete = (type, id) => {
    setConfirmAction({ type, id });
  };

  const cancelDelete = () => {
    setConfirmAction(null);
  };

  const confirmDelete = async () => {
    if (!confirmAction?.id || !confirmAction?.type) return;
    const { type, id } = confirmAction;
    const key = `${type}-delete-${id}`;
    setPendingAction(key);

    try {
      if (type === "user") {
        await $api.delete(`${USER_DELETE_ENDPOINT}/${id}`);
        await fetchUsers();
      } else {
        await $api.delete(`${COMPANY_DELETE_ENDPOINT}/${id}`);
        await fetchCompanies();
      }
      notify("Muvaffaqiyatli o'chirildi", "success");
      setConfirmAction(null);
    } catch (error) {
      notify(error?.userMessage || "O'chirishda xatolik", "error");
    } finally {
      setPendingAction(null);
    }
  };

  const getUserStatus = (item) =>
    normalizeStatus(item?.status || item?.userStatus || item?.state);

  const getCompanyStatus = (item) =>
    normalizeStatus(item?.status || item?.state);

  const filteredCompanies = useMemo(() => {
    const q = companySearch.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((item) => {
      const name = (item?.name || "").toLowerCase();
      const stir = (item?.stir || "").toLowerCase();
      const status = normalizeStatus(item?.status || item?.state);
      return name.includes(q) || stir.includes(q) || status.includes(q);
    });
  }, [companies, companySearch]);

  if (!ready) return null;

  return (
    <div className="h-screen w-full bg-slate-100 relative">
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        className="border-0 w-full h-full"
        allow="clipboard-read; clipboard-write"
        onLoad={handleIframeLoad}
      />
    </div>
  );
}
