import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  Eye,
  EyeOff,
  RefreshCcw,
  Search,
  Settings,
  Users as UsersIcon,
  X,
} from "lucide-react";
import $api from "../../http/api";
import GlobalTable from "../../components/global_table/GlobalTable";
import { toAssetUrl } from "../../utils/imageUrl";
import { getRoleLabelUz } from "../../utils/roleLabel";

const ROLE_OPTIONS = ["user", "employee", "admin", "superadmin"];
const normalizeRole = (role) => String(role || "").toLowerCase().replace(/[_\s]/g, "");
const isSuperAdminRole = (role) => normalizeRole(role) === "superadmin";
const isAdminLikeRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized.includes("admin") && normalized !== "superadmin";
};
const getCachedProfile = () => {
  try {
    return JSON.parse(localStorage.getItem("user_profile_cache") || "null");
  } catch {
    return null;
  }
};
const getRoleFromStorage = () =>
  normalizeRole(
    localStorage.getItem("user_role") ||
      localStorage.getItem("role") ||
      localStorage.getItem("userRole") ||
      ""
  );
const getRoleFromToken = () => {
  try {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      "";
    if (!token) return "";
    const parts = token.split(".");
    if (parts.length < 2) return "";
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return normalizeRole(payload?.role || payload?.userRole || "");
  } catch {
    return "";
  }
};
const resolveActorRole = (user) => {
  const cached = getCachedProfile();
  return normalizeRole(
    user?.role || cached?.role || getRoleFromStorage() || getRoleFromToken()
  );
};
const GENDER_OPTIONS = [
  { value: "male", label: "Erkak" },
  { value: "female", label: "Ayol" },
  { value: "other", label: "Boshqa" },
];

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("uz-UZ");
};

const buildUserRoleOptions = (actorRole) => {
  const normalized = normalizeRole(actorRole);
  if (normalized === "superadmin") return ROLE_OPTIONS;
  if (isAdminLikeRole(normalized)) return ["employee"];
  return [];
};

const collectSearchableValues = (input) => {
  if (input == null) return [];
  if (Array.isArray(input)) {
    return input.flatMap((item) => collectSearchableValues(item));
  }
  if (typeof input === "object") {
    return Object.values(input).flatMap((value) => collectSearchableValues(value));
  }
  return [String(input)];
};

const filterCompaniesByAllFields = (companies, term) => {
  const query = term.trim().toLowerCase();
  if (!query) return companies;

  return companies.filter((company) =>
    collectSearchableValues(company).some((value) =>
      value.toLowerCase().includes(query)
    )
  );
};

const getApiErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.msg ||
  "Xatolik yuz berdi";

const normalizeCompanyStatus = (company) => {
  const rawStatus = company?.status;
  if (typeof rawStatus === "string" && rawStatus.trim()) {
    return rawStatus.toLowerCase();
  }
  if (typeof company?.isActive === "boolean") {
    return company.isActive ? "active" : "inactive";
  }
  if (typeof company?.active === "boolean") {
    return company.active ? "active" : "inactive";
  }
  return "active";
};

const normalizeStir = (value = "") => value.replace(/\D/g, "");
const getRoleLabel = (role) => getRoleLabelUz(role);

const getStatusLabel = (status) =>
  (status || "").toLowerCase() === "inactive" ? "Nofaol" : "Faol";

