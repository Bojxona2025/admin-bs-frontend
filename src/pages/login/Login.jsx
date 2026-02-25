import axios from "axios";
import Logo from "../../assets/Logo.png";
import { useNavigate } from "react-router-dom";
import React, { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { clearSessionLock, getSessionLock } from "../../utils/sessionLock";

const DEVICE_ID_KEY = "stable_device_id";
const getStableDeviceId = () => {
  try {
    const existing =
      localStorage.getItem(DEVICE_ID_KEY) ||
      localStorage.getItem("device_id") ||
      localStorage.getItem("current_device_id") ||
      "";
    if (existing) return existing;
    const generated = `web-${Math.random().toString(36).slice(2, 12)}-${Date.now()
      .toString(36)
      .slice(-6)}`;
    localStorage.setItem(DEVICE_ID_KEY, generated);
    localStorage.setItem("device_id", generated);
    localStorage.setItem("current_device_id", generated);
    localStorage.setItem("currentDeviceId", generated);
    return generated;
  } catch {
    return `web-${Date.now()}`;
  }
};

export default function SkladLogin() {
  const API_BASE =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BASE_URL ||
    "http://localhost:5342/api";
  const navigate = useNavigate();
  const normalizeRole = (role) =>
    String(role || "").toLowerCase().replace(/[_\s]/g, "");
  const getRoleFromToken = (token) => {
    try {
      const parts = String(token || "").split(".");
      if (parts.length < 2) return "";
      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
      );
      return normalizeRole(
        payload?.role || payload?.userRole || payload?.user?.role || ""
      );
    } catch {
      return "";
    }
  };

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    login: "+998",
    password: "",
  });

  // ✅ Bitta joyda hamma xato: field + umumiy
  const [errors, setErrors] = useState({
    login: "",
    password: "",
    general: "",
  });
  const [lockLeftMs, setLockLeftMs] = useState(0);

  const formatLock = (ms) => {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, "0")}`;
  };

  // Agar token mavjud bo'lsa, bosh sahifaga yo'naltirish
  useEffect(() => {
    const lock = getSessionLock();
    if (lock.locked) {
      setLockLeftMs(lock.remainingMs);
      return;
    }
    const token =
      localStorage.getItem("accessToken") ||
      localStorage.getItem("access_token");
    if (token) {
      navigate("/indicators/general", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const syncLock = () => {
      const lock = getSessionLock();
      setLockLeftMs(lock.locked ? lock.remainingMs : 0);
      if (!lock.locked) {
        clearSessionLock();
      }
    };
    syncLock();
    const timer = setInterval(syncLock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Uzbekistan phone number validation
  const validateUzbekPhone = (phone) => {
    if (!phone || typeof phone !== "string") {
      return { isValid: false, message: "" };
    }

    const cleanPhone = phone.replace(/\D/g, "");

    const validPrefixes = [
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

    if (cleanPhone.length === 0) return { isValid: false, message: "" };

    if (cleanPhone.length < 12) {
      return { isValid: false, message: "Telefon raqam to'liq emas" };
    }

    if (cleanPhone.length > 12) {
      return { isValid: false, message: "Telefon raqam juda uzun" };
    }

    if (!cleanPhone.startsWith("998")) {
      return {
        isValid: false,
        message: "Faqat O'zbekiston raqamlari qabul qilinadi (+998)",
      };
    }

    const prefix = cleanPhone.substring(0, 5);
    if (!validPrefixes.includes(prefix)) {
      return { isValid: false, message: "Noto'g'ri operator kodi" };
    }

    return { isValid: true, message: "" };
  };

  // Format phone number for display: +998 90 123 45 67
  const formatPhoneNumber = (phone) => {
    const cleanPhone = (phone || "").replace(/\D/g, "");
    if (cleanPhone.length === 0) return "+998";

    let formatted = cleanPhone;

    // Agar user 90... deb yozsa, boshiga 998 qo'shamiz
    if (!formatted.startsWith("998")) {
      if (formatted.length <= 9) formatted = "998" + formatted;
    }

    let result = "";
    if (formatted.length > 0) result = "+" + formatted.substring(0, 3);
    if (formatted.length > 3) result += " " + formatted.substring(3, 5);
    if (formatted.length > 5) result += " " + formatted.substring(5, 8);
    if (formatted.length > 8) result += " " + formatted.substring(8, 10);
    if (formatted.length > 10) result += " " + formatted.substring(10, 12);

    return result;
  };

  const clearFieldError = (field) => {
    setErrors((prev) => ({ ...prev, [field]: "", general: "" }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // ✅ yozayotgan paytda o'sha field errorini tozalaymiz
    clearFieldError(name);

    if (name === "login") {
      const formattedValue = formatPhoneNumber(value);

      setFormData((prev) => ({ ...prev, login: formattedValue }));

      const validation = validateUzbekPhone(formattedValue);
      setErrors((prev) => ({ ...prev, login: validation.message }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isPhoneValid = useMemo(
    () => validateUzbekPhone(formData.login).isValid,
    [formData.login]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (lockLeftMs > 0) {
      setErrors((prev) => ({
        ...prev,
        general: `Sessiya bloklangan. Qayta kirish uchun ${formatLock(lockLeftMs)} kuting`,
      }));
      return;
    }

    // ✅ oldindan errorlarni tozalash
    setErrors({ login: "", password: "", general: "" });

    // Final validation
    const phoneValidation = validateUzbekPhone(formData.login);
    if (!phoneValidation.isValid) {
      setErrors((prev) => ({
        ...prev,
        login: phoneValidation.message || "Telefon raqamni to'g'ri kiriting",
      }));
      return;
    }

    if (!formData.password.trim()) {
      setErrors((prev) => ({ ...prev, password: "Parolni kiriting" }));
      return;
    }

    setLoading(true);

    try {
      const stableDeviceId = getStableDeviceId();
      const payload = {
        phone_number: `+${formData.login.replace(/\D/g, "").trim()}`,
        password: formData.password,
        deviceId: stableDeviceId,
      };

      const { data } = await axios.post(
        `${API_BASE}/auth/system/login`,
        payload,
        {
          withCredentials: true,
          headers: {
            "x-device-id": stableDeviceId,
            "x-platform": "web",
          },
        }
      );

      const issuedToken = data?.accessToken || data?.access_token || data?.token || "";
      if (data?.status === 200 && issuedToken) {
        localStorage.setItem("accessToken", issuedToken);
        localStorage.setItem("access_token", issuedToken);
        const roleFromBody = normalizeRole(
          data?.user?.role || data?.myProfile?.role || data?.profile?.role || ""
        );
        const role = roleFromBody || getRoleFromToken(issuedToken);
        if (role) {
          localStorage.setItem("user_role", role);
        }
        const cachedProfile = data?.user || data?.myProfile || data?.profile;
        if (cachedProfile) {
          localStorage.setItem("user_profile_cache", JSON.stringify(cachedProfile));
        }
        try {
          let profileResponse;
          try {
            profileResponse = await axios.get(
                `${API_BASE}/users/my/profile`,
                {
                  headers: { Authorization: `Bearer ${issuedToken}` },
                  withCredentials: true,
                }
              );
          } catch (primaryError) {
            if (primaryError?.response?.status === 404) {
              profileResponse = await axios.get(
                `${API_BASE}/users/profile/me`,
                {
                  headers: { Authorization: `Bearer ${issuedToken}` },
                  withCredentials: true,
                }
              );
            } else {
              throw primaryError;
            }
          }
          const liveProfile =
            profileResponse?.data?.myProfile ||
            profileResponse?.data?.profile ||
            profileResponse?.data?.user ||
            null;
          if (liveProfile) {
            localStorage.setItem("user_profile_cache", JSON.stringify(liveProfile));
            const liveRole = normalizeRole(liveProfile?.role);
            if (liveRole) localStorage.setItem("user_role", liveRole);
          }
        } catch (_) {
          // Profil keyin Router ichida ham olinadi.
        }

        window.location.replace("/indicators/general");
        return;
      }

      // Server "status 200" bermasa ham noto'g'ri credential deb ko'rsatamiz
      setErrors((prev) => ({
        ...prev,
        password: "Login yoki parol noto'g'ri",
      }));
    } catch (error) {
      const status = error.response?.status;
      const serverMsg =
        error.response?.data?.message ||
        error.response?.data?.msg ||
        error.message;

      // Dev’da console ko'rsatamiz, prod’da shart emas
      if (import.meta.env.DEV) {
        console.error("Login error:", error);
      }

      if (status === 401) {
        setErrors((prev) => ({
          ...prev,
          password: "Login yoki parol noto'g'ri",
        }));
      } else if (status === 429) {
        setErrors((prev) => ({
          ...prev,
          general: "Juda ko'p urinish. Biroz kutib turing",
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          general: serverMsg || "Serverda xatolik yuz berdi. Qaytadan urining",
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const hasPhoneError = Boolean(errors.login && formData.login?.length > 0);
  const hasPasswordError = Boolean(errors.password);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left side - Login form */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Kirish</h1>

          {/* ✅ Umumiy xato */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone */}
            <div>
              <div className="relative">
                <input
                  type="text"
                  name="login"
                  placeholder="Telefon raqam (+998 XX XXX XX XX)"
                  value={formData.login}
                  autoComplete="off"
                  onChange={handleInputChange}
                  disabled={loading}
                  className={`w-full px-4 py-3 border rounded-[3px] outline-none transition-all duration-200 focus:ring-2 ${
                    hasPhoneError
                      ? "border-red-400 focus:border-red-500 focus:ring-red-200 bg-red-50"
                      : formData.login.length > 0 && isPhoneValid
                      ? "border-green-400 focus:border-green-500 focus:ring-green-200 bg-green-50"
                      : "border-gray-300 focus:border-green-500 focus:ring-green-200 bg-white"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                />

                {formData.login.length > 0 && isPhoneValid && !hasPhoneError && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* ✅ Input tagida error */}
              {hasPhoneError ? (
                <div className="mt-2 text-sm text-red-600 flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {errors.login}
                </div>
              ) : (
                <div className="mt-2 text-sm text-gray-500">
                  Masalan: +998 90 123 45 67
                </div>
              )}
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Parol"
                autoComplete="off"
                value={formData.password}
                onChange={handleInputChange}
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-[3px] outline-none pr-12 transition-all duration-200 focus:ring-2 ${
                  hasPasswordError
                    ? "border-red-400 focus:border-red-500 focus:ring-red-200 bg-red-50"
                    : "border-gray-300 focus:border-green-500 focus:ring-green-200 bg-white"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              />

              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                disabled={loading}
                className="absolute cursor-pointer right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* ✅ Password error tagida */}
            {hasPasswordError && (
              <div className="-mt-3 text-sm text-red-600 flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {errors.password}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={
                  !isPhoneValid || !formData.password.trim() || loading || lockLeftMs > 0
                }
                className={`flex-1 py-3 px-6 rounded-[3px] font-medium transition-all duration-200 ${
                  isPhoneValid && formData.password.trim() && !loading && lockLeftMs <= 0
                    ? "bg-[#2db789] text-white hover:bg-[#5885a0] shadow-md hover:shadow-lg cursor-pointer"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {loading
                  ? "Yuklanmoqda..."
                  : lockLeftMs > 0
                  ? `Bloklangan (${formatLock(lockLeftMs)})`
                  : "Tizimga kirish"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right side - Promotional banner */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br bg-[#249B73] items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="bg-white rounded-[3px] p-8 shadow-xl">
            <div className="flex items-center justify-center mb-6">
              <span className="text-3xl font-[700] text-[#249B73]">
                Bojxona-servis
              </span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Davlat daromadiga o'tkazilgan mol-mulkni sotish tizimi
            </h2>

            <div className="mb-6 flex justify-center">
              <img src={Logo} alt="Bojxona-servis" width={170} />
            </div>

            <a
              target="_blank"
              rel="noreferrer"
              href="https://bojxonaservis.uz"
              className="inline-block bg-[#249B73] cursor-pointer text-white px-6 py-3 font-medium hover:bg-[#3abc91] transition-colors"
            >
              Rasmiy saytga o'tish
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
