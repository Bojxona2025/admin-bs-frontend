import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  AlertCircle,
} from "lucide-react";
import $api from "../../http/api";
import { clearSessionLock } from "../../utils/sessionLock";
const normalizeRole = (role) => String(role || "").toLowerCase().replace(/[_\s]/g, "");

const PasswordField = ({ label, value, onChange, visible, onToggle }) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-11 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  </label>
);

export default function SettingsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [profileRole, setProfileRole] = useState(
    normalizeRole(localStorage.getItem("user_role") || localStorage.getItem("role") || "")
  );
  const [password, setPassword] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [showPass, setShowPass] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const clearAlerts = () => {
    setError("");
    setSuccess("");
  };
  const canChangeOwnPassword = profileRole === "superadmin";

  const loadProfile = async () => {
    setLoading(true);
    clearAlerts();

    try {
      const { data } = await $api.get("/users/profile/me");
      const profileData = data?.myProfile || data?.profile || data?.user || data?.data || data;

      const roleFromProfile = normalizeRole(profileData?.role || profileData?.user?.role || "");
      if (roleFromProfile) {
        setProfileRole(roleFromProfile);
        localStorage.setItem("user_role", roleFromProfile);
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Sozlamalarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (!loading && profileRole && profileRole !== "superadmin") {
      navigate("/indicators/general", { replace: true });
    }
  }, [loading, profileRole, navigate]);

  useEffect(() => {
    if (!success && !error) return;
    const t = setTimeout(() => {
      setSuccess("");
      setError("");
    }, 3000);
    return () => clearTimeout(t);
  }, [success, error]);

  const passwordValidationMessage = useMemo(() => {
    if (!password.current && !password.next && !password.confirm) return "";
    if (!password.current || !password.next || !password.confirm) {
      return "Barcha parol maydonlarini to'ldiring";
    }
    if (password.next.length < 6 || password.next.length > 15) {
      return "Yangi parol 6-15 ta belgidan iborat bo'lishi kerak";
    }
    if (password.next !== password.confirm) {
      return "Yangi parol va tasdiq paroli mos emas";
    }
    return "";
  }, [password]);

  const changePassword = async () => {
    clearAlerts();
    if (!canChangeOwnPassword) {
      setError("Parolni faqat superadmin yangilashi mumkin");
      return;
    }
    if (passwordValidationMessage) {
      setError(passwordValidationMessage);
      return;
    }

    setSaving(true);
    try {
      await $api.patch("/users/update/my/password", {
        oldPassword: password.current,
        newPassword: password.next,
      });
      clearSessionLock();
      localStorage.removeItem("accessToken");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("token");
      localStorage.removeItem("user_profile_cache");
      localStorage.removeItem("user_role");
      localStorage.removeItem("role");
      localStorage.removeItem("userRole");
      localStorage.setItem(
        "auth_logout_reason",
        "Parol yangilandi. Iltimos, yangi parol bilan qayta tizimga kiring."
      );
      window.location.replace("/login");
      return;
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.msg || "Parolni yangilashda xatolik");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-3 sm:p-5 lg:p-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-emerald-50 via-white to-slate-50 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Sozlamalar</h1>
                  <p className="text-sm text-slate-500">Parol boshqaruvi</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 p-4 sm:p-6">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 size={16} />
                <span>{success}</span>
              </div>
            )}

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                Sozlamalar yuklanmoqda...
              </div>
            ) : canChangeOwnPassword ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2 text-slate-800">
                  <KeyRound size={18} className="text-emerald-600" />
                  <h2 className="text-base font-semibold">Parolni yangilash</h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <PasswordField
                      label="Joriy parol"
                      value={password.current}
                      onChange={(value) => setPassword((prev) => ({ ...prev, current: value }))}
                      visible={showPass.current}
                      onToggle={() => setShowPass((prev) => ({ ...prev, current: !prev.current }))}
                    />
                  </div>

                  <PasswordField
                    label="Yangi parol"
                    value={password.next}
                    onChange={(value) => setPassword((prev) => ({ ...prev, next: value }))}
                    visible={showPass.next}
                    onToggle={() => setShowPass((prev) => ({ ...prev, next: !prev.next }))}
                  />

                  <PasswordField
                    label="Yangi parolni tasdiqlang"
                    value={password.confirm}
                    onChange={(value) => setPassword((prev) => ({ ...prev, confirm: value }))}
                    visible={showPass.confirm}
                    onToggle={() => setShowPass((prev) => ({ ...prev, confirm: !prev.confirm }))}
                  />
                </div>

                {passwordValidationMessage && (
                  <p className="mt-3 text-xs text-amber-700">{passwordValidationMessage}</p>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={changePassword}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Lock size={16} />
                    {saving ? "Yangilanmoqda..." : "Parolni yangilash"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
                Parolni yangilash faqat superadmin uchun ruxsat etilgan.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