export const Users = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.user);

  const [activeTab, setActiveTab] = useState("users");
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [companySearchTerm, setCompanySearchTerm] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(30);
  const [rowsPerLimit, setRowsPerLimit] = useState(30);
  const [dataLoad, setDataLoad] = useState(false);
  const settingsButtonRef = useRef(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, right: 0 });

  const [visibleColumns, setVisibleColumns] = useState({
    index: true,
    role: true,
    status: true,
    company: true,
    gender: true,
    last_activity: true,
    phoneNumber: true,
    name: true,
    lastLogin: true,
    createdAt: true,
    setting: true,
  });

  const [userRows, setUserRows] = useState([]);
  const [companyRows, setCompanyRows] = useState([]);
  const [paginationData, setPaginationData] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createAvatarFile, setCreateAvatarFile] = useState(null);
  const [createAvatarPreview, setCreateAvatarPreview] = useState("");
  const [editAvatarFile, setEditAvatarFile] = useState(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState("");

  const [companies, setCompanies] = useState([]);

  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "+998",
    password: "",
    role: "employee",
    companyId: "",
    gender: "other",
  });

  const [newCompany, setNewCompany] = useState({
    name: "",
    stir: "",
  });
  const [editUser, setEditUser] = useState({
    id: "",
    firstName: "",
    lastName: "",
    phoneNumber: "+998",
    password: "",
    role: "employee",
    companyId: "",
    gender: "other",
  });
  const [editCompany, setEditCompany] = useState({
    id: "",
    name: "",
    stir: "",
    status: "active",
  });
  const [uiMessage, setUiMessage] = useState(null);
  const [userFormErrors, setUserFormErrors] = useState({});
  const [companyFormErrors, setCompanyFormErrors] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);
  const [roleEditor, setRoleEditor] = useState({
    open: false,
    userId: "",
    value: "",
    options: [],
  });

  const actorRole = resolveActorRole(user);
  const isSuperAdmin = isSuperAdminRole(actorRole);
  const isAdminLike = isAdminLikeRole(actorRole);
  const canManageUsers = isAdminLike || isSuperAdmin;
  const canManageCompanies = isSuperAdmin;

  const showError = (text) => setUiMessage({ type: "error", text });
  const showSuccess = (text) => setUiMessage({ type: "success", text });

  useEffect(() => {
    if (location.pathname.startsWith("/system/companies")) {
      if (!isSuperAdmin) {
        navigate("/system/users", { replace: true });
        return;
      }
      setActiveTab("companies");
      return;
    }
    setActiveTab("users");
  }, [location.pathname, isSuperAdmin, navigate]);

  useEffect(() => {
    if (!uiMessage) return;
    const timer = setTimeout(() => setUiMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [uiMessage]);

  useEffect(() => {
    if (!pendingDelete) return;
    const timer = setTimeout(() => setPendingDelete(null), 5000);
    return () => clearTimeout(timer);
  }, [pendingDelete]);

  useEffect(() => {
    return () => {
      if (createAvatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(createAvatarPreview);
      }
    };
  }, [createAvatarPreview]);

  useEffect(() => {
    return () => {
      if (editAvatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(editAvatarPreview);
      }
    };
  }, [editAvatarPreview]);

  const userColumns = useMemo(
    () => [
      { key: "index", label: "T/r" },
      { key: "role", label: "Rol" },
      { key: "status", label: "Holat" },
      { key: "company", label: "Kompaniya" },
      { key: "gender", label: "Jinsi" },
      { key: "last_activity", label: "So'nggi faollik" },
      { key: "phoneNumber", label: "Telefon" },
      { key: "name", label: "F.I.SH" },
      { key: "lastLogin", label: "Oxirgi kirish" },
      { key: "createdAt", label: "Ro'yxatdan o'tgan" },
      {
        key: "setting",
        label: (
          <button
            ref={settingsButtonRef}
            className="p-1 hover:bg-gray-100 rounded items-center"
            onClick={() => {
              if (settingsButtonRef.current && !showColumnSettings) {
                const rect = settingsButtonRef.current.getBoundingClientRect();
                const scrollTop =
                  window.pageYOffset || document.documentElement.scrollTop;

                setModalPosition({
                  top: rect.bottom + scrollTop + 5,
                  right: Math.max(16, window.innerWidth - rect.left - 60),
                });
              }
              setShowColumnSettings((prev) => !prev);
            }}
          >
            <Settings className="w-4 h-4 font-[900] text-[#2db789] cursor-pointer" />
          </button>
        ),
      },
    ],
    [showColumnSettings]
  );

  const companyColumns = [
    { key: "name", label: "Nomi" },
    { key: "stir", label: "STIR/INN" },
    { key: "status", label: "Holat" },
    { key: "createdAt", label: "Yaratilgan sana" },
    { key: "setting", label: "Amallar" },
  ];

  const loadUsers = async (page = 1) => {
    setDataLoad(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(rowsPerPage),
        query: searchTerm,
      });
      if (isAdminLike) {
        params.set("role", "employee");
        const myCompanyId = user?.companyId?._id || user?.companyId;
        if (myCompanyId) params.set("companyId", String(myCompanyId));
      }
      const { data } = await $api.get(`/users/get/all?${params.toString()}`);

      const list = data?.data || data?.users || [];
      const scopedList = isAdminLike
        ? list.filter((item) => normalizeRole(item?.role) === "employee")
        : list;
      const formatted = scopedList.map((item, idx) => ({
        index: (page - 1) * rowsPerPage + idx + 1,
        id: item._id,
        name: `${item.firstName || ""} ${item.lastName || ""}`.trim() || "-",
        phoneNumber: item.phoneNumber || "-",
        role: getRoleLabel(item.role),
        status: getStatusLabel(item.status),
        company:
          item.companyName ||
          item.companyId?.name ||
          item.company?.name ||
          item.company_title ||
          item.companyId?.title ||
          "-",
        gender: item.gender || "-",
        createdAt: formatDate(item.createdAt),
        lastLogin: formatDate(item.lastLogin),
        last_activity: formatDate(item.last_activity),
        setting: (
          <div className="flex items-center gap-2">
            {canManageUsers && (
              <button
                className="px-2 py-1 text-[10px] rounded bg-emerald-100 text-emerald-700 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setUserFormErrors({});
                  setShowEditPassword(false);
                  setEditUser({
                    id: item._id,
                    firstName: item.firstName || "",
                    lastName: item.lastName || "",
                    phoneNumber: item.phoneNumber || "+998",
                    password: "",
                    role: normalizeRole(item.role) || "employee",
                    companyId: item.companyId?._id || item.companyId || "",
                    gender: item.gender || "other",
                    avatarUrl: item.avatar || item.avatarUrl || "",
                  });
                  setEditAvatarFile(null);
                  setEditAvatarPreview(toAssetUrl(item.avatar || item.avatarUrl || ""));
                  setShowEditUserModal(true);
                }}
              >
                Tahrir
              </button>
            )}
            {canManageUsers && (
              <button
                className="px-2 py-1 text-[10px] rounded bg-blue-100 text-blue-700 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  const allowed = buildUserRoleOptions(actorRole);
                  if (!allowed.length) return;
                  setRoleEditor({
                    open: true,
                    userId: item._id,
                    options: allowed,
                    value: allowed.includes(item.role) ? item.role : allowed[0],
                  });
                }}
              >
                Rol
              </button>
            )}
            {canManageUsers && (
              <button
                className="px-2 py-1 text-[10px] rounded bg-amber-100 text-amber-700 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleUserStatus(item._id);
                }}
              >
                Holat
              </button>
            )}
            {canManageUsers && (item.status || "active").toLowerCase() === "inactive" && (
              <button
                className="px-2 py-1 text-[10px] rounded bg-red-100 text-red-700 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteUser(item._id, item.status || "active");
                }}
              >
                {pendingDelete?.type === "user" && pendingDelete.id === item._id
                  ? "Tasdiqlang"
                  : "O'chirish"}
              </button>
            )}
          </div>
        ),
      }));

      setUserRows(formatted);
      setPaginationData({
        currentPage: data?.currentPage || data?.page || page,
        totalItems: data?.totalItems || data?.total || scopedList.length,
        totalPages: data?.totalPages || 1,
      });
    } catch (error) {
      console.error(error);
      setUserRows([]);
    } finally {
      setDataLoad(false);
    }
  };

  const loadCompanies = async () => {
    if (!isSuperAdmin) return;

    setDataLoad(true);
    try {
      const tryEndpoints = ["/company/all", "/companies/all", "/company/get/all"];
      let data = null;
      let lastError = null;

      for (const endpoint of tryEndpoints) {
        try {
          const response = await $api.get(endpoint);
          data = response?.data;
          if (data) break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!data) {
        throw lastError || new Error("Kompaniyalar endpoint topilmadi");
      }

      const allCompanies = data?.data || data?.companies || [];
      const filteredCompanies = filterCompaniesByAllFields(
        allCompanies,
        companySearchTerm
      );
      setCompanies(allCompanies);

      setCompanyRows(
        filteredCompanies.map((item) => {
          const status = normalizeCompanyStatus(item);
          return {
            id: item._id,
            name: item.name || item.company_name || "-",
            stir: item.stir || item.inn || "-",
            status: getStatusLabel(status),
            createdAt: formatDate(item.createdAt),
            setting: (
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 text-[10px] rounded bg-emerald-100 text-emerald-700 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCompanyFormErrors({});
                    setEditCompany({
                      id: item._id,
                      name: item.name || item.company_name || "",
                      stir: item.stir || item.inn || "",
                      status,
                    });
                    setShowEditCompanyModal(true);
                  }}
                >
                  Tahrir
                </button>
                <button
                  className="px-2 py-1 text-[10px] rounded bg-amber-100 text-amber-700 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleCompanyStatus(item);
                  }}
                >
                  Holat
                </button>
                {status === "inactive" && (
                  <button
                    className={`px-2 py-1 text-[10px] rounded cursor-pointer ${
                      pendingDelete?.type === "company" &&
                      pendingDelete.id === item._id
                        ? "bg-red-600 text-white"
                        : "bg-red-100 text-red-700"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCompany(item._id, status);
                    }}
                  >
                    {pendingDelete?.type === "company" &&
                    pendingDelete.id === item._id
                      ? "Tasdiqlang"
                      : "O'chirish"}
                  </button>
                )}
              </div>
            ),
          };
        })
      );
    } catch (error) {
      showError(getApiErrorMessage(error) || "Kompaniyalarni olishga ruxsat yo'q");
      setCompanyRows([]);
    } finally {
      setDataLoad(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      loadUsers(1);
    } else if (activeTab === "companies") {
      loadCompanies();
    }
  }, [activeTab, rowsPerPage, searchTerm, companySearchTerm]);

  const handleUpdateRole = async (userId, role) => {
    try {
      await $api.patch(`/users/update/role/${userId}`, { role });
      setRoleEditor({ open: false, userId: "", value: "", options: [] });
      showSuccess("Rol yangilandi");
      await loadUsers(paginationData.currentPage);
    } catch (error) {
      showError(getApiErrorMessage(error) || "Rol yangilanmadi");
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      await $api.patch(`/users/toggle/status/${userId}`);
      showSuccess("Foydalanuvchi holati yangilandi");
      await loadUsers(paginationData.currentPage);
    } catch (error) {
      showError(getApiErrorMessage(error) || "Holat o'zgarmadi");
    }
  };

  const handleDeleteUser = async (userId, status) => {
    if ((status || "").toLowerCase() !== "inactive") {
      showError("Foydalanuvchini o'chirish uchun avval holati nofaol bo'lishi kerak");
      return;
    }
    if (pendingDelete?.type !== "user" || pendingDelete.id !== userId) {
      setPendingDelete({ type: "user", id: userId });
      showError("Foydalanuvchini o'chirish uchun \"O'chirish\"ni yana bir marta bosing");
      return;
    }

    try {
      await $api.delete(`/users/delete/${userId}`);
      setPendingDelete(null);
      showSuccess("Foydalanuvchi o'chirildi");
      await loadUsers(paginationData.currentPage);
    } catch (error) {
      showError(getApiErrorMessage(error) || "Foydalanuvchi o'chmadi");
    }
  };

  const handleToggleCompanyStatus = async (company) => {
    const companyId = company?._id || company?.id || company;
    const currentStatus =
      typeof company === "object" ? normalizeCompanyStatus(company) : "active";
    const nextStatus = currentStatus === "active" ? "inactive" : "active";
    const companyName =
      typeof company === "object"
        ? (company?.name || company?.company_name || "").trim()
        : "";
    const companyStir =
      typeof company === "object"
        ? normalizeStir((company?.stir || company?.inn || "").trim())
        : "";

    const fallbackName = companyName || (companyStir ? `Kompaniya ${companyStir}` : "");
    const fallbackPayload = {
      status: nextStatus,
      ...(fallbackName ? { name: fallbackName } : {}),
      ...(companyStir ? { stir: companyStir } : {}),
    };

    try {
      await $api.patch(`/company/toggle/${companyId}`, { status: nextStatus });
      showSuccess("Kompaniya holati yangilandi");
      await loadCompanies();
    } catch (error) {
      const message = error?.response?.data?.message || "";
      const needsFallbackPayload =
        message.toLowerCase().includes("name") ||
        message.toLowerCase().includes("required") ||
        message.toLowerCase().includes("validation");

      if (needsFallbackPayload) {
        try {
          await $api.patch(`/company/toggle/${companyId}`, fallbackPayload);
          showSuccess("Kompaniya holati yangilandi");
          await loadCompanies();
          return;
        } catch (retryError) {
          showError(getApiErrorMessage(retryError) || "Kompaniya holati o'zgarmadi");
          return;
        }
      }

      showError(message || "Kompaniya holati o'zgarmadi");
    }
  };

  const handleDeleteCompany = async (companyId, status) => {
    if ((status || "").toLowerCase() !== "inactive") {
      showError("Kompaniya faqat nofaol bo'lsa o'chiriladi");
      return;
    }
    if (pendingDelete?.type !== "company" || pendingDelete.id !== companyId) {
      setPendingDelete({ type: "company", id: companyId });
      showError("Kompaniyani o'chirish uchun \"O'chirish\"ni yana bir marta bosing");
      return;
    }

    try {
      await $api.delete(`/company/delete/${companyId}`);
      setPendingDelete(null);
      showSuccess("Kompaniya o'chirildi");
      await loadCompanies();
    } catch (error) {
      showError(getApiErrorMessage(error) || "Kompaniya o'chmadi");
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!canManageUsers) {
      showError("Sizda foydalanuvchi yaratish huquqi yo'q");
      return;
    }

    const errors = {};
    if (newUser.firstName.trim().length < 3) {
      errors.firstName = "Ism kamida 3 ta harf bo'lishi kerak";
    }
    if (newUser.lastName.trim().length < 3) {
      errors.lastName = "Familiya kamida 3 ta harf bo'lishi kerak";
    }
    if (newUser.password.length < 4) {
      errors.password = "Parol kamida 4 ta belgidan iborat bo'lsin";
    }
    if (isSuperAdmin && newUser.role !== "superadmin" && !newUser.companyId) {
      errors.companyId = "Kompaniyani tanlang";
    }
    if (Object.keys(errors).length) {
      setUserFormErrors(errors);
      return;
    }
    setUserFormErrors({});

    const formData = new FormData();
    formData.append("firstName", newUser.firstName.trim());
    formData.append("lastName", newUser.lastName.trim());
    formData.append("phoneNumber", newUser.phoneNumber.trim());
    formData.append("password", newUser.password);
    formData.append("role", newUser.role);
    formData.append("gender", newUser.gender || "other");
    if (createAvatarFile) {
      formData.append("avatar", createAvatarFile);
    }

    if (isSuperAdmin) {
      if (newUser.role !== "superadmin") {
        formData.append("companyId", newUser.companyId);
      }
    } else if (isAdminLike) {
      const myCompanyId = user?.companyId?._id || user?.companyId;
      if (myCompanyId) formData.append("companyId", myCompanyId);
      formData.set("role", "employee");
    }

    try {
      setSaving(true);
      await $api.post("/users/create", formData);
      setShowCreateUserModal(false);
      setNewUser({
        firstName: "",
        lastName: "",
        phoneNumber: "+998",
        password: "",
        role: "employee",
        companyId: "",
        gender: "other",
      });
      setCreateAvatarFile(null);
      setCreateAvatarPreview("");
      showSuccess("Foydalanuvchi muvaffaqiyatli yaratildi");
      await loadUsers(1);
    } catch (error) {
      const message = getApiErrorMessage(error) || "Foydalanuvchi yaratilmadi";
      const lowered = message.toLowerCase();
      const backendErrors = {};
      if (lowered.includes("firstname")) backendErrors.firstName = message;
      if (lowered.includes("lastname")) backendErrors.lastName = message;
      if (lowered.includes("password")) backendErrors.password = message;
      if (lowered.includes("company")) backendErrors.companyId = message;
      if (Object.keys(backendErrors).length) {
        setUserFormErrors((prev) => ({ ...prev, ...backendErrors }));
      }
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();

    const name = newCompany.name.trim();
    const stir = normalizeStir(newCompany.stir);
    const errors = {};

    if (!name) {
      errors.name = "Kompaniya nomini kiriting";
    }
    if (!stir) {
      errors.stir = "STIR kiriting (faqat raqam)";
    }
    if (stir.length < 6) {
      errors.stir = "STIR kamida 6 ta raqam bo'lishi kerak";
    }
    if (Object.keys(errors).length) {
      setCompanyFormErrors(errors);
      return;
    }
    setCompanyFormErrors({});

    try {
      setSaving(true);
      await $api.post("/company/create", {
        name,
        stir,
        status: "active",
      });
      setShowCreateCompanyModal(false);
      setNewCompany({ name: "", stir: "" });
      showSuccess("Kompaniya muvaffaqiyatli yaratildi");
      await loadCompanies();
    } catch (error) {
      const message = getApiErrorMessage(error);
      const lowered = message.toLowerCase();
      const backendErrors = {};
      if (lowered.includes("name")) backendErrors.name = message;
      if (lowered.includes("stir")) backendErrors.stir = message;
      if (Object.keys(backendErrors).length) {
        setCompanyFormErrors((prev) => ({ ...prev, ...backendErrors }));
      }
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const patchWithFallback = async (paths, payload) => {
    let lastError;
    for (const path of paths) {
      try {
        const response = await $api.patch(path, payload);
        return response;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!canManageUsers || !editUser.id) return;

    const errors = {};
    if (editUser.firstName.trim().length < 3) {
      errors.firstName = "Ism kamida 3 ta harf bo'lishi kerak";
    }
    if (editUser.lastName.trim().length < 3) {
      errors.lastName = "Familiya kamida 3 ta harf bo'lishi kerak";
    }
    if (editUser.password && editUser.password.length < 4) {
      errors.password = "Parol kamida 4 ta belgidan iborat bo'lsin";
    }
    if (isSuperAdmin && editUser.role !== "superadmin" && !editUser.companyId) {
      errors.companyId = "Kompaniyani tanlang";
    }
    if (Object.keys(errors).length) {
      setUserFormErrors(errors);
      return;
    }
    setUserFormErrors({});

    const payload = new FormData();
    payload.append("firstName", editUser.firstName.trim());
    payload.append("lastName", editUser.lastName.trim());
    payload.append("phoneNumber", editUser.phoneNumber.trim());
    payload.append("role", isAdminLike ? "employee" : editUser.role);
    payload.append("gender", editUser.gender || "other");
    if (editUser.password) payload.append("password", editUser.password);
    if (editAvatarFile) payload.append("avatar", editAvatarFile);

    if (isSuperAdmin) {
      if (editUser.role !== "superadmin") {
        payload.append("companyId", editUser.companyId);
      }
    } else if (isAdminLike) {
      const myCompanyId = user?.companyId?._id || user?.companyId;
      if (myCompanyId) payload.append("companyId", myCompanyId);
      payload.set("role", "employee");
    }

    try {
      setSaving(true);
      await patchWithFallback(
        [
          `/users/update/${editUser.id}`,
          `/user/update/${editUser.id}`,
          `/users/update/user/${editUser.id}`,
          `/users/update/by/${editUser.id}`,
        ],
        payload
      );
      setShowEditUserModal(false);
      setEditAvatarFile(null);
      setEditAvatarPreview("");
      showSuccess("Foydalanuvchi yangilandi");
      await loadUsers(paginationData.currentPage || 1);
    } catch (error) {
      showError(getApiErrorMessage(error) || "Foydalanuvchi yangilanmadi");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    if (!canManageCompanies || !editCompany.id) return;

    const name = editCompany.name.trim();
    const stir = normalizeStir(editCompany.stir);
    const errors = {};
    if (!name) errors.name = "Kompaniya nomini kiriting";
    if (!stir || stir.length < 6) {
      errors.stir = "STIR kamida 6 ta raqam bo'lishi kerak";
    }
    if (Object.keys(errors).length) {
      setCompanyFormErrors(errors);
      return;
    }
    setCompanyFormErrors({});

    const payload = {
      name,
      stir,
      status: editCompany.status || "active",
    };

    try {
      setSaving(true);
      await patchWithFallback(
        [
          `/company/update/${editCompany.id}`,
          `/company/edit/${editCompany.id}`,
          `/company/update/company/${editCompany.id}`,
        ],
        payload
      );
      setShowEditCompanyModal(false);
      showSuccess("Kompaniya yangilandi");
      await loadCompanies();
    } catch (error) {
      showError(getApiErrorMessage(error) || "Kompaniya yangilanmadi");
    } finally {
      setSaving(false);
    }
  };

  const handleRowClick = (row) => {
    if (activeTab !== "users") return;
    navigate(`/user/${row.id}`);
  };

  const toggleColumn = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  return (
    <div className="relative">
      <div className="bg-white border border-gray-200 rounded-xl mb-4 px-4 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {activeTab === "companies" ? "Kompaniyalar" : "Foydalanuvchilar"}
            </h1>
            <RefreshCcw
              size={14}
              className="text-[#333] cursor-pointer"
              onClick={() => {
                if (activeTab === "users") {
                  loadUsers(paginationData.currentPage || 1);
                } else {
                  loadCompanies();
                }
              }}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center rounded border border-gray-200 p-1">
              {activeTab === "users" && (
                <div className="px-3 py-1 text-sm rounded inline-flex items-center gap-1 bg-[#2db789] text-white">
                  <UsersIcon size={14} />
                  Foydalanuvchilar
                </div>
              )}
              {activeTab === "companies" && isSuperAdmin && (
                <div className="px-3 py-1 text-sm rounded inline-flex items-center gap-1 bg-[#2db789] text-white">
                  <Building2 size={14} />
                  Kompaniyalar
                </div>
              )}
            </div>

            {activeTab === "users" && (
              <div className="relative w-full sm:w-auto sm:min-w-[260px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Foydalanuvchi qidirish"
                  className="w-full pl-10 outline-none pr-4 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  value={searchTerm}
                />
              </div>
            )}

            {activeTab === "companies" && (
              <div className="relative w-full sm:w-auto sm:min-w-[260px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Kompaniya qidirish..."
                  className="w-full pl-10 outline-none pr-4 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  onChange={(e) => setCompanySearchTerm(e.target.value)}
                  value={companySearchTerm}
                />
              </div>
            )}

            {activeTab === "users" && canManageUsers && (
              <button
                onClick={() => {
                  if (isSuperAdmin) {
                    loadCompanies();
                  }
                  setUserFormErrors({});
                  setShowCreatePassword(false);
                  setNewUser((prev) => ({
                    ...prev,
                    role: "employee",
                  }));
                  setShowCreateUserModal(true);
                }}
                className="w-full sm:w-auto px-3 py-1 bg-[#249B73] text-white rounded cursor-pointer"
              >
                + Foydalanuvchi
              </button>
            )}

            {activeTab === "companies" && canManageCompanies && (
              <button
                onClick={() => {
                  setCompanyFormErrors({});
                  setShowCreateCompanyModal(true);
                }}
                className="w-full sm:w-auto px-3 py-1 bg-[#249B73] text-white rounded cursor-pointer"
              >
                + Kompaniya
              </button>
            )}
          </div>
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

      <div className="overflow-x-auto">
        {activeTab === "users" ? (
          <GlobalTable
            columns={userColumns}
            visibleColumns={visibleColumns}
            sampleData={userRows}
            load={dataLoad}
            useServerPagination={true}
            currentPage={paginationData.currentPage}
            totalPages={paginationData.totalPages}
            totalItems={paginationData.totalItems}
            itemsPerPage={rowsPerPage}
            onPageChange={(page) => loadUsers(page)}
            onRowClick={handleRowClick}
          />
        ) : (
          <GlobalTable
            columns={companyColumns}
            visibleColumns={{
              name: true,
              stir: true,
              status: true,
              createdAt: true,
              setting: true,
            }}
            sampleData={companyRows}
            load={dataLoad}
            useServerPagination={false}
            itemsPerPage={20}
          />
        )}
      </div>

      {showColumnSettings && activeTab === "users" && (
        <div
          className="fixed bg-white border border-gray-200 rounded shadow-lg overflow-hidden w-[280px] z-50"
          style={{
            top: `${modalPosition.top}px`,
            right: `${modalPosition.right}px`,
          }}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Ustunlar</h3>
              <button
                onClick={() => setShowColumnSettings(false)}
                className="cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {userColumns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center justify-end space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns[col.key] ?? true}
                    onChange={() => toggleColumn(col.key)}
                    className="rounded text-green-600"
                  />
                  <span className="text-sm text-gray-700">
                    {typeof col.label === "string" ? col.label : "⚙️"}
                  </span>
                </label>
              ))}
            </div>

            <div className="pt-2 text-center">
              <div className="text-sm text-gray-700 font-medium mb-2">
                Qatorlar soni:
              </div>
              <div className="inline-flex border border-gray-300 rounded overflow-hidden">
                {[30, 50, 100].map((num, idx) => (
                  <button
                    key={num}
                    onClick={() => {
                      setRowsPerLimit(num);
                      setRowsPerPage(num);
                      setShowColumnSettings(false);
                    }}
                    className={`px-4 py-1 text-sm border-l first:border-l-0 cursor-pointer border-gray-300
                      ${idx === 0 ? "rounded-l" : ""}
                      ${idx === 2 ? "rounded-r" : ""}
                      ${
                        rowsPerLimit === num
                          ? "bg-[#333] text-white"
                          : "bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <form
            onSubmit={handleCreateUser}
            className="bg-white p-4 sm:p-5 w-full max-w-md rounded shadow mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold mb-4">Yangi foydalanuvchi</h3>
            <div className="space-y-3">
              <input
                className={`w-full border rounded px-3 py-2 ${
                  userFormErrors.firstName ? "border-red-500" : ""
                }`}
                placeholder="Ism"
                value={newUser.firstName}
                onChange={(e) => {
                  setNewUser((prev) => ({ ...prev, firstName: e.target.value }));
                  setUserFormErrors((prev) => ({ ...prev, firstName: "" }));
                }}
              />
              {userFormErrors.firstName && (
                <p className="text-xs text-red-600">{userFormErrors.firstName}</p>
              )}
              <input
                className={`w-full border rounded px-3 py-2 ${
                  userFormErrors.lastName ? "border-red-500" : ""
                }`}
                placeholder="Familiya"
                value={newUser.lastName}
                onChange={(e) => {
                  setNewUser((prev) => ({ ...prev, lastName: e.target.value }));
                  setUserFormErrors((prev) => ({ ...prev, lastName: "" }));
                }}
              />
              {userFormErrors.lastName && (
                <p className="text-xs text-red-600">{userFormErrors.lastName}</p>
              )}
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Telefon"
                value={newUser.phoneNumber}
                onChange={(e) =>
                  setNewUser((prev) => ({ ...prev, phoneNumber: e.target.value }))
                }
              />
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Avatar (ixtiyoriy)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full border rounded px-3 py-2"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setCreateAvatarFile(file);
                    setCreateAvatarPreview(file ? URL.createObjectURL(file) : "");
                  }}
                />
                {createAvatarPreview && (
                  <img
                    src={createAvatarPreview}
                    alt="avatar preview"
                    className="w-16 h-16 rounded-full object-cover border"
                  />
                )}
              </div>
              <select
                className="w-full border rounded px-3 py-2"
                value={newUser.gender}
                onChange={(e) =>
                  setNewUser((prev) => ({ ...prev, gender: e.target.value }))
                }
              >
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
              <div className="relative">
                <input
                  type={showCreatePassword ? "text" : "password"}
                  className={`w-full border rounded px-3 py-2 pr-10 ${
                    userFormErrors.password ? "border-red-500" : ""
                  }`}
                  placeholder="Parol"
                  value={newUser.password}
                  onChange={(e) => {
                    setNewUser((prev) => ({ ...prev, password: e.target.value }));
                    setUserFormErrors((prev) => ({ ...prev, password: "" }));
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  {showCreatePassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {userFormErrors.password && (
                <p className="text-xs text-red-600">{userFormErrors.password}</p>
              )}

              <select
                className="w-full border rounded px-3 py-2"
                value={newUser.role}
                onChange={(e) =>
                  setNewUser((prev) => ({ ...prev, role: e.target.value }))
                }
                disabled={isAdminLike}
              >
                {buildUserRoleOptions(actorRole).map((role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </select>

              {isSuperAdmin && newUser.role !== "superadmin" && (
                <select
                  className={`w-full border rounded px-3 py-2 ${
                    userFormErrors.companyId ? "border-red-500" : ""
                  }`}
                  value={newUser.companyId}
                  onChange={(e) => {
                    setNewUser((prev) => ({ ...prev, companyId: e.target.value }));
                    setUserFormErrors((prev) => ({ ...prev, companyId: "" }));
                  }}
                >
                  <option value="">Kompaniya tanlang</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              {userFormErrors.companyId && (
                <p className="text-xs text-red-600">{userFormErrors.companyId}</p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowCreateUserModal(false);
                  setShowCreatePassword(false);
                  setUserFormErrors({});
                  setCreateAvatarFile(null);
                  setCreateAvatarPreview("");
                }}
                className="w-full sm:w-auto px-3 py-2 border rounded cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-3 py-2 bg-[#249B73] text-white rounded cursor-pointer disabled:opacity-60"
              >
                Saqlash
              </button>
            </div>
          </form>
        </div>
      )}

      {showCreateCompanyModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <form
            onSubmit={handleCreateCompany}
            className="bg-white p-4 sm:p-5 w-full max-w-md rounded shadow mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold mb-4">Yangi kompaniya</h3>
            <div className="space-y-3">
              <input
                className={`w-full border rounded px-3 py-2 ${
                  companyFormErrors.name ? "border-red-500" : ""
                }`}
                placeholder="Kompaniya nomi"
                value={newCompany.name}
                onChange={(e) => {
                  setNewCompany((prev) => ({ ...prev, name: e.target.value }));
                  setCompanyFormErrors((prev) => ({ ...prev, name: "" }));
                }}
              />
              {companyFormErrors.name && (
                <p className="text-xs text-red-600">{companyFormErrors.name}</p>
              )}
                <input
                  className={`w-full border rounded px-3 py-2 ${
                    companyFormErrors.stir ? "border-red-500" : ""
                  }`}
                  placeholder="STIR (kamida 6 ta raqam)"
                  value={newCompany.stir}
                  onChange={(e) => {
                    setNewCompany((prev) => ({
                      ...prev,
                      stir: normalizeStir(e.target.value),
                    }));
                    setCompanyFormErrors((prev) => ({ ...prev, stir: "" }));
                  }}
                  inputMode="numeric"
                />
              {companyFormErrors.stir && (
                <p className="text-xs text-red-600">{companyFormErrors.stir}</p>
              )}
              <p className="text-xs text-gray-500">
                STIR - soliq to'lovchi identifikatsion raqami. Faqat raqam kiriting (kamida 6 ta).
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowCreateCompanyModal(false);
                  setCompanyFormErrors({});
                }}
                className="w-full sm:w-auto px-3 py-2 border rounded cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-3 py-2 bg-[#249B73] text-white rounded cursor-pointer disabled:opacity-60"
              >
                Saqlash
              </button>
            </div>
          </form>
        </div>
      )}

      {showEditUserModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <form
            onSubmit={handleUpdateUser}
            className="bg-white p-4 sm:p-5 w-full max-w-md rounded shadow mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold mb-4">Foydalanuvchini tahrirlash</h3>
            <div className="space-y-3">
              <input
                className={`w-full border rounded px-3 py-2 ${
                  userFormErrors.firstName ? "border-red-500" : ""
                }`}
                placeholder="Ism"
                value={editUser.firstName}
                onChange={(e) => {
                  setEditUser((prev) => ({ ...prev, firstName: e.target.value }));
                  setUserFormErrors((prev) => ({ ...prev, firstName: "" }));
                }}
              />
              {userFormErrors.firstName && (
                <p className="text-xs text-red-600">{userFormErrors.firstName}</p>
              )}
              <input
                className={`w-full border rounded px-3 py-2 ${
                  userFormErrors.lastName ? "border-red-500" : ""
                }`}
                placeholder="Familiya"
                value={editUser.lastName}
                onChange={(e) => {
                  setEditUser((prev) => ({ ...prev, lastName: e.target.value }));
                  setUserFormErrors((prev) => ({ ...prev, lastName: "" }));
                }}
              />
              {userFormErrors.lastName && (
                <p className="text-xs text-red-600">{userFormErrors.lastName}</p>
              )}
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Telefon"
                value={editUser.phoneNumber}
                onChange={(e) =>
                  setEditUser((prev) => ({ ...prev, phoneNumber: e.target.value }))
                }
              />
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Avatar (ixtiyoriy)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full border rounded px-3 py-2"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setEditAvatarFile(file);
                    setEditAvatarPreview(file ? URL.createObjectURL(file) : "");
                  }}
                />
                {editAvatarPreview && (
                  <img
                    src={editAvatarPreview}
                    alt="avatar preview"
                    className="w-16 h-16 rounded-full object-cover border"
                  />
                )}
              </div>
              <select
                className="w-full border rounded px-3 py-2"
                value={editUser.gender}
                onChange={(e) =>
                  setEditUser((prev) => ({ ...prev, gender: e.target.value }))
                }
              >
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
              <div className="relative">
                <input
                  type={showEditPassword ? "text" : "password"}
                  className={`w-full border rounded px-3 py-2 pr-10 ${
                    userFormErrors.password ? "border-red-500" : ""
                  }`}
                  placeholder="Yangi parol (ixtiyoriy)"
                  value={editUser.password}
                  onChange={(e) => {
                    setEditUser((prev) => ({ ...prev, password: e.target.value }));
                    setUserFormErrors((prev) => ({ ...prev, password: "" }));
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  {showEditPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {userFormErrors.password && (
                <p className="text-xs text-red-600">{userFormErrors.password}</p>
              )}

              <select
                className="w-full border rounded px-3 py-2"
                value={editUser.role}
                onChange={(e) =>
                  setEditUser((prev) => ({ ...prev, role: e.target.value }))
                }
                disabled={isAdminLike}
              >
                {buildUserRoleOptions(actorRole).map((role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </select>

              {isSuperAdmin && editUser.role !== "superadmin" && (
                <select
                  className={`w-full border rounded px-3 py-2 ${
                    userFormErrors.companyId ? "border-red-500" : ""
                  }`}
                  value={editUser.companyId}
                  onChange={(e) => {
                    setEditUser((prev) => ({ ...prev, companyId: e.target.value }));
                    setUserFormErrors((prev) => ({ ...prev, companyId: "" }));
                  }}
                >
                  <option value="">Kompaniya tanlang</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              {userFormErrors.companyId && (
                <p className="text-xs text-red-600">{userFormErrors.companyId}</p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditUserModal(false);
                  setShowEditPassword(false);
                  setUserFormErrors({});
                  setEditAvatarFile(null);
                  setEditAvatarPreview("");
                }}
                className="w-full sm:w-auto px-3 py-2 border rounded cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-3 py-2 bg-[#249B73] text-white rounded cursor-pointer disabled:opacity-60"
              >
                Yangilash
              </button>
            </div>
          </form>
        </div>
      )}

      {showEditCompanyModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <form
            onSubmit={handleUpdateCompany}
            className="bg-white p-4 sm:p-5 w-full max-w-md rounded shadow mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold mb-4">Kompaniyani tahrirlash</h3>
            <div className="space-y-3">
              <input
                className={`w-full border rounded px-3 py-2 ${
                  companyFormErrors.name ? "border-red-500" : ""
                }`}
                placeholder="Kompaniya nomi"
                value={editCompany.name}
                onChange={(e) => {
                  setEditCompany((prev) => ({ ...prev, name: e.target.value }));
                  setCompanyFormErrors((prev) => ({ ...prev, name: "" }));
                }}
              />
              {companyFormErrors.name && (
                <p className="text-xs text-red-600">{companyFormErrors.name}</p>
              )}
              <input
                className={`w-full border rounded px-3 py-2 ${
                  companyFormErrors.stir ? "border-red-500" : ""
                }`}
                placeholder="STIR/INN"
                value={editCompany.stir}
                onChange={(e) => {
                  setEditCompany((prev) => ({ ...prev, stir: e.target.value }));
                  setCompanyFormErrors((prev) => ({ ...prev, stir: "" }));
                }}
              />
              {companyFormErrors.stir && (
                <p className="text-xs text-red-600">{companyFormErrors.stir}</p>
              )}
              <select
                className="w-full border rounded px-3 py-2"
                value={editCompany.status}
                onChange={(e) =>
                  setEditCompany((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                <option value="active">Faol</option>
                <option value="inactive">Nofaol</option>
              </select>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditCompanyModal(false);
                  setCompanyFormErrors({});
                }}
                className="w-full sm:w-auto px-3 py-2 border rounded cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-3 py-2 bg-[#249B73] text-white rounded cursor-pointer disabled:opacity-60"
              >
                Yangilash
              </button>
            </div>
          </form>
        </div>
      )}

      {roleEditor.open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-4 sm:p-5 w-full max-w-sm rounded shadow mx-2 sm:mx-0">
            <h3 className="text-lg font-semibold mb-4">Rolni yangilash</h3>
            <select
              className="w-full border rounded px-3 py-2 mb-4"
              value={roleEditor.value}
              onChange={(e) =>
                setRoleEditor((prev) => ({ ...prev, value: e.target.value }))
              }
            >
              {roleEditor.options.map((role) => (
                <option key={role} value={role}>
                  {getRoleLabel(role)}
                </option>
              ))}
            </select>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                type="button"
                className="w-full sm:w-auto px-3 py-2 border rounded cursor-pointer"
                onClick={() =>
                  setRoleEditor({ open: false, userId: "", value: "", options: [] })
                }
              >
                Bekor qilish
              </button>
              <button
                type="button"
                className="w-full sm:w-auto px-3 py-2 bg-[#249B73] text-white rounded cursor-pointer"
                onClick={() => handleUpdateRole(roleEditor.userId, roleEditor.value)}
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
