import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  Eye,
  EyeOff,
  FilterX,
  Pencil,
  RefreshCcw,
  Search,
  Settings,
  Shield,
  Trash2,
  Users as UsersIcon,
  WifiOff,
  X,
} from "lucide-react";
import $api from "../../http/api";
import useNetworkStatus from "../../hooks/useNetworkStatus";
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
const UZ_PHONE_PREFIXES = [
  "99890",
  "99891",
  "99893",
  "99894",
  "99895",
  "99897",
  "99898",
  "99899",
  "99888",
  "99833",
  "99877",
];
const validateUzPhoneNumber = (value) => {
  const raw = String(value || "").trim();
  if (!raw) {
    return { isValid: false, normalized: "", message: "Telefon raqamni kiriting" };
  }
  let digits = raw.replace(/\D/g, "");
  if (!digits.startsWith("998") && digits.length === 9) {
    digits = `998${digits}`;
  }
  if (digits.length !== 12 || !digits.startsWith("998")) {
    return {
      isValid: false,
      normalized: "",
      message: "Telefon raqam +998 XX XXX XX XX formatda bo'lishi kerak",
    };
  }
  const prefix = digits.slice(0, 5);
  if (!UZ_PHONE_PREFIXES.includes(prefix)) {
    return { isValid: false, normalized: "", message: "Noto'g'ri operator kodi" };
  }
  return { isValid: true, normalized: `+${digits}`, message: "" };
};

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
const matchesCompanyFilters = ({
  company,
  query = "",
  inn = "",
  activityType = "",
  status = "",
}) => {
  const name = String(company?.name || company?.company_name || "").toLowerCase();
  const companyInn = normalizeInn(String(company?.inn || ""));
  const companyActivity = String(company?.activity_type || "").toLowerCase();
  const companyStatus = normalizeCompanyStatus(company);

  const q = String(query || "").trim().toLowerCase();
  const innQ = normalizeInn(String(inn || ""));
  const activityQ = String(activityType || "").trim().toLowerCase();
  const statusQ = String(status || "").trim().toLowerCase();

  if (q) {
    const text = `${name} ${companyInn} ${companyActivity}`.trim();
    if (!text.includes(q)) return false;
  }
  if (innQ && !companyInn.includes(innQ)) return false;
  if (activityQ && !companyActivity.includes(activityQ)) return false;
  if (statusQ && companyStatus !== statusQ) return false;
  return true;
};

const getApiErrorMessage = (error) => {
  const raw =
    error?.response?.data?.message ||
    error?.response?.data?.msg ||
    "Xatolik yuz berdi";

  const text = String(raw || "").trim();
  const lowered = text.toLowerCase();
  if (lowered.includes("company can be deleted only when status is inactive")) {
    return "Kompaniya faqat nofaol bo'lganda o'chiriladi";
  }
  if (lowered.includes("company not found")) {
    return "Kompaniya topilmadi";
  }
  if (lowered.includes("bad request: user does not belong to your company")) {
    return "Bu foydalanuvchi sizning kompaniyangizga tegishli emas";
  }
  if (lowered.includes("user can be deleted only when status is inactive")) {
    return "Foydalanuvchi faqat nofaol bo'lganda o'chiriladi";
  }
  if (lowered.includes("admin can only delete employee users")) {
    return "Admin faqat employee foydalanuvchini o'chira oladi";
  }
  if (lowered.includes("only superadmin or admin can delete users")) {
    return "Foydalanuvchini faqat superadmin yoki admin o'chira oladi";
  }
  if (lowered.includes("user not found")) {
    return "Foydalanuvchi topilmadi";
  }
  return text || "Xatolik yuz berdi";
};
const isServerSideError = (error) => {
  const status = Number(error?.response?.status || 0);
  if (status >= 500) return true;
  // response bo'lmasa va internet bor bo'lsa backend/service xatosi deb olamiz
  if (!error?.response && typeof navigator !== "undefined" && navigator.onLine) {
    return true;
  }
  return false;
};

const normalizeInn = (value = "") => value.replace(/\D/g, "");
const getRoleLabel = (role) => getRoleLabelUz(role);
const normalizeCompanyStatus = (company) => {
  const raw = String(company?.status || "").trim().toLowerCase();
  if (
    raw === "inactive" ||
    raw === "nofaol" ||
    raw === "disabled" ||
    raw === "blocked" ||
    raw === "false" ||
    raw === "0"
  ) {
    return "inactive";
  }
  if (
    raw === "active" ||
    raw === "faol" ||
    raw === "enabled" ||
    raw === "true" ||
    raw === "1"
  ) {
    return "active";
  }
  if (typeof company?.isActive === "boolean") {
    return company.isActive ? "active" : "inactive";
  }
  if (typeof company?.active === "boolean") {
    return company.active ? "active" : "inactive";
  }
  return "active";
};

const getStatusLabel = (status) =>
  (status || "").toLowerCase() === "inactive" ? "Nofaol" : "Faol";
const toPrimitiveId = (value) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    return String(
      value?._id || value?.id || value?.companyId || value?.company_id || ""
    );
  }
  return "";
};
const getUserCompanyId = (item) =>
  toPrimitiveId(
    item?.companyId ||
    item?.company ||
    item?.company_id ||
    item?.companyData ||
    ""
  );

const loadCompaniesForFilter = async (apiClient) => {
  const endpoints = ["/company/all", "/companies/all", "/company/get/all"];
  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const response = await apiClient.get(endpoint);
      const payload = response?.data;
      const rows = payload?.data || payload?.companies || [];
      if (Array.isArray(rows)) return rows;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Kompaniyalar endpoint topilmadi");
};

const createEmptyCompanyForm = () => ({
  id: "",
  name: "",
  inn: "",
  company_created_date: "",
  activity_type: "",
  address: "",
  latitude: "",
  longitude: "",
  status: "active",
  certificate_pdf: null,
  certificate_pdf_url: "",
});
const useDebouncedValue = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

const YANDEX_COMPANY_MAP_SCRIPT_ID = "yandex-company-map-script";
const YANDEX_COMPANY_MAP_DEFAULT_CENTER = [41.311081, 69.240562];
const YANDEX_COMPANY_MAP_DEFAULT_ZOOM = 11;
const FALLBACK_YANDEX_MAPS_KEY = "4170d540-bd9d-45de-bb8e-4cb5bc4e9e66";

