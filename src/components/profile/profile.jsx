import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  AlertCircle,
  Ban,
  Calendar,
  Lock,
  Monitor,
  Pencil,
  Phone,
  Save,
  Shield,
  Smartphone,
  Trash2,
  Unlock,
  User,
  Users,
} from "lucide-react";
import $api from "../../http/api";
import { getRoleLabelUz, normalizeRole } from "../../utils/roleLabel";
import { DeleteConfirmModal } from "../modals/delete_confirm/DeleteConfirmModal";
import { setSessionRevokedLock } from "../../utils/sessionLock";

const getApiError = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.msg || fallback;

const readCurrentDeviceId = () =>
  localStorage.getItem("current_device_id") ||
  localStorage.getItem("device_id") ||
  localStorage.getItem("currentDeviceId") ||
  "";

const detectCurrentDevice = (device, explicitCurrentId = "") =>
  Boolean(
    device?.isCurrent ||
      device?.current ||
      device?.is_current ||
      device?.thisDevice ||
      (explicitCurrentId &&
        String(device?._id || device?.id || device?.deviceId || "") ===
          String(explicitCurrentId)) ||
      (readCurrentDeviceId() &&
        String(device?._id || device?.id || device?.deviceId || "") ===
          String(readCurrentDeviceId()))
  );

const normalizeDevices = (payload) => {
  const parseBrowserFromUA = (ua) => {
    const s = String(ua || "").toLowerCase();
    if (!s) return "-";
    if (s.includes("edg/") || s.includes("edge/")) return "Microsoft Edge";
    if (s.includes("opr/") || s.includes("opera")) return "Opera";
    if (s.includes("firefox/")) return "Firefox";
    if (s.includes("chrome/") && !s.includes("edg/") && !s.includes("opr/"))
      return "Chrome";
    if (s.includes("safari/") && !s.includes("chrome/")) return "Safari";
    return "Web Browser";
  };
  const parseOsFromUA = (ua) => {
    const s = String(ua || "").toLowerCase();
    if (!s) return "-";
    if (s.includes("windows")) return "Windows";
    if (s.includes("android")) return "Android";
    if (s.includes("iphone") || s.includes("ipad") || s.includes("ios")) return "iOS";
    if (s.includes("mac os") || s.includes("macintosh")) return "macOS";
    if (s.includes("linux")) return "Linux";
    return "-";
  };
  const raw =
    payload?.devices ||
    payload?.data?.devices ||
    payload?.myDevices ||
    payload?.data?.myDevices ||
    payload?.sessions ||
    payload?.data?.sessions ||
    payload?.activeSessions ||
    payload?.data?.activeSessions ||
    payload?.results ||
    payload?.data?.results ||
    payload?.data ||
    payload?.items ||
    [];
  if (!Array.isArray(raw)) return [];
  const explicitCurrentId =
    payload?.currentDeviceId ||
    payload?.data?.currentDeviceId ||
    payload?.current?.deviceId ||
    payload?.data?.current?.deviceId ||
    payload?.currentDevice?._id ||
    payload?.data?.currentDevice?._id ||
    payload?.myCurrentDeviceId ||
    "";

  return raw.map((item) => {
    const identifiers = [
      item?._id,
      item?.id,
      item?.deviceId,
      item?.sessionId,
      item?.sid,
      item?.tokenId,
    ]
      .filter(Boolean)
      .map((v) => String(v));
    const id = identifiers[0] || "";
    const ua = item?.userAgent || item?.ua || item?.agent || "";
    const browserRaw = item?.browser || item?.browserName || item?.uaBrowser || "";
    const osRaw = item?.os || item?.osName || item?.uaOs || "";
    const browser =
      browserRaw && String(browserRaw).toLowerCase() !== "web browser"
        ? browserRaw
        : parseBrowserFromUA(ua);
    const os = osRaw || parseOsFromUA(ua);
    const deviceName =
      item?.deviceName ||
      item?.device ||
      item?.platform ||
      item?.name ||
      item?.model ||
      `${browser} (${os})`;
    const lastActive =
      item?.lastActiveAt ||
      item?.last_activity ||
      item?.updatedAt ||
      item?.createdAt ||
      null;

    return {
      id,
      identifiers,
      browser,
      os,
      deviceName,
      lastActive,
      isBlocked: Boolean(item?.isBlocked),
      blockedAt: item?.blockedAt || null,
      blockedReason: item?.blockedReason || "",
      isCurrent: detectCurrentDevice(item, explicitCurrentId),
      raw: item,
    };
  });
};

