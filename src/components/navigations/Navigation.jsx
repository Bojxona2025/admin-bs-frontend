import { useSelector } from "react-redux";
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  ChevronsLeft,
  Loader2,
  Menu,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import Logo from "../../assets/Logo.png";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LazyImage from "../image/LazyImage";
import $api from "../../http/api";
import { connectNotificationRealtime } from "../../utils/notificationRealtime";
import notificationsApi from "../../api/notifications.api";
import { getRoleLabelUz } from "../../utils/roleLabel";
import {
  clearSessionLock,
  getSessionLock,
  setSessionRevokedLock,
} from "../../utils/sessionLock";

const BLOCKED_DEVICE_KEY = "blocked_device_force";
const isTruthyBlocked = (v) =>
  v === true ||
  v === 1 ||
  String(v || "").toLowerCase() === "true" ||
  String(v || "").toLowerCase() === "blocked";
const isDeviceBlocked = (d) =>
  isTruthyBlocked(d?.isBlocked) ||
  isTruthyBlocked(d?.blocked) ||
  isTruthyBlocked(d?.is_blocked) ||
  isTruthyBlocked(d?.blockStatus) ||
  String(d?.status || "").toLowerCase() === "blocked";
const readForcedBlocked = () => {
  try {
    return JSON.parse(localStorage.getItem(BLOCKED_DEVICE_KEY) || "null");
  } catch {
    return null;
  }
};
const setForcedBlocked = (reason = "") => {
  localStorage.setItem(
    BLOCKED_DEVICE_KEY,
    JSON.stringify({
      blocked: true,
      reason: reason || "Qurilma bloklangan",
      at: Date.now(),
    })
  );
};
const clearForcedBlocked = () => {
  localStorage.removeItem(BLOCKED_DEVICE_KEY);
};
const DEVICE_ID_KEY = "stable_device_id";
const CURRENT_SESSION_ROW_KEY = "current_session_row_id";

const menuItems = [
  { icon: "/indicators.svg", label: "Ko'rsatkichlar", link: "/indicators/general" },
  { icon: "/selling.svg", label: "Sotuvlar", link: "/sales/orders" },
  { icon: "/goods.svg", label: "Mahsulotlar", link: "/products" },
  { icon: "/contragents.svg", label: "Foydalanuvchilar", link: "/system/users" },
  { icon: "/procurement.svg", label: "Kompaniyalar", link: "/system/companies" },
  { icon: "/money.svg", label: "Tushumlar", link: "/money/accounts" },
  { icon: "/manufacture.svg", label: "EMU buyurtmalar", link: "/emu/integration" },
  { icon: "/bell.svg", label: "Bildirishnomalar", link: "/notifications" },
  { icon: "/ecommerce.svg", label: "Reklama bannerlari", link: "/system/banners" },
  { icon: "/arxiv.svg", label: "Arxivlar", link: "/archive" },
  { icon: "/ochirilganlar.svg", label: "Korzinka", link: "/trash" },
];
const SEARCH_SHORTCUTS = [
  { type: "bo'lim", title: "Ko'rsatkichlar", route: "/indicators/general", keywords: ["dashboard", "statistika", "korsatkich"] },
  { type: "bo'lim", title: "Sotuvlar", route: "/sales/orders", keywords: ["buyurtma", "order", "sotuv"] },
  { type: "bo'lim", title: "Mahsulotlar", route: "/products", keywords: ["product", "mahsulot"] },
  { type: "bo'lim", title: "Foydalanuvchilar", route: "/system/users", keywords: ["user", "xodim", "admin"] },
  { type: "bo'lim", title: "Kompaniyalar", route: "/system/companies", keywords: ["company", "kompaniya"] },
  { type: "bo'lim", title: "Tushumlar", route: "/money/accounts", keywords: ["tushum", "daromad", "income"] },
  { type: "bo'lim", title: "EMU buyurtmalar", route: "/emu/integration", keywords: ["emu", "yetkazib"] },
  { type: "bo'lim", title: "Arxivlar", route: "/archive", keywords: ["arxiv"] },
  { type: "bo'lim", title: "Korzinka", route: "/trash", keywords: ["korzinka", "trash"] },
];

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