const parseCoordinate = (value) => {
  const normalized = String(value ?? "")
    .replace(",", ".")
    .trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const loadYandexCompanyMaps = () =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("window mavjud emas"));

    if (window.ymaps) return resolve(window.ymaps);

    const apiKey = String(import.meta.env.VITE_YANDEX_MAPS_KEY || FALLBACK_YANDEX_MAPS_KEY).trim();
    if (!apiKey) return reject(new Error("VITE_YANDEX_MAPS_KEY topilmadi"));

    const existing = document.getElementById(YANDEX_COMPANY_MAP_SCRIPT_ID);

    // ✅ timeout: abadiy kutib qolmasin
    const t = setTimeout(() => {
      if (window.ymaps) resolve(window.ymaps);
      else reject(new Error("Yandex script vaqtida yuklanmadi (timeout)"));
    }, 15000);

    const done = (ok, err) => {
      clearTimeout(t);
      if (ok && window.ymaps) resolve(window.ymaps);
      else reject(err || new Error("Yandex script yuklanmadi"));
    };

    // ✅ Agar script teg bor bo‘lsa ham: statusini tekshiramiz
    if (existing) {
      // agar script allaqachon yuklangan bo‘lsa
      const alreadyLoaded =
        existing.getAttribute("data-loaded") === "1" ||
        existing.readyState === "complete" ||
        existing.readyState === "loaded";

      if (alreadyLoaded) {
        // load event kutmaymiz — to‘g‘ridan to‘g‘ri tekshiramiz
        return done(true, new Error("Script loaded but ymaps not found"));
      }

      existing.addEventListener("load", () => done(true), { once: true });
      existing.addEventListener("error", () => done(false, new Error("Yandex script yuklanmadi")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = YANDEX_COMPANY_MAP_SCRIPT_ID;
    script.async = true;
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;

    script.onload = () => {
      script.setAttribute("data-loaded", "1");
      done(true);
    };
    script.onerror = () => done(false, new Error("Yandex script yuklanmadi"));

    document.head.appendChild(script);
  });

const CompanyLocationPicker = ({
  address,
  latitude,
  longitude,
  onFieldChange,
  disabled = false,
}) => {
  const mapRootRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const placemarkRef = useRef(null);
  const [mapState, setMapState] = useState("idle");
  const [mapMessage, setMapMessage] = useState("");

  const latNumber = parseCoordinate(latitude);
  const lonNumber = parseCoordinate(longitude);
  const hasCoords = latNumber != null && lonNumber != null;

  const upsertMarker = (coords, balloonContent = "") => {
    const map = mapInstanceRef.current;
    if (!map || !window.ymaps || !Array.isArray(coords)) return;

    if (placemarkRef.current) {
      map.geoObjects.remove(placemarkRef.current);
      placemarkRef.current = null;
    }

    const placemark = new window.ymaps.Placemark(
      coords,
      {
        hintContent: "Kompaniya manzili",
        balloonContent: balloonContent || "Tanlangan nuqta",
      },
      { preset: "islands#greenDotIcon" }
    );
    map.geoObjects.add(placemark);
    placemarkRef.current = placemark;
  };

  const handlePickFromMap = async (coords) => {
    if (!Array.isArray(coords) || coords.length < 2) return;
    const [lat, lon] = coords;
    onFieldChange("latitude", Number(lat).toFixed(6));
    onFieldChange("longitude", Number(lon).toFixed(6));

    if (window.ymaps) {
      try {
        const result = await window.ymaps.geocode(coords, { results: 1 });
        const text =
          result?.geoObjects?.get?.(0)?.getAddressLine?.() ||
          result?.geoObjects?.get?.(0)?.properties?.get?.("text") ||
          "";
        if (text && !String(address || "").trim()) {
          onFieldChange("address", text);
        }
      } catch {
        // reverse geocode xato bo'lsa ham koordinata saqlanadi
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initMap = async () => {
      if (!mapRootRef.current) return;
      setMapState("loading");
      setMapMessage("");

      try {
        const ymaps = await loadYandexCompanyMaps();
        if (cancelled || !mapRootRef.current) return;

        ymaps.ready(() => {
          if (cancelled || !mapRootRef.current) return;

          const center = hasCoords
            ? [latNumber, lonNumber]
            : YANDEX_COMPANY_MAP_DEFAULT_CENTER;
          const map = new ymaps.Map(mapRootRef.current, {
            center,
            zoom: hasCoords ? 15 : YANDEX_COMPANY_MAP_DEFAULT_ZOOM,
            controls: ["zoomControl"],
          });
          mapInstanceRef.current = map;

          map.events.add("click", (event) => {
            if (disabled) return;
            const coords = event.get("coords");
            map.setCenter(coords);
            upsertMarker(coords, "Tanlangan nuqta");
            handlePickFromMap(coords);
          });

          if (hasCoords) {
            upsertMarker(
              [latNumber, lonNumber],
              String(address || "").trim() || "Kompaniya manzili"
            );
          }

          setMapState("ready");
        });
      } catch (error) {
        if (cancelled) return;
        setMapState("error");
        setMapMessage(
          error?.message || "Xarita yuklanmadi. Koordinatani qo'lda kiriting."
        );
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
      placemarkRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapState !== "ready" || !mapInstanceRef.current) return;
    if (!hasCoords) return;

    const coords = [latNumber, lonNumber];
    mapInstanceRef.current.setCenter(coords, 15, { duration: 250 });
    upsertMarker(coords, String(address || "").trim() || "Kompaniya manzili");
  }, [mapState, latNumber, lonNumber, hasCoords, address]);

  const handleFindAddressOnMap = async () => {
    const query = String(address || "").trim();
    if (!query) {
      setMapMessage("Avval manzilni kiriting");
      return;
    }
    if (!window.ymaps || !mapInstanceRef.current) {
      setMapMessage("Xarita hali tayyor emas");
      return;
    }

    try {
      setMapMessage("");
      const normalizedQuery = query.toLowerCase();
      const candidates = [
        query,
        `${query}, O'zbekiston`,
        `${query}, Uzbekistan`,
      ];

      if (!/[,'\s]/.test(query)) {
        candidates.push(`${query} viloyati, O'zbekiston`);
      }

      let geo = null;
      for (const candidate of candidates) {
        const result = await window.ymaps.geocode(candidate, { results: 5 });
        const collection = result?.geoObjects;
        const first = collection?.get?.(0);
        if (!first) continue;

        // First try: queryga eng yaqin textni tanlash
        let best = null;
        const count = Number(collection?.getLength?.() || 0);
        for (let i = 0; i < count; i += 1) {
          const item = collection.get(i);
          const text = String(
            item?.getAddressLine?.() || item?.properties?.get?.("text") || ""
          ).toLowerCase();
          if (!text) continue;
          if (text.includes(normalizedQuery) && text.includes("uzbek")) {
            best = item;
            break;
          }
          if (!best && text.includes(normalizedQuery)) {
            best = item;
          }
        }

        geo = best || first;
        if (geo) break;
      }

      const coords = geo?.geometry?.getCoordinates?.();
      if (!coords || coords.length < 2) {
        setMapMessage("Bu manzil bo'yicha nuqta topilmadi");
        return;
      }
      const [lat, lon] = coords;
      onFieldChange("latitude", Number(lat).toFixed(6));
      onFieldChange("longitude", Number(lon).toFixed(6));
      const foundAddress = String(
        geo?.getAddressLine?.() || geo?.properties?.get?.("text") || query
      ).trim();
      if (foundAddress) {
        onFieldChange("address", foundAddress);
      }
      mapInstanceRef.current.setCenter(coords, 16, { duration: 250 });
      upsertMarker(coords, foundAddress || query);
    } catch {
      setMapMessage("Manzilni xaritada topib bo'lmadi");
    }
  };

  return (
    <div className="border rounded-lg p-3 bg-emerald-50/30 border-emerald-200 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-emerald-800">Manzil xaritasi</p>
        <button
          type="button"
          onClick={handleFindAddressOnMap}
          disabled={disabled || mapState !== "ready"}
          className="px-2 py-1 text-xs rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 cursor-pointer"
        >
          Manzilni xaritada topish
        </button>
      </div>

      <div ref={mapRootRef} className="w-full h-52 rounded-md bg-gray-100 overflow-hidden" />

      {mapState !== "ready" && (
        <p className="text-xs text-gray-600">
          {mapState === "loading"
            ? "Xarita yuklanmoqda..."
            : "Xarita ochilmadi, koordinatani qo'lda kiriting."}
        </p>
      )}
      {mapMessage && <p className="text-xs text-amber-700">{mapMessage}</p>}
      <p className="text-xs text-gray-500">
        Xarita ustiga bosib koordinata tanlang yoki manzil yozib qidiring.
      </p>
    </div>
  );
};

export const Users = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.user);

  const [activeTab, setActiveTab] = useState("users");
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [companySearchTerm, setCompanySearchTerm] = useState("");
  const [companyInnFilter, setCompanyInnFilter] = useState("");
  const [companyActivityTypeFilter, setCompanyActivityTypeFilter] = useState("");
  const [companyStatusFilter, setCompanyStatusFilter] = useState("");
  const [companyFilterLabel, setCompanyFilterLabel] = useState("");
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
  const [companyFilterOptions, setCompanyFilterOptions] = useState([]);

  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "+998",
    password: "",
    role: "employee",
    companyId: "",
    gender: "other",
  });

  const [newCompany, setNewCompany] = useState(createEmptyCompanyForm());
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
  const [editCompany, setEditCompany] = useState(createEmptyCompanyForm());
  const [uiMessage, setUiMessage] = useState(null);
  // Use centralized network detection (verifies with a light same-origin ping)
  const { isOnline: pingOnline } = useNetworkStatus();
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const effectiveOffline =
    typeof navigator !== "undefined"
      ? (!navigator.onLine && !pingOnline)
      : false;
  const [backendErrorOverlay, setBackendErrorOverlay] = useState(false);
  const [userFormErrors, setUserFormErrors] = useState({});
  const [companyFormErrors, setCompanyFormErrors] = useState({});
  const [userDeleteConfirm, setUserDeleteConfirm] = useState({
    open: false,
    id: "",
    name: "",
  });
  const [userDeleteLoading, setUserDeleteLoading] = useState(false);
  const [companyDeleteConfirm, setCompanyDeleteConfirm] = useState({
    open: false,
    id: "",
    name: "",
  });
  const [companyDeleteLoading, setCompanyDeleteLoading] = useState(false);
  const [roleEditor, setRoleEditor] = useState({
    open: false,
    userId: "",
    value: "",
    options: [],
    companyId: "",
  });
  const actorRole = resolveActorRole(user);
  const isSuperAdmin = isSuperAdminRole(actorRole);
  const isAdminLike = isAdminLikeRole(actorRole);
  const canManageUsers = isAdminLike || isSuperAdmin;
  const canManageCompanies = isSuperAdmin;
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 400);
  const debouncedCompanySearchTerm = useDebouncedValue(companySearchTerm, 400);
  const debouncedCompanyInnFilter = useDebouncedValue(companyInnFilter, 400);
  const debouncedCompanyActivityTypeFilter = useDebouncedValue(
    companyActivityTypeFilter,
    400
  );

  const showError = (text) => setUiMessage({ type: "error", text });
  const showSuccess = (text) => {
    setUiMessage({ type: "success", text });
    setBackendErrorOverlay(false);
  };
  const markBackendErrorIfNeeded = (error) => {
    if (isServerSideError(error)) {
      setBackendErrorOverlay(true);
    }
  };

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
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // If browser is online but ping fails, show backend error overlay
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      if (!pingOnline) setBackendErrorOverlay(true);
      else setBackendErrorOverlay(false);
    }
  }, [pingOnline]);

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
    { key: "inn", label: "INN" },
    { key: "activity_type", label: "Faoliyat turi" },
    { key: "address", label: "Manzil" },
    { key: "latitude", label: "Latitude" },
    { key: "longitude", label: "Longitude" },
    { key: "status", label: "Holat" },
    { key: "company_created_date", label: "Tashkil topgan sana" },
    { key: "certificate_pdf", label: "Sertifikat (PDF)" },
    { key: "createdAt", label: "Yaratilgan sana" },
    { key: "setting", label: "Amallar" },
  ];

  const loadUsers = async (page = 1) => {
    setDataLoad(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(rowsPerPage),
        query: debouncedSearchTerm,
      });
      if (isAdminLike) {
        params.set("role", "employee");
        const myCompanyId = user?.companyId?._id || user?.companyId;
        if (myCompanyId) params.set("companyId", String(myCompanyId));
      } else {
        if (roleFilter) params.set("role", roleFilter);
        if (companyFilter) params.set("companyId", companyFilter);
      }
      const { data } = await $api.get(`/users/get/all?${params.toString()}`);

      const list = data?.data || data?.users || [];
      const scopedList = isAdminLike
        ? list.filter((item) => normalizeRole(item?.role) === "employee")
        : list;
      const roleFilteredList =
        !isAdminLike && roleFilter
          ? scopedList.filter((item) => normalizeRole(item?.role) === normalizeRole(roleFilter))
          : scopedList;
      const selectedCompanyName = String(
        companyFilterOptions.find(
          (c) =>
            toPrimitiveId(c) === String(companyFilter || "")
        )?.name ||
        companyFilterLabel ||
        ""
      )
        .trim()
        .toLowerCase();
      const selectedCompanyId = String(companyFilter || "").trim();
      const companyFilteredList =
        !isAdminLike && companyFilter
          ? roleFilteredList.filter(
            (item) => {
              const userCompanyId = getUserCompanyId(item);
              const userCompanyName = String(
                item?.companyName ||
                item?.companyId?.name ||
                item?.company?.name ||
                item?.company_title ||
                item?.companyId?.title ||
                ""
              )
                .trim()
                .toLowerCase();

              // Company filter tanlanganda kompaniyasi yo'q satrlar chiqmasin
              if (!userCompanyId && (!userCompanyName || userCompanyName === "-")) {
                return false;
              }

              if (selectedCompanyId && userCompanyId === selectedCompanyId) return true;
              if (selectedCompanyName && userCompanyName === selectedCompanyName) return true;
              return false;
            }
          )
          : roleFilteredList;

      const formatted = companyFilteredList.map((item, idx) => ({
        index: (page - 1) * rowsPerPage + idx + 1,
        id: item._id,
        roleRaw: normalizeRole(item.role) || "employee",
        companyIdRaw: item.companyId?._id || item.companyId || "",
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
          "Kompaniya biriktirilmagan",
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
                <Pencil size={12} />
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
                    value: allowed.includes(normalizeRole(item.role))
                      ? normalizeRole(item.role)
                      : allowed[0],
                    companyId: item.companyId?._id || item.companyId || "",
                  });
                }}
              >
                <Shield size={12} />
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
                <RefreshCcw size={12} />
              </button>
            )}
            {canManageUsers && (item.status || "active").toLowerCase() === "inactive" && (
              <button
                className="px-2 py-1 text-[10px] rounded bg-red-100 text-red-700 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setUserDeleteConfirm({
                    open: true,
                    id: item._id || "",
                    name:
                      `${item.firstName || ""} ${item.lastName || ""}`.trim() ||
                      item.phoneNumber ||
                      "Foydalanuvchi",
                  });
                }}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ),
      }));

      setUserRows(formatted);
      setPaginationData({
        currentPage: 1,
        totalItems: companyFilteredList.length,
        totalPages: 1,
      });
    } catch (error) {
      markBackendErrorIfNeeded(error);
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
      const { data } = await $api.get("/company/all", {
        params: {
          page: 1,
          limit: 200,
          query: debouncedCompanySearchTerm || undefined,
          inn: debouncedCompanyInnFilter || undefined,
          activity_type: debouncedCompanyActivityTypeFilter || undefined,
          status: companyStatusFilter || undefined,
        },
      });

      const allCompanies = data?.data || data?.companies || data?.items || [];
      const filteredCompanies = allCompanies.filter((company) =>
        matchesCompanyFilters({
          company,
          query: debouncedCompanySearchTerm,
          inn: debouncedCompanyInnFilter,
          activityType: debouncedCompanyActivityTypeFilter,
          status: companyStatusFilter,
        })
      );
      setCompanies(allCompanies);

      setCompanyRows(
        filteredCompanies.map((item) => {
          const normalizedInn = normalizeInn(String(item?.inn || ""));
          const statusRaw = normalizeCompanyStatus(item);
          const certificatePdf =
            item?.certificate_pdf || item?.certificatePdf || "";
          const certificatePdfUrl = certificatePdf
            ? toAssetUrl(certificatePdf)
            : "";
          const companyCreatedDate =
            item?.company_created_date || item?.companyCreatedDate || "";
          const companyAddress = item?.address || "";
          const companyLatitude = item?.latitude || item?.lat || "";
          const companyLongitude = item?.longitude || item?.lon || "";
          return {
            id: item._id || item?.id,
            name: item.name || item.company_name || "-",
            inn: normalizedInn || "-",
            activity_type: item?.activity_type || "-",
            address: companyAddress || "-",
            latitude: companyLatitude || "-",
            longitude: companyLongitude || "-",
            statusRaw,
            status: getStatusLabel(statusRaw),
            company_created_date: companyCreatedDate
              ? formatDate(companyCreatedDate)
              : "-",
            certificate_pdf: certificatePdfUrl ? (
              <a
                href={certificatePdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Ko'rish
              </a>
            ) : (
              "-"
            ),
            createdAt: formatDate(item.createdAt),
            setting: (
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 text-[10px] rounded bg-emerald-100 text-emerald-700 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCompanyFormErrors({});
                    setEditCompany({
                      id: item._id || item?.id,
                      name: item.name || item.company_name || "",
                      inn: normalizedInn,
                      company_created_date: companyCreatedDate
                        ? String(companyCreatedDate).slice(0, 10)
                        : "",
                      activity_type: item?.activity_type || "",
                      address: String(companyAddress || ""),
                      latitude: String(companyLatitude || ""),
                      longitude: String(companyLongitude || ""),
                      status: statusRaw,
                      certificate_pdf: null,
                      certificate_pdf_url: certificatePdf,
                    });
                    setShowEditCompanyModal(true);
                  }}
                >
                  <Pencil size={12} />
                </button>
                <button
                  className="px-2 py-1 text-[10px] rounded bg-amber-100 text-amber-700 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleCompanyStatus(item);
                  }}
                >
                  <RefreshCcw size={12} />
                </button>
                {statusRaw === "inactive" && (
                  <button
                    className="px-2 py-1 text-[10px] rounded cursor-pointer bg-red-100 text-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCompanyDeleteConfirm({
                        open: true,
                        id: item._id || item?.id || "",
                        name: item.name || item.company_name || "Kompaniya",
                      });
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ),
          };
        })
      );
    } catch (error) {
      markBackendErrorIfNeeded(error);
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
  }, [
    activeTab,
    rowsPerPage,
    debouncedSearchTerm,
    debouncedCompanySearchTerm,
    roleFilter,
    companyFilter,
    debouncedCompanyInnFilter,
    debouncedCompanyActivityTypeFilter,
    companyStatusFilter,
  ]);

  useEffect(() => {
    if (!isSuperAdmin || activeTab !== "users") return;
    let mounted = true;
    (async () => {
      try {
        const rows = await loadCompaniesForFilter($api);
        if (!mounted) return;
        setCompanyFilterOptions(rows);
      } catch {
        if (!mounted) return;
        setCompanyFilterOptions([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isSuperAdmin, activeTab]);

  const handleUpdateRole = async (userId, role) => {
    try {
      const nextRole = normalizeRole(role);
      const payload = { role: nextRole };

      if (isSuperAdmin && nextRole !== "superadmin") {
        const selectedCompanyId = toPrimitiveId(roleEditor.companyId);
        if (!selectedCompanyId) {
          showError("Bu rol uchun kompaniya biriktirilgan bo‘lishi shart");
          return;
        }
        payload.companyId = selectedCompanyId;
      }

      await $api.patch(`/users/update/role/${userId}`, payload);
      setRoleEditor({
        open: false,
        userId: "",
        value: "",
        options: [],
        companyId: "",
      });
      showSuccess("Rol yangilandi");
      await loadUsers(paginationData.currentPage);
    } catch (error) {
      markBackendErrorIfNeeded(error);
      showError(getApiErrorMessage(error) || "Rol yangilanmadi");
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      await $api.patch(`/users/toggle/status/${userId}`);
      showSuccess("Foydalanuvchi holati yangilandi");
      await loadUsers(paginationData.currentPage);
    } catch (error) {
      markBackendErrorIfNeeded(error);
      showError(getApiErrorMessage(error) || "Holat o'zgarmadi");
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      setUserDeleteLoading(true);
      await $api.delete(`/users/delete/${userId}`);
      setUserDeleteConfirm({ open: false, id: "", name: "" });
      showSuccess("Foydalanuvchi o'chirildi");
      await loadUsers(paginationData.currentPage);
    } catch (error) {
      markBackendErrorIfNeeded(error);
      showError(getApiErrorMessage(error) || "Foydalanuvchi o'chmadi");
    } finally {
      setUserDeleteLoading(false);
    }
  };

  const handleToggleCompanyStatus = async (company) => {
    const companyId = company?._id || company?.id || company;
    if (!companyId) return;
    try {
      await $api.patch(`/company/toggle/${companyId}`);
      showSuccess("Kompaniya holati yangilandi");
      await loadCompanies();
    } catch (error) {
      markBackendErrorIfNeeded(error);
      showError(getApiErrorMessage(error) || "Kompaniya holati o'zgarmadi");
    }
  };

  const handleDeleteCompany = async (companyId) => {
    try {
      setCompanyDeleteLoading(true);
      await $api.delete(`/company/delete/${companyId}`);
      showSuccess("Kompaniya o'chirildi");
      setCompanyDeleteConfirm({ open: false, id: "", name: "" });
      await loadCompanies();
    } catch (error) {
      markBackendErrorIfNeeded(error);
      showError(getApiErrorMessage(error) || "Kompaniya o'chmadi");
    } finally {
      setCompanyDeleteLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!canManageUsers) {
      showError("Sizda foydalanuvchi yaratish huquqi yo'q");
      return;
    }

    const errors = {};
    const passwordValue = String(newUser.password || "").trim();
    if (newUser.firstName.trim().length < 3) {
      errors.firstName = "Ism kamida 3 ta harf bo'lishi kerak";
    }
    if (newUser.lastName.trim().length < 3) {
      errors.lastName = "Familiya kamida 3 ta harf bo'lishi kerak";
    }
    const createPhoneCheck = validateUzPhoneNumber(newUser.phoneNumber);
    if (!createPhoneCheck.isValid) {
      errors.phoneNumber = createPhoneCheck.message;
    }
    if (passwordValue.length < 6 || passwordValue.length > 15) {
      errors.password = "Parol 6-15 ta belgidan iborat bo'lsin";
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
    formData.append("phoneNumber", createPhoneCheck.normalized);
    formData.append("password", passwordValue);
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
      markBackendErrorIfNeeded(error);
      const message = getApiErrorMessage(error) || "Foydalanuvchi yaratilmadi";
      const lowered = message.toLowerCase();
      const backendErrors = {};
      if (lowered.includes("firstname")) backendErrors.firstName = message;
      if (lowered.includes("lastname")) backendErrors.lastName = message;
      if (lowered.includes("password")) backendErrors.password = message;
      if (lowered.includes("phone")) backendErrors.phoneNumber = message;
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
    const inn = normalizeInn(newCompany.inn);
    const errors = {};

    if (!name) {
      errors.name = "Kompaniya nomini kiriting";
    }
    if (!inn) {
      errors.inn = "INN kiriting (faqat raqam)";
    } else if (inn.length < 6 || inn.length > 30) {
      errors.inn = "INN 6-30 raqam oralig'ida bo'lishi kerak";
    }
    const certificateFile = newCompany.certificate_pdf;
    if (
      certificateFile &&
      certificateFile.type !== "application/pdf" &&
      !String(certificateFile.name || "").toLowerCase().endsWith(".pdf")
    ) {
      errors.certificate_pdf = "Faqat PDF fayl yuklash mumkin";
    }
    if (Object.keys(errors).length) {
      setCompanyFormErrors(errors);
      return;
    }
    setCompanyFormErrors({});

    try {
      setSaving(true);
      const payload = new FormData();
      payload.append("name", name);
      payload.append("inn", inn);
      if (newCompany.company_created_date) {
        payload.append("company_created_date", newCompany.company_created_date);
      }
      if (newCompany.activity_type.trim()) {
        payload.append("activity_type", newCompany.activity_type.trim());
      }
      if (String(newCompany.address || "").trim()) {
        payload.append("address", String(newCompany.address).trim());
      }
      if (String(newCompany.latitude || "").trim()) {
        payload.append("latitude", String(newCompany.latitude).trim());
      }
      if (String(newCompany.longitude || "").trim()) {
        payload.append("longitude", String(newCompany.longitude).trim());
      }
      if (newCompany.status) {
        payload.append("status", newCompany.status);
      }
      if (certificateFile) {
        payload.append("certificate_pdf", certificateFile);
      }

      await $api.post("/company/create", payload);
      setShowCreateCompanyModal(false);
      setNewCompany(createEmptyCompanyForm());
      showSuccess("Kompaniya muvaffaqiyatli yaratildi");
      await loadCompanies();
    } catch (error) {
      markBackendErrorIfNeeded(error);
      const message = getApiErrorMessage(error);
      const lowered = message.toLowerCase();
      const backendErrors = {};
      if (lowered.includes("name")) backendErrors.name = message;
      if (lowered.includes("inn")) backendErrors.inn = message;
      if (lowered.includes("certificate")) backendErrors.certificate_pdf = message;
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
    const passwordValue = String(editUser.password || "").trim();
    if (editUser.firstName.trim().length < 3) {
      errors.firstName = "Ism kamida 3 ta harf bo'lishi kerak";
    }
    if (editUser.lastName.trim().length < 3) {
      errors.lastName = "Familiya kamida 3 ta harf bo'lishi kerak";
    }
    const updatePhoneCheck = validateUzPhoneNumber(editUser.phoneNumber);
    if (!updatePhoneCheck.isValid) {
      errors.phoneNumber = updatePhoneCheck.message;
    }
    if (passwordValue && (passwordValue.length < 6 || passwordValue.length > 15)) {
      errors.password = "Parol 6-15 ta belgidan iborat bo'lsin";
    }
    if (isSuperAdmin && editUser.role !== "superadmin" && !editUser.companyId) {
      errors.companyId = "Kompaniyani tanlang";
    }
    if (Object.keys(errors).length) {
      setUserFormErrors(errors);
      return;
    }
    setUserFormErrors({});

    const asRole = isAdminLike ? "employee" : editUser.role;
    const basePayload = {
      firstName: editUser.firstName.trim(),
      lastName: editUser.lastName.trim(),
      phoneNumber: updatePhoneCheck.normalized,
      role: asRole,
      gender: editUser.gender || "other",
      ...(passwordValue ? { password: passwordValue } : {}),
    };

    if (isSuperAdmin) {
      if (editUser.role !== "superadmin") {
        basePayload.companyId = editUser.companyId;
      }
    } else if (isAdminLike) {
      const myCompanyId = user?.companyId?._id || user?.companyId;
      if (myCompanyId) basePayload.companyId = myCompanyId;
      basePayload.role = "employee";
    }

    let payload = basePayload;
    if (editAvatarFile) {
      payload = new FormData();
      Object.entries(basePayload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          payload.append(key, String(value));
        }
      });
      payload.append("avatar", editAvatarFile);
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
      markBackendErrorIfNeeded(error);
      showError(getApiErrorMessage(error) || "Foydalanuvchi yangilanmadi");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    if (!canManageCompanies || !editCompany.id) return;

    const name = editCompany.name.trim();
    const inn = normalizeInn(editCompany.inn);
    const errors = {};
    if (!name) errors.name = "Kompaniya nomini kiriting";
    if (!inn) errors.inn = "INN kiriting (faqat raqam)";
    else if (inn.length < 6 || inn.length > 30) {
      errors.inn = "INN 6-30 raqam oralig'ida bo'lishi kerak";
    }
    if (
      editCompany.certificate_pdf &&
      editCompany.certificate_pdf.type !== "application/pdf" &&
      !String(editCompany.certificate_pdf.name || "").toLowerCase().endsWith(".pdf")
    ) {
      errors.certificate_pdf = "Faqat PDF fayl yuklash mumkin";
    }
    if (Object.keys(errors).length) {
      setCompanyFormErrors(errors);
      return;
    }
    setCompanyFormErrors({});

    const payload = new FormData();
    payload.append("name", name);
    payload.append("inn", inn);
    payload.append("company_created_date", editCompany.company_created_date || "");
    payload.append("activity_type", editCompany.activity_type || "");
    payload.append("address", String(editCompany.address || "").trim());
    payload.append("latitude", String(editCompany.latitude || "").trim());
    payload.append("longitude", String(editCompany.longitude || "").trim());
    payload.append("status", editCompany.status || "active");
    if (editCompany.certificate_pdf) {
      payload.append("certificate_pdf", editCompany.certificate_pdf);
    }

    try {
      setSaving(true);
      await $api.patch(`/company/update/${editCompany.id}`, payload);
      setShowEditCompanyModal(false);
      setEditCompany(createEmptyCompanyForm());
      showSuccess("Kompaniya yangilandi");
      await loadCompanies();
    } catch (error) {
      markBackendErrorIfNeeded(error);
      const message = getApiErrorMessage(error) || "Kompaniya yangilanmadi";
      const lowered = message.toLowerCase();
      const backendErrors = {};
      if (lowered.includes("name")) backendErrors.name = message;
      if (lowered.includes("inn")) backendErrors.inn = message;
      if (lowered.includes("certificate")) backendErrors.certificate_pdf = message;
      if (Object.keys(backendErrors).length) {
        setCompanyFormErrors((prev) => ({ ...prev, ...backendErrors }));
      }
      showError(message);
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
      {(effectiveOffline || backendErrorOverlay) && (
        <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-6">
          <div className="max-w-xl w-full text-center rounded-2xl border border-slate-200 bg-white shadow-sm p-8">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              {effectiveOffline ? <WifiOff size={28} /> : <AlertTriangle size={28} />}
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              {effectiveOffline ? "Internet bilan muammo" : "Server bilan muammo"}
            </h2>
            <p className="text-slate-600">
              {effectiveOffline
                ? "Iltimos, internet aloqasini tekshirib qayta urinib ko'ring."
                : "Afsuski, dasturda muammo chiqdi. Birozdan keyin qayta urinib ko'ring."}
            </p>
            {effectiveOffline && (
              <div className="mt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-[#249B73] text-white rounded"
                >
                  Qayta yuklash
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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

            {activeTab === "users" && (
              <div className="w-full sm:w-auto sm:min-w-[180px]">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  disabled={isAdminLike}
                >
                  <option value="">Barcha rollar</option>
                  {buildUserRoleOptions(actorRole).map((role) => (
                    <option key={role} value={role}>
                      {getRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === "users" && isSuperAdmin && (
              <div className="w-full sm:w-auto sm:min-w-[220px]">
                <select
                  value={companyFilter}
                  onChange={(e) => {
                    const id = e.target.value;
                    setCompanyFilter(id);
                    const label = e.target.options[e.target.selectedIndex]?.text || "";
                    setCompanyFilterLabel(id ? label : "");
                  }}
                  className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                >
                  <option value="">Barcha kompaniyalar</option>
                  {companyFilterOptions.map((company) => {
                    const id = toPrimitiveId(company);
                    if (!id) return null;
                    return (
                      <option key={id} value={id}>
                        {company?.name || company?.company_name || id}
                      </option>
                    );
                  })}
                </select>
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
            {activeTab === "companies" && (
              <div className="w-full sm:w-auto sm:min-w-[170px]">
                <input
                  type="text"
                  placeholder="INN filter"
                  className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  value={companyInnFilter}
                  onChange={(e) => setCompanyInnFilter(normalizeInn(e.target.value))}
                />
              </div>
            )}
            {activeTab === "companies" && (
              <div className="w-full sm:w-auto sm:min-w-[190px]">
                <input
                  type="text"
                  placeholder="Faoliyat turi filter"
                  className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  value={companyActivityTypeFilter}
                  onChange={(e) => setCompanyActivityTypeFilter(e.target.value)}
                />
              </div>
            )}
            {activeTab === "companies" && (
              <div className="w-full sm:w-auto sm:min-w-[150px]">
                <select
                  value={companyStatusFilter}
                  onChange={(e) => setCompanyStatusFilter(e.target.value)}
                  className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                >
                  <option value="">Barcha holat</option>
                  <option value="active">Faol</option>
                  <option value="inactive">Nofaol</option>
                </select>
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
                  setNewCompany(createEmptyCompanyForm());
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
          className={`mb-4 rounded-xl border px-3 py-2 text-sm ${uiMessage.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
            }`}
        >
          {uiMessage.text}
        </div>
      )}

      {activeTab === "companies" &&
        (companySearchTerm || companyInnFilter || companyActivityTypeFilter || companyStatusFilter) && (
          <div className="mb-3 flex flex-wrap gap-2">
            {companySearchTerm && (
              <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">
                Qidiruv: {companySearchTerm}
              </span>
            )}
            {companyInnFilter && (
              <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">
                INN: {companyInnFilter}
              </span>
            )}
            {companyActivityTypeFilter && (
              <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">
                Faoliyat turi: {companyActivityTypeFilter}
              </span>
            )}
            {companyStatusFilter && (
              <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">
                Holat: {companyStatusFilter === "inactive" ? "Nofaol" : "Faol"}
              </span>
            )}
          </div>
        )}

      <div className="overflow-x-auto">
        {activeTab === "users" ? (
          !dataLoad && userRows.length === 0 ? (
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50/40 to-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <FilterX size={24} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Foydalanuvchi topilmadi</h3>
              <p className="mt-2 text-slate-500">
                Tanlangan company yoki rol bo‘yicha mos ma'lumot yo‘q.
              </p>
            </div>
          ) : (
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
          )
        ) : (
          !dataLoad && companyRows.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <FilterX size={24} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Ma'lumot topilmadi</h3>
              <p className="mt-2 text-slate-500">
                Filter qiymatlarini o'zgartirib qayta urinib ko'ring.
              </p>
            </div>
          ) : (
            <GlobalTable
              columns={companyColumns}
              visibleColumns={{
                name: true,
                inn: true,
                activity_type: true,
                address: true,
                latitude: true,
                longitude: true,
                status: true,
                company_created_date: true,
                certificate_pdf: true,
                createdAt: true,
                setting: true,
              }}
              sampleData={companyRows}
              load={dataLoad}
              useServerPagination={false}
              itemsPerPage={20}
            />
          )
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
                      ${rowsPerLimit === num
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
                className={`w-full border rounded px-3 py-2 ${userFormErrors.firstName ? "border-red-500" : ""
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
                className={`w-full border rounded px-3 py-2 ${userFormErrors.lastName ? "border-red-500" : ""
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
                className={`w-full border rounded px-3 py-2 ${userFormErrors.phoneNumber ? "border-red-500" : ""
                  }`}
                placeholder="Telefon"
                value={newUser.phoneNumber}
                onChange={(e) => {
                  setNewUser((prev) => ({ ...prev, phoneNumber: e.target.value }));
                  setUserFormErrors((prev) => ({ ...prev, phoneNumber: "" }));
                }}
                inputMode="tel"
              />
              {userFormErrors.phoneNumber && (
                <p className="text-xs text-red-600">{userFormErrors.phoneNumber}</p>
              )}
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
                  maxLength={15}
                  minLength={6}
                  autoComplete="new-password"
                  className={`w-full border rounded px-3 py-2 pr-10 ${userFormErrors.password ? "border-red-500" : ""
                    }`}
                  placeholder="Parol (majburiy)"
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
                  className={`w-full border rounded px-3 py-2 ${userFormErrors.companyId ? "border-red-500" : ""
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
                className={`w-full border rounded px-3 py-2 ${companyFormErrors.name ? "border-red-500" : ""
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
                className={`w-full border rounded px-3 py-2 ${companyFormErrors.inn ? "border-red-500" : ""
                  }`}
                placeholder="INN (faqat raqam)"
                value={newCompany.inn}
                onChange={(e) => {
                  setNewCompany((prev) => ({
                    ...prev,
                    inn: normalizeInn(e.target.value),
                  }));
                  setCompanyFormErrors((prev) => ({ ...prev, inn: "" }));
                }}
                inputMode="numeric"
              />
              {companyFormErrors.inn && (
                <p className="text-xs text-red-600">{companyFormErrors.inn}</p>
              )}
              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={newCompany.company_created_date}
                onChange={(e) =>
                  setNewCompany((prev) => ({
                    ...prev,
                    company_created_date: e.target.value,
                  }))
                }
              />
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Faoliyat turi (ixtiyoriy)"
                value={newCompany.activity_type}
                onChange={(e) =>
                  setNewCompany((prev) => ({ ...prev, activity_type: e.target.value }))
                }
              />
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Manzil (ixtiyoriy)"
                value={newCompany.address}
                onChange={(e) =>
                  setNewCompany((prev) => ({ ...prev, address: e.target.value }))
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  className="w-full border rounded px-3 py-2"
                  placeholder="Latitude"
                  value={newCompany.latitude}
                  onChange={(e) =>
                    setNewCompany((prev) => ({ ...prev, latitude: e.target.value }))
                  }
                />
                <input
                  className="w-full border rounded px-3 py-2"
                  placeholder="Longitude"
                  value={newCompany.longitude}
                  onChange={(e) =>
                    setNewCompany((prev) => ({ ...prev, longitude: e.target.value }))
                  }
                />
              </div>
              <CompanyLocationPicker
                address={newCompany.address}
                latitude={newCompany.latitude}
                longitude={newCompany.longitude}
                onFieldChange={(field, value) =>
                  setNewCompany((prev) => ({ ...prev, [field]: value }))
                }
              />
              <select
                className="w-full border rounded px-3 py-2"
                value={newCompany.status}
                onChange={(e) =>
                  setNewCompany((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                <option value="active">Faol</option>
                <option value="inactive">Nofaol</option>
              </select>
              <div>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className={`w-full border rounded px-3 py-2 ${companyFormErrors.certificate_pdf ? "border-red-500" : ""
                    }`}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setNewCompany((prev) => ({ ...prev, certificate_pdf: file }));
                    setCompanyFormErrors((prev) => ({ ...prev, certificate_pdf: "" }));
                  }}
                />
                {newCompany.certificate_pdf && (
                  <p className="text-xs text-gray-600 mt-1">
                    {newCompany.certificate_pdf.name}
                  </p>
                )}
                {companyFormErrors.certificate_pdf && (
                  <p className="text-xs text-red-600 mt-1">
                    {companyFormErrors.certificate_pdf}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500">
                INN majburiy. Sertifikat ixtiyoriy (faqat PDF).
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowCreateCompanyModal(false);
                  setCompanyFormErrors({});
                  setNewCompany(createEmptyCompanyForm());
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
                className={`w-full border rounded px-3 py-2 ${userFormErrors.firstName ? "border-red-500" : ""
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
                className={`w-full border rounded px-3 py-2 ${userFormErrors.lastName ? "border-red-500" : ""
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
                className={`w-full border rounded px-3 py-2 ${userFormErrors.phoneNumber ? "border-red-500" : ""
                  }`}
                placeholder="Telefon"
                value={editUser.phoneNumber}
                onChange={(e) => {
                  setEditUser((prev) => ({ ...prev, phoneNumber: e.target.value }));
                  setUserFormErrors((prev) => ({ ...prev, phoneNumber: "" }));
                }}
                inputMode="tel"
              />
              {userFormErrors.phoneNumber && (
                <p className="text-xs text-red-600">{userFormErrors.phoneNumber}</p>
              )}
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
                  maxLength={15}
                  minLength={6}
                  autoComplete="new-password"
                  className={`w-full border rounded px-3 py-2 pr-10 ${userFormErrors.password ? "border-red-500" : ""
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
                  className={`w-full border rounded px-3 py-2 ${userFormErrors.companyId ? "border-red-500" : ""
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
                className={`w-full border rounded px-3 py-2 ${companyFormErrors.name ? "border-red-500" : ""
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
                className={`w-full border rounded px-3 py-2 ${companyFormErrors.inn ? "border-red-500" : ""
                  }`}
                placeholder="INN (faqat raqam)"
                value={editCompany.inn}
                onChange={(e) => {
                  setEditCompany((prev) => ({
                    ...prev,
                    inn: normalizeInn(e.target.value),
                  }));
                  setCompanyFormErrors((prev) => ({ ...prev, inn: "" }));
                }}
              />
              {companyFormErrors.inn && (
                <p className="text-xs text-red-600">{companyFormErrors.inn}</p>
              )}
              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={editCompany.company_created_date}
                onChange={(e) =>
                  setEditCompany((prev) => ({
                    ...prev,
                    company_created_date: e.target.value,
                  }))
                }
              />
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Faoliyat turi (ixtiyoriy)"
                value={editCompany.activity_type}
                onChange={(e) =>
                  setEditCompany((prev) => ({ ...prev, activity_type: e.target.value }))
                }
              />
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Manzil (ixtiyoriy)"
                value={editCompany.address}
                onChange={(e) =>
                  setEditCompany((prev) => ({ ...prev, address: e.target.value }))
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  className="w-full border rounded px-3 py-2"
                  placeholder="Latitude"
                  value={editCompany.latitude}
                  onChange={(e) =>
                    setEditCompany((prev) => ({ ...prev, latitude: e.target.value }))
                  }
                />
                <input
                  className="w-full border rounded px-3 py-2"
                  placeholder="Longitude"
                  value={editCompany.longitude}
                  onChange={(e) =>
                    setEditCompany((prev) => ({ ...prev, longitude: e.target.value }))
                  }
                />
              </div>
              <CompanyLocationPicker
                address={editCompany.address}
                latitude={editCompany.latitude}
                longitude={editCompany.longitude}
                onFieldChange={(field, value) =>
                  setEditCompany((prev) => ({ ...prev, [field]: value }))
                }
              />
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
              <div>
                {editCompany.certificate_pdf_url && (
                  <a
                    href={toAssetUrl(editCompany.certificate_pdf_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-700 hover:underline"
                  >
                    Joriy sertifikatni ko'rish
                  </a>
                )}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className={`w-full border rounded px-3 py-2 mt-1 ${companyFormErrors.certificate_pdf ? "border-red-500" : ""
                    }`}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setEditCompany((prev) => ({ ...prev, certificate_pdf: file }));
                    setCompanyFormErrors((prev) => ({ ...prev, certificate_pdf: "" }));
                  }}
                />
                {editCompany.certificate_pdf && (
                  <p className="text-xs text-gray-600 mt-1">
                    {editCompany.certificate_pdf.name}
                  </p>
                )}
                {companyFormErrors.certificate_pdf && (
                  <p className="text-xs text-red-600 mt-1">
                    {companyFormErrors.certificate_pdf}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditCompanyModal(false);
                  setCompanyFormErrors({});
                  setEditCompany(createEmptyCompanyForm());
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

      {userDeleteConfirm.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div
            className="absolute inset-0"
            onClick={() =>
              !userDeleteLoading && setUserDeleteConfirm({ open: false, id: "", name: "" })
            }
          />
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl border border-gray-200">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                O'chirishni tasdiqlang
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                "{userDeleteConfirm.name}" foydalanuvchisini o'chirmoqchimisiz? Bu amalni
                ortga qaytarib bo'lmaydi.
              </p>
            </div>
            <div className="p-4 flex flex-col-reverse sm:flex-row justify-end gap-2 bg-gray-50 rounded-b-xl">
              <button
                type="button"
                disabled={userDeleteLoading}
                onClick={() => setUserDeleteConfirm({ open: false, id: "", name: "" })}
                className="px-4 py-2 border rounded-lg cursor-pointer disabled:opacity-60"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={userDeleteLoading}
                onClick={() => handleDeleteUser(userDeleteConfirm.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg cursor-pointer disabled:opacity-60"
              >
                {userDeleteLoading ? "O'chirilmoqda..." : "Ha, o'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {companyDeleteConfirm.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div
            className="absolute inset-0"
            onClick={() =>
              !companyDeleteLoading &&
              setCompanyDeleteConfirm({ open: false, id: "", name: "" })
            }
          />
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl border border-gray-200">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                O'chirishni tasdiqlang
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                "{companyDeleteConfirm.name}" kompaniyasini o'chirmoqchimisiz? Bu amalni
                ortga qaytarib bo'lmaydi.
              </p>
            </div>
            <div className="p-4 flex flex-col-reverse sm:flex-row justify-end gap-2 bg-gray-50 rounded-b-xl">
              <button
                type="button"
                disabled={companyDeleteLoading}
                onClick={() =>
                  setCompanyDeleteConfirm({ open: false, id: "", name: "" })
                }
                className="px-4 py-2 border rounded-lg cursor-pointer disabled:opacity-60"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={companyDeleteLoading}
                onClick={() => handleDeleteCompany(companyDeleteConfirm.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg cursor-pointer disabled:opacity-60"
              >
                {companyDeleteLoading ? "O'chirilmoqda..." : "Ha, o'chirish"}
              </button>
            </div>
          </div>
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
                  setRoleEditor({
                    open: false,
                    userId: "",
                    value: "",
                    options: [],
                    companyId: "",
                  })
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