const normalizeUsers = (payload) => {
  const raw =
    payload?.users ||
    payload?.data?.users ||
    payload?.data ||
    payload?.items ||
    [];
  if (!Array.isArray(raw)) return [];

  return raw.map((u) => ({
    id: u?._id || u?.id,
    fullName:
      `${u?.firstName || ""} ${u?.lastName || ""}`.trim() ||
      u?.phoneNumber ||
      "Noma'lum",
    phoneNumber: u?.phoneNumber || "",
    role: normalizeRole(u?.role),
    companyName:
      u?.companyName || u?.companyId?.name || u?.company?.name || "—",
    raw: u,
  }));
};

const formatLastActive = (value) => {
  if (!value) return "Noma'lum";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Noma'lum";
  return parsed.toLocaleString("uz-UZ");
};

const logoutNow = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("lastName");
  localStorage.removeItem("user_role");
  localStorage.removeItem("role");
  localStorage.removeItem("userRole");
  localStorage.removeItem("user_profile_cache");
  localStorage.removeItem("current_device_id");
  localStorage.removeItem("device_id");
  localStorage.removeItem("currentDeviceId");
  window.location.href = "/login";
};

export default function ProfilePage() {
  const { user } = useSelector((state) => state.user);
  const actorRole = normalizeRole(user?.role);
  const isSuperAdmin = actorRole === "superadmin";
  const isAdmin = actorRole === "admin";
  const canManageAllUsers = isSuperAdmin || isAdmin;

  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    gender: "",
  });

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceError, setDeviceError] = useState("");
  const [deviceSuccess, setDeviceSuccess] = useState("");
  const [confirmState, setConfirmState] = useState({
    open: false,
    type: "",
    device: null,
  });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [forcedLogout, setForcedLogout] = useState(false);
  const [blockingDeviceId, setBlockingDeviceId] = useState("");
  const myUserId = profileData?._id || user?._id || "";
  const isManagingOwnDevices = !selectedUserId || String(selectedUserId) === String(myUserId);

  const activeUserId = useMemo(() => {
    if (selectedUserId) return selectedUserId;
    return myUserId;
  }, [selectedUserId, myUserId]);

  const activeUserLabel = useMemo(() => {
    if (selectedUserId) {
      const selected = users.find((u) => u.id === selectedUserId);
      return selected?.fullName || "Tanlangan foydalanuvchi";
    }
    return "Mening qurilmalarim";
  }, [selectedUserId, users]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.fullName} ${u.phoneNumber} ${u.companyName}`.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    setProfileError("");
    try {
      const res = await $api.get("/users/profile/me");
      const data = res.data;
      const profile = data?.myProfile || data?.profile || data?.user || null;
      if (!profile) throw new Error("Profil topilmadi");

      setProfileData(profile);
      localStorage.setItem("user_profile_cache", JSON.stringify(profile));
      setFormData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        phoneNumber: profile.phoneNumber || "",
        gender: profile.gender || "",
      });
    } catch (error) {
      setProfileError(getApiError(error, "Profilni olishda xatolik yuz berdi"));
    } finally {
      setLoadingProfile(false);
    }
  };

  const forceBlockAndLogout = () => {
    setSessionRevokedLock("Sessiyangiz ushbu qurilmada o'chirildi");
    window.dispatchEvent(new Event("session:revoked"));
    setForcedLogout(true);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileError("");
    setProfileSuccess("");
    try {
      const payload = {};
      if (formData.firstName !== profileData?.firstName) payload.firstName = formData.firstName;
      if (formData.lastName !== profileData?.lastName) payload.lastName = formData.lastName;
      if (formData.email !== profileData?.email) payload.email = formData.email;
      if ((formData.gender || "") !== (profileData?.gender || "")) payload.gender = formData.gender;

      if (!Object.keys(payload).length) {
        setIsEditing(false);
        return;
      }

      const body = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        body.append(key, value ?? "");
      });

      const res = await $api.patch("/users/update/me", body);
      const data = res.data;
      const updated = data?.myProfile || data?.profile || data?.user || data;
      const merged = { ...(profileData || {}), ...(updated || {}), ...payload };
      setProfileData(merged);
      localStorage.setItem("user_profile_cache", JSON.stringify(merged));
      setIsEditing(false);
      setProfileSuccess("Profil muvaffaqiyatli yangilandi");
    } catch (error) {
      setProfileError(getApiError(error, "Profilni saqlashda xatolik yuz berdi"));
    } finally {
      setSavingProfile(false);
    }
  };

  const fetchUsersForDevices = async () => {
    if (!canManageAllUsers) return;
    try {
      const { data } = await $api.get("/devices/users");
      const list = normalizeUsers(data);
      const hasMe = list.some((item) => String(item.id) === String(myUserId));
      const meLabel =
        `${profileData?.firstName || user?.firstName || ""} ${
          profileData?.lastName || user?.lastName || ""
        }`.trim() ||
        profileData?.phoneNumber ||
        user?.phoneNumber ||
        "Mening profilim";
      const meRole = normalizeRole(profileData?.role || user?.role);
      const meCompany =
        profileData?.companyName || profileData?.companyId?.name || user?.companyName || "—";
      const normalized = hasMe
        ? list
        : [
            {
              id: myUserId,
              fullName: meLabel,
              phoneNumber: profileData?.phoneNumber || user?.phoneNumber || "",
              role: meRole,
              companyName: meCompany,
              raw: profileData || user || {},
            },
            ...list,
          ];
      setUsers(normalized);
    } catch (error) {
      setDeviceError(getApiError(error, "Foydalanuvchilarni olishda xatolik yuz berdi"));
    }
  };

  const fetchDevices = async (targetUserId = activeUserId) => {
    if (!targetUserId) return;
    setLoadingDevices(true);
    setDeviceError("");
    try {
      let data;
      if (canManageAllUsers && !isManagingOwnDevices) {
        const res = await $api.get(`/devices/users/${targetUserId}`);
        data = res.data;
      } else {
        const res = await $api.get("/devices/my");
        data = res.data;
        const directMine = normalizeDevices(data);
        if (canManageAllUsers && directMine.length === 0 && myUserId) {
          try {
            const fallbackRes = await $api.get(`/devices/users/${myUserId}`);
            data = fallbackRes.data;
          } catch (_) {
            // asosiy my endpoint javobi qoladi
          }
        }
      }
      let normalized = normalizeDevices(data);
      if (isManagingOwnDevices && normalized.length === 1) {
        normalized = normalized.map((d) => ({ ...d, isCurrent: true }));
      }
      const currentId =
        data?.currentDeviceId ||
        data?.data?.currentDeviceId ||
        data?.current?.deviceId ||
        data?.data?.current?.deviceId ||
        "";
      if (currentId) {
        localStorage.setItem("current_device_id", String(currentId));
      }
      setDevices(normalized);
    } catch (error) {
      setDevices([]);
      setDeviceError(getApiError(error, "Qurilmalarni olishda xatolik yuz berdi"));
    } finally {
      setLoadingDevices(false);
    }
  };

  const removeDevice = async (device) => {
    if (!device?.id || !activeUserId) return;
    if (isManagingOwnDevices) {
      setDeviceError("O'z qurilmangizni o'chira olmaysiz");
      return;
    }
    setDeviceError("");
    setDeviceSuccess("");
    setConfirmState({ open: true, type: "single", device });
  };

  const toggleDeviceBlock = async (device, shouldBlock) => {
    if (!device?.id || !activeUserId) return;
    if (isManagingOwnDevices) {
      setDeviceError("O'z qurilmangizni bloklab bo'lmaydi");
      return;
    }
    setDeviceError("");
    setDeviceSuccess("");
    setBlockingDeviceId(device.id);
    try {
      const idsToTry = Array.from(
        new Set([...(device.identifiers || []), device.id].filter(Boolean))
      );
      let done = false;
      let lastError = null;
      for (const oneId of idsToTry) {
        try {
          await $api.patch(
            `/devices/users/${activeUserId}/${oneId}/${shouldBlock ? "block" : "unblock"}`
          );
          done = true;
          break;
        } catch (err) {
          lastError = err;
          if (err?.response?.status !== 404) throw err;
        }
      }
      if (!done) {
        throw lastError || new Error("Qurilma topilmadi");
      }
      setDeviceSuccess(
        shouldBlock
          ? "Qurilma muvaffaqiyatli bloklandi"
          : "Qurilma blokdan chiqarildi"
      );
      fetchDevices(activeUserId);
    } catch (error) {
      setDeviceError(
        getApiError(
          error,
          shouldBlock
            ? "Qurilmani bloklashda xatolik yuz berdi"
            : "Qurilmani blokdan chiqarishda xatolik yuz berdi"
        )
      );
    } finally {
      setBlockingDeviceId("");
    }
  };

  const executeConfirmedDelete = async () => {
    if (!confirmState.type) return;
    setConfirmLoading(true);
    try {
      if (confirmState.type === "single") {
        const device = confirmState.device;
        if (!device?.id) return;
        const idsToTry = Array.from(
          new Set([...(device.identifiers || []), device.id].filter(Boolean))
        );
        let deleteDone = false;
        let lastError = null;
        for (const oneId of idsToTry) {
          try {
            if (canManageAllUsers && !isManagingOwnDevices) {
              await $api.delete(`/devices/users/${activeUserId}/${oneId}`);
            } else {
              await $api.delete(`/devices/my/${oneId}`);
            }
            deleteDone = true;
            break;
          } catch (err) {
            lastError = err;
            if (err?.response?.status !== 404) {
              throw err;
            }
          }
        }
        if (!deleteDone) {
          throw lastError || new Error("Device topilmadi");
        }
        setDeviceSuccess("Qurilma muvaffaqiyatli o'chirildi");
        setDevices((prev) => prev.filter((item) => item.id !== device.id));
        if (device.isCurrent && isManagingOwnDevices) {
          forceBlockAndLogout();
          return;
        }
        if (isManagingOwnDevices && devices.length <= 1) {
          forceBlockAndLogout();
          return;
        }
      } else if (confirmState.type === "all") {
        const payload = {
          keepCurrent: true,
          currentDeviceId: readCurrentDeviceId() || undefined,
        };

        if (canManageAllUsers && !isManagingOwnDevices) {
          await $api.delete(`/devices/users/${activeUserId}/clear/all`, {
            data: payload,
          });
        } else {
          await $api.delete("/devices/my/clear/all", { data: payload });
        }

        setDeviceSuccess("Qurilmalar tozalandi");
      }

      // Flag noto'g'ri kelgan holatlarda ham xavfsiz tekshiruv:
      // agar o'z sessiyamiz endi ro'yxatda yo'q bo'lsa, darhol chiqaramiz.
      if (isManagingOwnDevices) {
        try {
          const myDevicesRes = await $api.get("/devices/my");
          const myList = normalizeDevices(myDevicesRes.data);
          const hasCurrent = myList.some((d) => d.isCurrent);
          if (!hasCurrent || myList.length === 0) {
            forceBlockAndLogout();
            return;
          }
        } catch (_) {
          forceBlockAndLogout();
          return;
        }
      }

      fetchDevices(activeUserId);
    } catch (error) {
      const fallback =
        confirmState.type === "single"
          ? "Qurilmani o'chirishda xatolik yuz berdi"
          : "Qurilmalarni tozalashda xatolik yuz berdi";
      setDeviceError(getApiError(error, fallback));
    } finally {
      setConfirmLoading(false);
      setConfirmState({ open: false, type: "", device: null });
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    fetchUsersForDevices();
  }, [canManageAllUsers, myUserId, profileData?._id, user?._id]);

  useEffect(() => {
    if (profileData?._id) {
      fetchDevices(activeUserId);
    }
  }, [profileData?._id, selectedUserId]);

  return (
    <div className="mx-auto mt-6 max-w-7xl px-3 sm:px-5 lg:px-6 pb-8">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <section className="xl:col-span-5 bg-white border border-emerald-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <User size={22} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {profileData?.firstName} {profileData?.lastName}
                </h2>
                <p className="text-sm text-slate-500">
                  {getRoleLabelUz(profileData?.role || actorRole)}
                </p>
              </div>
            </div>
            <span
              className={`inline-block w-3 h-3 rounded-full ${
                profileData?.isOnline ? "bg-emerald-500" : "bg-slate-300"
              }`}
              title={profileData?.isOnline ? "Onlayn" : "Oflayn"}
            />
          </div>

          {(profileError || profileSuccess) && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                profileError
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {profileError || profileSuccess}
            </div>
          )}

          {loadingProfile ? (
            <div className="text-sm text-slate-500">Profil yuklanmoqda...</div>
          ) : (
            <div className="space-y-3">
              {[
                { key: "firstName", label: "Ism", icon: <User size={15} /> },
                { key: "lastName", label: "Familiya", icon: <User size={15} /> },
                { key: "email", label: "Elektron pochta", icon: <Calendar size={15} /> },
                { key: "phoneNumber", label: "Telefon", icon: <Phone size={15} /> },
                { key: "gender", label: "Jinsi", icon: <User size={15} /> },
                { key: "companyName", label: "Kompaniya", icon: <Shield size={15} /> },
              ].map((field) => (
                <div key={field.key}>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      {field.icon}
                      {field.label}
                    </span>
                  </label>
                  {isEditing ? (
                    field.key === "companyName" ? (
                      <div className="h-11 px-3 rounded-xl bg-slate-100 border border-slate-200 flex items-center text-slate-700">
                        {profileData?.companyName ||
                          profileData?.companyId?.name ||
                          "Kiritilmagan"}
                      </div>
                    ) : field.key === "gender" ? (
                      <select
                        value={formData.gender || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, gender: e.target.value }))
                        }
                        className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                      >
                        <option value="">Tanlang</option>
                        <option value="male">Erkak</option>
                        <option value="female">Ayol</option>
                        <option value="other">Boshqa</option>
                      </select>
                    ) : (
                      <input
                        name={field.key}
                        type={field.key === "email" ? "email" : "text"}
                        value={formData[field.key] || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-300"
                      />
                    )
                  ) : (
                    <div className="h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center text-slate-800">
                      {field.key === "gender"
                        ? formData?.gender === "male"
                          ? "Erkak"
                          : formData?.gender === "female"
                          ? "Ayol"
                          : formData?.gender === "other"
                          ? "Boshqa"
                          : "Kiritilmagan"
                        : field.key === "companyName"
                        ? profileData?.companyName ||
                          profileData?.companyId?.name ||
                          "Kiritilmagan"
                        : formData[field.key] || "Kiritilmagan"}
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-2 flex justify-end gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          firstName: profileData?.firstName || "",
                          lastName: profileData?.lastName || "",
                          email: profileData?.email || "",
                          phoneNumber: profileData?.phoneNumber || "",
                          gender: profileData?.gender || "",
                        });
                      }}
                      className="px-4 h-10 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Bekor qilish
                    </button>
                    <button
                      onClick={saveProfile}
                      disabled={savingProfile}
                      className="px-4 h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-2 disabled:opacity-60"
                    >
                      <Save size={15} />
                      Saqlash
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-2"
                  >
                    <Pencil size={15} />
                    Tahrirlash
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="xl:col-span-7 bg-gradient-to-br from-white via-emerald-50/30 to-white border border-emerald-100 rounded-2xl shadow-sm p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 inline-flex items-center gap-2">
                <Shield size={20} className="text-emerald-600" />
                Qurilmalarni boshqarish
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {canManageAllUsers
                  ? "Foydalanuvchi qurilmalarini ko'ring va boshqaring"
                  : "O'z qurilmalaringizni boshqaring"}
              </p>
            </div>
            <div className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              {getRoleLabelUz(actorRole)}
            </div>
          </div>

          {canManageAllUsers && (
            <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="text-sm font-medium text-slate-700">Foydalanuvchilar</div>
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Ism yoki telefon bo'yicha qidirish"
                  className="ml-auto h-9 w-full md:w-72 px-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-auto pr-1">
                <button
                  onClick={() => setSelectedUserId("")}
                  className={`text-left rounded-xl border p-3 transition ${
                    !selectedUserId
                      ? "border-emerald-400 bg-emerald-100/70"
                      : "border-slate-200 bg-white hover:border-emerald-200"
                  }`}
                >
                  <div className="font-medium text-slate-900">Mening qurilmalarim</div>
                  <div className="text-xs text-slate-500">{getRoleLabelUz(actorRole)}</div>
                </button>
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`text-left rounded-xl border p-3 transition ${
                      String(selectedUserId) === String(u.id)
                        ? "border-emerald-400 bg-emerald-100/70"
                        : "border-slate-200 bg-white hover:border-emerald-200"
                    }`}
                  >
                    <div className="font-medium text-slate-900 truncate">{u.fullName}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {u.companyName} • {u.phoneNumber || "Telefon yo'q"}
                    </div>
                    <div className="text-xs text-emerald-700 mt-1">{getRoleLabelUz(u.role)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(deviceError || deviceSuccess) && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                deviceError
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {deviceError || deviceSuccess}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-sm text-slate-700">
              {activeUserLabel} • <span className="font-medium">{devices.length}</span> ta qurilma
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchDevices(activeUserId)}
                className="h-10 min-w-[130px] px-4 rounded-xl border border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50 hover:border-emerald-300 inline-flex items-center justify-center gap-2 font-medium transition-all"
              >
                <Users size={14} />
                Yangilash
              </button>
            </div>
          </div>

          {loadingDevices ? (
            <div className="text-sm text-slate-500 py-8 text-center">Qurilmalar yuklanmoqda...</div>
          ) : devices.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-slate-200 rounded-xl text-slate-500 bg-white">
              Qurilmalar topilmadi
            </div>
          ) : (
            <div className="space-y-3 max-h-[440px] overflow-auto pr-1">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className={`rounded-xl border p-4 flex items-start justify-between gap-3 ${
                    device.isCurrent
                      ? "border-emerald-400 bg-emerald-50 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        device.isCurrent
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {String(device.os).toLowerCase().includes("ios") ||
                      String(device.os).toLowerCase().includes("android") ? (
                        <Smartphone size={17} />
                      ) : (
                        <Monitor size={17} />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        {device.deviceName}
                        {device.isCurrent && (
                          <span className="px-2 py-0.5 text-xs rounded-md bg-emerald-600 text-white">
                            Joriy
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        Brauzer: {device.browser} | OS: {device.os}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Oxirgi faollik:{" "}
                        {formatLastActive(device.lastActive)}
                      </div>
                      {device.isBlocked && (
                        <div className="mt-1 inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-0.5">
                          <Ban size={12} />
                          Bloklangan
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isManagingOwnDevices && (
                      <button
                        onClick={() => toggleDeviceBlock(device, !device.isBlocked)}
                        disabled={blockingDeviceId === device.id}
                        className={`p-2 rounded-lg ${
                          device.isBlocked
                            ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        } disabled:opacity-50`}
                        title={device.isBlocked ? "Blokdan chiqarish" : "Bloklash"}
                      >
                        {device.isBlocked ? <Unlock size={16} /> : <Lock size={16} />}
                      </button>
                    )}
                    <button
                      onClick={() => removeDevice(device)}
                      disabled={device.isCurrent || isManagingOwnDevices}
                      className={`p-2 rounded-lg ${
                        device.isCurrent || isManagingOwnDevices
                          ? "text-slate-300 cursor-not-allowed"
                          : "text-red-500 hover:text-red-700 hover:bg-red-50"
                      }`}
                      title={
                        isManagingOwnDevices
                          ? "O'z qurilmangizni o'chira olmaysiz"
                          : device.isCurrent
                          ? "Joriy qurilmani o'chirib bo'lmaydi"
                          : "Qurilmani o'chirish"
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-4 text-xs text-slate-500 flex items-start gap-2">
        <AlertCircle size={14} className="mt-0.5" />
        <span>
          Joriy qurilmangiz o'chirilsa, xavfsizlik uchun tizimdan darhol chiqasiz.
        </span>
      </div>

      <DeleteConfirmModal
        isOpen={confirmState.open}
        onClose={() => {
          if (confirmLoading) return;
          setConfirmState({ open: false, type: "", device: null });
        }}
        onConfirm={executeConfirmedDelete}
        loading={confirmLoading}
        title={
          confirmState.type === "single"
            ? "Qurilmani o'chirish"
            : "Qurilmalarni tozalash"
        }
        message={
          confirmState.type === "single"
            ? "Ushbu qurilmani o'chirmoqchimisiz?"
            : "Tanlangan foydalanuvchi qurilmalarini tozalamoqchimisiz?"
        }
      />

      {forcedLogout && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-300 bg-white p-6 text-center shadow-2xl">
            <h3 className="text-xl font-bold text-red-600">Siz tizimdan chiqarildingiz</h3>
            <p className="mt-2 text-slate-700">
              Joriy qurilmangiz sessiyasi o'chirildi. Xavfsizlik uchun qayta login qiling.
            </p>
            <div className="mt-4 text-sm text-slate-500">Login sahifasiga yo'naltirilmoqda...</div>
          </div>
        </div>
      )}
    </div>
  );
}