export default function Navbar({
  isSidebarCollapsed = false,
  onToggleSidebar = () => {},
  onSidebarExpandChange = () => {},
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useSelector((state) => state.user);

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalResults, setGlobalResults] = useState([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sessionRevoked, setSessionRevoked] = useState(false);
  const [lockRemainingMs, setLockRemainingMs] = useState(0);
  const [sessionOverlayType, setSessionOverlayType] = useState("");
  const [sessionOverlayMessage, setSessionOverlayMessage] = useState("");
  const actorRole = resolveActorRole(user);
  const getCurrentDeviceId = () =>
    localStorage.getItem(DEVICE_ID_KEY) ||
    localStorage.getItem("current_device_id") ||
    localStorage.getItem("device_id") ||
    localStorage.getItem("currentDeviceId") ||
    "";
  const formatLockTime = (ms) => {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const forceLogoutWithBlock = () => {
    const until = setSessionRevokedLock("Sessiyangiz boshqa qurilmadan o'chirildi");
    if (!until) {
      setSessionRevoked(false);
      setLockRemainingMs(0);
      setSessionOverlayType("");
      setSessionOverlayMessage("");
      return;
    }
    setSessionOverlayType("revoked");
    setSessionOverlayMessage("Ushbu sessiya boshqa qurilmadan o'chirildi.");
    setSessionRevoked(true);
  };

  const showBlockedOverlay = (reason = "") => {
    setSessionOverlayType("blocked");
    setSessionOverlayMessage(reason || "Qurilmangiz vaqtincha bloklangan.");
    setSessionRevoked(true);
    setLockRemainingMs(0);
  };

  const hideSessionOverlay = () => {
    setSessionRevoked(false);
    setLockRemainingMs(0);
    setSessionOverlayType("");
    setSessionOverlayMessage("");
  };

  const forceRedirectToLoginAfterLock = () => {
    clearSessionLock();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("token");
    localStorage.removeItem("lastName");
    localStorage.removeItem("user_role");
    localStorage.removeItem("role");
    localStorage.removeItem("userRole");
    localStorage.removeItem("user_profile_cache");
    localStorage.removeItem("current_device_id");
    localStorage.removeItem("device_id");
    localStorage.removeItem("currentDeviceId");
    localStorage.removeItem("current_session_row_id");
    localStorage.removeItem("blocked_device_force");
    window.location.replace("/login");
  };

  const filteredMenuItems = menuItems.filter((item) => {
    if (
      (item.link === "/system/banners" || item.link === "/system/companies") &&
      !isSuperAdminRole(actorRole)
    ) {
      return false;
    }
    if (
      item.link === "/system/users" &&
      !(isSuperAdminRole(actorRole) || isAdminLikeRole(actorRole))
    ) {
      return false;
    }
    if (item.link === "/notifications" && !isSuperAdminRole(actorRole)) {
      return false;
    }
    return true;
  });

  const currentActiveLabel =
    filteredMenuItems.find((item) => location.pathname.startsWith(item.link))?.label || "Boshqaruv paneli";
  const showBackButton =
    location.pathname !== "/" && location.pathname !== "/indicators/general";

  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/indicators/general");
  };

  const handleLogout = () => {
    clearSessionLock();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("token");
    localStorage.removeItem("lastName");
    localStorage.removeItem("user_role");
    localStorage.removeItem("role");
    localStorage.removeItem("userRole");
    localStorage.removeItem("user_profile_cache");
    localStorage.removeItem("current_device_id");
    localStorage.removeItem("device_id");
    localStorage.removeItem("currentDeviceId");
    localStorage.removeItem("current_session_row_id");
    localStorage.removeItem("blocked_device_force");
    window.location.replace("/login");
  };

  useEffect(() => {
    setMobileMenuOpen(false);
    setShowUserDropdown(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest(".user-dropdown-container")) {
        setShowUserDropdown(false);
      }
      if (isSearchOpen && !event.target.closest(".global-search-container")) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserDropdown, isSearchOpen]);

  useEffect(() => {
    setIsSearchOpen(false);
  }, [location.pathname]);

  const isSidebarExpanded = !isSidebarCollapsed || isSidebarHovered;

  useEffect(() => {
    onSidebarExpandChange(isSidebarExpanded);
  }, [isSidebarExpanded, onSidebarExpandChange]);

  const fetchNotificationCount = async () => {
    if (!isSuperAdminRole(actorRole)) {
      setNotificationCount(0);
      return;
    }
    try {
      const my = await notificationsApi.getMy({ page: 1, limit: 100 });
      setNotificationCount(my.unreadCount || 0);
    } catch (error) {
      try {
        const { data } = await $api.get("/notifications/all", {
          params: { page: 1, limit: 1 },
        });
        const total =
          data?.totalNotifications || data?.total || data?.count || 0;
        setNotificationCount(total);
      } catch (innerError) {
        setNotificationCount(0);
      }
    }
  };

  const markNotificationsAsRead = async () => {
    if (!isSuperAdminRole(actorRole)) return;
    try {
      const my = await notificationsApi.getMy({ page: 1, limit: 100 });
      const unread = (my.items || []).filter((item) => !item?.isRead);
      if (!unread.length) {
        setNotificationCount(0);
        return;
      }

      await Promise.allSettled(
        unread
          .map((item) => item?._id)
          .filter(Boolean)
          .map((id) => notificationsApi.getById(id))
      );
    } catch (_) {
      // keyin ham count qayta olinadi
    } finally {
      setNotificationCount(0);
      fetchNotificationCount();
    }
  };

  const markSingleNotificationAsRead = async (id) => {
    if (!id) return;
    try {
      await notificationsApi.getById(id);
    } catch (_) {
      // xatoni yutamiz, badge keyin refresh qilinadi
    } finally {
      fetchNotificationCount();
    }
  };

  const showBrowserNotification = (payload) => {
    if (!isSuperAdminRole(actorRole)) return;
    if (!("Notification" in window)) return;
    if (document.visibilityState === "visible") return;
    if (Notification.permission !== "granted") return;

    const notificationData = payload?.notification || payload || {};
    const id =
      notificationData?._id ||
      notificationData?.id ||
      payload?.notificationId ||
      null;
    const title =
      notificationData?.name ||
      notificationData?.title ||
      "Yangi bildirishnoma";
    const body =
      notificationData?.message ||
      notificationData?.message_ru ||
      notificationData?.message_en ||
      "Sizga yangi xabar keldi";

    const browserNotification = new Notification(title, {
      body,
      tag: id ? `notification-${id}` : "notification-new",
    });

    browserNotification.onclick = () => {
      window.focus();
      navigate("/notifications");
      if (id) {
        markSingleNotificationAsRead(id);
      }
      browserNotification.close();
    };
  };

  useEffect(() => {
    const query = globalSearch.trim();
    if (!query) {
      setGlobalResults([]);
      setGlobalSearchLoading(false);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setGlobalSearchLoading(true);
      try {
        const localMatches = SEARCH_SHORTCUTS.filter((item) => {
          const full = `${item.title} ${item.keywords.join(" ")}`.toLowerCase();
          return full.includes(query.toLowerCase());
        }).map((item) => ({
          id: `shortcut-${item.route}`,
          type: item.type,
          title: item.title,
          description: "Bo'lim",
          route: item.route,
        }));

        const calls = await Promise.allSettled([
          $api.get("/products/get/query", { params: { name: query, page: 1, limit: 5 } }),
          (isSuperAdminRole(actorRole) || isAdminLikeRole(actorRole))
            ? $api.get("/users/get/all", { params: { query, page: 1, limit: 5 } })
            : Promise.resolve({ data: {} }),
          $api.get("/order/get/all", { params: { user_name: query, page: 1, limit: 5 } }),
          isSuperAdminRole(actorRole)
            ? $api.get("/notifications/all", { params: { query, page: 1, limit: 5 } })
            : Promise.resolve({ data: {} }),
          isSuperAdminRole(actorRole)
            ? $api.get("/company/all", { params: { query, page: 1, limit: 5 } })
            : Promise.resolve({ data: {} }),
        ]);

        const [productRes, userRes, orderRes, notificationRes, companyRes] = calls;
        const results = [...localMatches];

        if (productRes.status === "fulfilled") {
          const products = productRes.value?.data?.products || productRes.value?.data?.data || [];
          products.slice(0, 5).forEach((p) => {
            results.push({
              id: `product-${p?._id}`,
              type: "mahsulot",
              title: p?.name || "Nomsiz mahsulot",
              description: "Mahsulotlar bo'limi",
              route: `/products/detail/${p?._id}`,
            });
          });
        }

        if (userRes.status === "fulfilled") {
          const users = userRes.value?.data?.data || userRes.value?.data?.users || [];
          users.slice(0, 5).forEach((u) => {
            results.push({
              id: `user-${u?._id}`,
              type: "foydalanuvchi",
              title: `${u?.firstName || ""} ${u?.lastName || ""}`.trim() || u?.phoneNumber || "Foydalanuvchi",
              description: u?.phoneNumber || "Foydalanuvchilar bo'limi",
              route: "/system/users",
            });
          });
        }

        if (orderRes.status === "fulfilled") {
          const orders = orderRes.value?.data?.allOrders || orderRes.value?.data?.orders || orderRes.value?.data?.data || [];
          orders.slice(0, 5).forEach((o) => {
            results.push({
              id: `order-${o?._id || o?.order_number}`,
              type: "buyurtma",
              title: o?.order_number ? `Buyurtma #${o.order_number}` : "Buyurtma",
              description: o?.user?.phoneNumber || o?.order_status || "Sotuvlar bo'limi",
              route: "/sales/orders",
            });
          });
        }

        if (notificationRes.status === "fulfilled") {
          const notifications =
            notificationRes.value?.data?.notifications ||
            notificationRes.value?.data?.notificationsAll ||
            notificationRes.value?.data?.data ||
            [];
          notifications.slice(0, 5).forEach((n) => {
            results.push({
              id: `notification-${n?._id}`,
              type: "bildirishnoma",
              title: n?.message || n?.message_ru || n?.message_en || "Xabar",
              description: "Bildirishnomalar bo'limi",
              route: "/notifications",
            });
          });
        }

        if (companyRes.status === "fulfilled") {
          const companies = companyRes.value?.data?.data || companyRes.value?.data?.companies || [];
          companies.slice(0, 5).forEach((c) => {
            results.push({
              id: `company-${c?._id}`,
              type: "kompaniya",
              title: c?.name || "Kompaniya",
              description: c?.stir || "Kompaniyalar bo'limi",
              route: "/system/companies",
            });
          });
        }

        if (!isCancelled) {
          const unique = Array.from(new Map(results.map((item) => [item.id, item])).values()).slice(0, 20);
          setGlobalResults(unique);
        }
      } finally {
        if (!isCancelled) setGlobalSearchLoading(false);
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [globalSearch, actorRole]);

  useEffect(() => {
    if (!isSuperAdminRole(actorRole)) {
      setNotificationCount(0);
      return () => {};
    }

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 15000);
    const handleCreated = () => fetchNotificationCount();
    window.addEventListener("notification:created", handleCreated);
    const disconnect = connectNotificationRealtime({
      onRefresh: fetchNotificationCount,
      onPayload: showBrowserNotification,
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener("notification:created", handleCreated);
      disconnect?.();
    };
  }, [actorRole]);

  useEffect(() => {
    if (location.pathname === "/login") return () => {};

    let stopped = false;
    const checkMySession = async () => {
      if (stopped) return;

      const lock = getSessionLock();
      const forcedBlocked = readForcedBlocked();
      if (forcedBlocked?.blocked) {
        showBlockedOverlay(forcedBlocked?.reason || "");
      }

      try {
        const { data } = await $api.get("/devices/my");
        const raw =
          (Array.isArray(data?.data) ? data?.data : null) ||
          data?.devices ||
          data?.myDevices ||
          data?.sessions ||
          data?.activeSessions ||
          data?.items ||
          data?.data?.devices ||
          data?.data?.myDevices ||
          data?.data?.sessions ||
          data?.data?.activeSessions ||
          data?.data?.items ||
          [];
        if (!Array.isArray(raw) || raw.length === 0) {
          forceLogoutWithBlock();
          return;
        }

        const currentFromApi =
          data?.currentDeviceId ||
          data?.data?.currentDeviceId ||
          data?.current?.deviceId ||
          data?.data?.current?.deviceId ||
          "";
        const currentFromStorage = getCurrentDeviceId();
        if (currentFromApi) {
          localStorage.setItem("current_device_id", String(currentFromApi));
          localStorage.setItem("currentDeviceId", String(currentFromApi));
        }
        const currentId = String(currentFromApi || currentFromStorage || "");
        const readId = (d) =>
          String(
            d?.deviceId ||
              d?._id ||
              d?.id ||
              d?.sessionId ||
              d?.sid ||
              ""
          );
        const isCurrentFlag = (d) =>
          Boolean(d?.isCurrent || d?.current || d?.is_current || d?.thisDevice);
        let currentDevice = null;
        if (currentId) {
          currentDevice = raw.find((d) => {
            const id = readId(d);
            return id && id === currentId;
          });
          if (!currentDevice) {
            forceLogoutWithBlock();
            return;
          }
        }
        if (!currentDevice) {
          currentDevice =
            raw.find((d) => String(d?.deviceId || "") === String(currentFromStorage || "")) ||
            raw.find(isCurrentFlag) ||
            null;
        }
        if (!currentDevice && raw.length === 1) {
          currentDevice = raw[0];
        }

        const sameDeviceRows = currentId
          ? raw.filter((d) => String(d?.deviceId || "") === currentId)
          : [];
        const blockedInSameDevice = sameDeviceRows.find((d) => isDeviceBlocked(d));
        if (blockedInSameDevice) {
          setForcedBlocked(blockedInSameDevice?.blockedReason || "");
          showBlockedOverlay(blockedInSameDevice?.blockedReason || "");
          return;
        }

        const knownCurrentRowId =
          localStorage.getItem(CURRENT_SESSION_ROW_KEY) || "";
        const currentFlagRow =
          raw.find((d) => isCurrentFlag(d)) ||
          sameDeviceRows.sort((a, b) => {
            const ad = new Date(a?.lastLogin || a?.lastActiveAt || a?.updatedAt || 0).getTime();
            const bd = new Date(b?.lastLogin || b?.lastActiveAt || b?.updatedAt || 0).getTime();
            return bd - ad;
          })[0] ||
          null;
        const currentRowId = String(currentFlagRow?._id || "");
        if (currentRowId) {
          localStorage.setItem(CURRENT_SESSION_ROW_KEY, currentRowId);
        }
        if (knownCurrentRowId) {
          const knownStillExists = raw.some(
            (d) => String(d?._id || "") === String(knownCurrentRowId)
          );
          if (!knownStillExists) {
            forceLogoutWithBlock();
            return;
          }
        }

        // Agar joriy qurilma topilmasa ham, "joriy deb belgilangan bloklangan"
        // yoki "id bo'yicha bloklangan" qurilma bo'lsa to'g'ridan-to'g'ri bloklaymiz.
        const blockedByCurrentFlag = raw.find(
          (d) => isDeviceBlocked(d) && isCurrentFlag(d)
        );
        const blockedByCurrentId =
          currentId &&
          raw.find((d) => isDeviceBlocked(d) && readId(d) === currentId);
        const blockedCurrent =
          blockedByCurrentId ||
          blockedByCurrentFlag ||
          (currentDevice && isDeviceBlocked(currentDevice) ? currentDevice : null);

        if (blockedCurrent) {
          setForcedBlocked(blockedCurrent?.blockedReason || "");
          showBlockedOverlay(blockedCurrent?.blockedReason || "");
          return;
        }
        if (currentDevice && !isDeviceBlocked(currentDevice)) {
          clearForcedBlocked();
          if (sessionOverlayType === "blocked") {
            hideSessionOverlay();
          }
        }

        if (lock.locked) {
          if (currentDevice) {
            clearSessionLock();
            hideSessionOverlay();
          } else {
            setSessionOverlayType("revoked");
            setSessionOverlayMessage("Ushbu sessiya boshqa qurilmadan o'chirildi.");
            setSessionRevoked(true);
            setLockRemainingMs(lock.remainingMs);
          }
          return;
        }
        if (sessionOverlayType === "blocked") {
          hideSessionOverlay();
        }
        if (sessionOverlayType === "revoked") {
          hideSessionOverlay();
        }
      } catch (err) {
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          forceLogoutWithBlock();
        }
      }
    };

    checkMySession();
    const interval = setInterval(checkMySession, 2000);
    const lockTimer = setInterval(() => {
      const updatedLock = getSessionLock();
      if (updatedLock.locked) {
        setSessionOverlayType("revoked");
        setSessionOverlayMessage("Ushbu sessiya boshqa qurilmadan o'chirildi.");
        setSessionRevoked(true);
        setLockRemainingMs(updatedLock.remainingMs);
        return;
      }
      if (sessionOverlayType === "revoked") {
        hideSessionOverlay();
        forceRedirectToLoginAfterLock();
      }
    }, 1000);
    const handleForcedRevoke = () => forceLogoutWithBlock();
    window.addEventListener("session:revoked", handleForcedRevoke);
    return () => {
      stopped = true;
      clearInterval(interval);
      clearInterval(lockTimer);
      window.removeEventListener("session:revoked", handleForcedRevoke);
    };
  }, [location.pathname, sessionOverlayType]);

  const SidebarContent = ({ onNavigate, forceExpanded = false }) => {
    const expanded = forceExpanded || isSidebarExpanded;

    return (
    <>
      <div className={`h-16 px-3 border-b border-gray-200 flex items-center ${expanded ? "justify-between" : "justify-center"}`}>
        <div className={`flex items-center gap-3 ${expanded ? "" : "justify-center"}`}>
          <div className="w-9 h-9 rounded-lg bg-[#0e9f6e] flex items-center justify-center text-white font-bold">
            <LazyImage src={Logo} alt="logo" className="w-7 h-7" />
          </div>
          {expanded && <div className="font-semibold text-gray-900">BS-MARKET</div>}
        </div>
        {expanded && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:bg-slate-100"
            title="Yig'ish"
          >
            <ChevronsLeft size={16} />
          </button>
        )}
      </div>

      <nav className="p-3 space-y-1 overflow-y-auto">
        {filteredMenuItems.map(({ icon, label, link }) => {
          const isActive = location.pathname.startsWith(link);
          return (
            <Link
              key={label}
              to={link}
              onClick={onNavigate}
              title={label}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-[#0e9f6e] text-white"
                  : "text-slate-700 hover:bg-slate-100"
              } ${expanded ? "" : "justify-center"}`}
            >
              <LazyImage src={icon} alt={label} className={`w-4 h-4 ${isActive ? "brightness-0 invert" : "brightness-0 opacity-75"}`} />
              {expanded && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );
  };

  return (
    <>
      <aside
        onMouseEnter={() => {
          if (isSidebarCollapsed) setIsSidebarHovered(true);
        }}
        onMouseLeave={() => {
          if (isSidebarCollapsed) setIsSidebarHovered(false);
        }}
        className={`hidden lg:flex fixed left-0 top-0 bottom-0 bg-white border-r border-gray-200 z-40 flex-col transition-all duration-500 ease-in-out ${isSidebarExpanded ? "w-64" : "w-20"}`}
      >
        <SidebarContent />
      </aside>

      <div className={`fixed top-0 right-0 left-0 h-16 bg-white border-b border-gray-200 z-30 px-3 lg:px-6 flex items-center justify-between gap-3 transition-all duration-500 ease-in-out ${isSidebarExpanded ? "lg:left-64" : "lg:left-20"}`}>
        <div className="flex items-center gap-2 min-w-0">
          {showBackButton && (
            <button
              type="button"
              onClick={handleBackClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-100/70 text-slate-700 hover:bg-slate-200 transition-colors"
              title="Orqaga qaytish"
            >
              <ArrowLeft size={15} />
              <span className="text-sm font-medium">Orqaga</span>
            </button>
          )}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden lg:flex p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            title={isSidebarCollapsed ? "Yoyish" : "Yig'ish"}
          >
            <ChevronsLeft size={18} className={isSidebarCollapsed ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-lg font-semibold text-slate-900 truncate">{currentActiveLabel}</h1>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden sm:flex global-search-container relative items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 w-52 md:w-72">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Qidirish..."
              value={globalSearch}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && globalResults.length) {
                  navigate(globalResults[0].route);
                  setIsSearchOpen(false);
                  setGlobalSearch("");
                }
              }}
              className="w-full text-sm outline-none"
            />
            {globalSearchLoading && <Loader2 size={14} className="animate-spin text-gray-400" />}
            {isSearchOpen && (globalSearch.trim() || globalResults.length > 0) && (
              <div className="absolute top-[110%] left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-y-auto">
                {globalResults.length > 0 ? (
                  globalResults.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        navigate(item.route);
                        setIsSearchOpen(false);
                        setGlobalSearch("");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                    >
                      <div className="text-sm font-medium text-slate-800">{item.title}</div>
                      <div className="text-xs text-slate-500">
                        {item.type} • {item.description}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-3 text-sm text-slate-500">Natija topilmadi</div>
                )}
              </div>
            )}
          </div>

          {isSuperAdminRole(actorRole) && (
            <button
              onClick={async () => {
                await markNotificationsAsRead();
                navigate("/notifications");
              }}
              className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
            >
              <Bell size={18} />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </button>
          )}

          <div className="relative user-dropdown-container">
            <button
              type="button"
              onClick={() => setShowUserDropdown((prev) => !prev)}
              className="flex items-center gap-2 md:gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-100"
            >
              <div className="w-8 h-8 rounded-full bg-[#0e9f6e] text-white flex items-center justify-center text-xs font-bold">
                {(user?.firstName || "A").slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden md:block text-left leading-tight">
                <div className="text-sm font-medium text-slate-900">{loading ? "Yuklanmoqda..." : user?.firstName || "Administrator"}</div>
                <div className="text-xs text-slate-500">{getRoleLabelUz(user?.role || actorRole)}</div>
              </div>
              <ChevronDown size={16} className={`text-slate-500 transition-transform ${showUserDropdown ? "rotate-180" : ""}`} />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                <button
                  onClick={() => {
                    navigate("/profile");
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50"
                >
                  Profil
                </button>
                <button
                  onClick={() => {
                    navigate("/settings");
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50"
                >
                  Sozlamalar
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  Chiqish
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[84%] max-w-xs bg-white border-r border-gray-200 flex flex-col">
            <div className="h-16 px-4 flex items-center justify-between border-b border-gray-200">
              <div className="font-semibold text-gray-900">Menyu</div>
              <button className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setMobileMenuOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <SidebarContent
              forceExpanded={true}
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </aside>
        </div>
      )}

      {sessionRevoked && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-400 bg-slate-950/70 text-white p-6 text-center shadow-2xl">
            <h3 className="text-xl font-bold text-red-300">
              {sessionOverlayType === "blocked"
                ? "Siz dasturdan chiqarildingiz"
                : "Siz dasturdan chiqarildingiz"}
            </h3>
            <p className="mt-2 text-slate-200">
              {sessionOverlayType === "blocked"
                ? sessionOverlayMessage ||
                  "Admin tomonidan qurilmangiz bloklandi. Blok yechilmaguncha tizim yopiq turadi."
                : "Ushbu sessiya boshqa qurilmadan o'chirildi. Xavfsizlik uchun tizim bloklandi."}
            </p>
            {sessionOverlayType !== "blocked" && (
              <div className="mt-4">
                <div className="text-sm text-slate-300">Qayta kirish uchun qolgan vaqt</div>
                <div className="mt-1 text-3xl font-bold tracking-wider text-red-300">
                  {formatLockTime(lockRemainingMs)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
