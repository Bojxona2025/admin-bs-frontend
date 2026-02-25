"use client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import $api from "../http/api";

function AuthPage() {
  const [phone_number, setPhoneNumber] = useState("+998");
  const [showSmsCard, setShowSmsCard] = useState(false);
  const [smsCode, setSmsCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ type: "", message: "" });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const inputRefs = useRef([]);
  const router = useRouter();
  const authCheckDoneRef = useRef(false);
  const interceptorsSetupRef = useRef(false);

  const normalizeRole = (role) =>
    typeof role === "string" ? role.trim().toUpperCase() : "";
  const isAdminRole = (role) => {
    const normalizedRole = normalizeRole(role);
    return normalizedRole === "ADMIN" || normalizedRole === "SUPERADMIN";
  };
  const extractProfileUser = (payload) => {
    if (!payload || typeof payload !== "object") return null;
    return payload.data || payload.myProfile || payload.user || null;
  };
  const getStoredAccessToken = () =>
    localStorage.getItem("accessToken") || localStorage.getItem("access_token");
  const setStoredAccessToken = (token) => {
    if (!token) return;
    localStorage.setItem("accessToken", token);
    localStorage.setItem("access_token", token);
  };
  const getStoredRefreshToken = () =>
    localStorage.getItem("refreshToken") || localStorage.getItem("refresh_token");
  const setStoredRefreshToken = (token) => {
    if (!token) return;
    localStorage.setItem("refreshToken", token);
    localStorage.setItem("refresh_token", token);
  };

  // ===== YORDAMCHI FUNKSIYA: Telefon raqamni to'g'ri formatda qaytarish =====
  // Bu funksiya phone_number ni +998XXXXXXXXX formatiga o'zgartiradi
  const getFormattedPhoneForBackend = (phoneNumber) => {
    // Faqat raqamlarni olamiz
    const digits = phoneNumber.replace(/[^\d]/g, "");

    // Agar 998 bilan boshlansa, oldiga + qo'shamiz
    if (digits.startsWith("998")) {
      return "+" + digits;
    }

    // Aks holda +998 qo'shib qaytaramiz
    return "+998" + digits;
  };

  useEffect(() => {
    if (!authCheckDoneRef.current) {
      checkAuthStatus();
      authCheckDoneRef.current = true;
    }
  }, []);

  const checkAuthStatus = async () => {
    setIsCheckingAuth(true);

    const accessToken =
      typeof window !== "undefined"
        ? getStoredAccessToken()
        : null;
    const storedUserRaw =
      typeof window !== "undefined" ? localStorage.getItem("user") : null;

    if (!accessToken) {
      setIsCheckingAuth(false);
      return;
    }

    if (storedUserRaw) {
      try {
        JSON.parse(storedUserRaw);
        router.push("/");
        setIsCheckingAuth(false);
        return;
      } catch {
        // fallback to API check
      }
    }

    try {
      const profileResponse = await $api.get("/users/profile/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        _skipAuthRetry: true,
      });
      const { data, status } = profileResponse;
      const profileUser = extractProfileUser(data);

      if (status === 201 && !profileUser) {
        showNotification(
          "warning",
          "Sessiya holati yangilandi. Davom etish uchun qayta ro'yxatdan o'ting."
        );
        handleLogout();
        router.push("/register");
        return;
      }

      const user = profileUser;
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
        if (isAdminRole(user?.role) && accessToken) {
          localStorage.setItem("admin_token", accessToken);
        }
        router.push("/");
      } else {
        handleLogout();
      }
    } catch (error) {
      console.error("Token verification error:", error);

      const refreshToken =
        typeof window !== "undefined"
          ? getStoredRefreshToken()
          : null;

      if (refreshToken && error.response?.status === 401) {
        try {
          await handleTokenRefresh();

          const newAccessToken = getStoredAccessToken();
          const retryResponse = await $api.get("/users/profile/me", {
            headers: {
              Authorization: `Bearer ${newAccessToken}`,
            },
            _skipAuthRetry: true,
          });
          const retriedStatus = retryResponse.status;

          const retriedUser = extractProfileUser(retryResponse.data);
          if (retriedStatus === 201 && !retriedUser) {
            showNotification(
              "warning",
              "Token muddati tugagan. Qayta ro'yxatdan o'ting."
            );
            handleLogout();
            router.push("/register");
            return;
          }
          if (retriedUser) {
            const refreshedToken = getStoredAccessToken();
            const user = retriedUser;
            localStorage.setItem("user", JSON.stringify(user));
            if (isAdminRole(user?.role) && refreshedToken) {
              localStorage.setItem("admin_token", refreshedToken);
            }
            router.push("/");
          } else {
            handleLogout();
          }
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          handleLogout();
        }
      } else {
        handleLogout();
      }
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
  };

  const formatPhoneNumber = (value) => {
    let cleaned = value.replace(/[^\d]/g, "");

    if (cleaned.startsWith("998")) {
      cleaned = cleaned.slice(3);
    }

    if (cleaned.length > 9) {
      cleaned = cleaned.slice(0, 9);
    }

    let formatted = "+998";
    if (cleaned.length > 0) {
      formatted += "-" + cleaned.slice(0, 2);
    }
    if (cleaned.length > 2) {
      formatted += "-" + cleaned.slice(2, 5);
    }
    if (cleaned.length > 5) {
      formatted += "-" + cleaned.slice(5, 7);
    }
    if (cleaned.length > 7) {
      formatted += "-" + cleaned.slice(7, 9);
    }

    return formatted;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const validatePhone = () => {
    const phoneDigits = phone_number.replace(/[^\d]/g, "").replace(/^998/, "");
    return phoneDigits.length === 9;
  };

  const handleAuthSuccess = async (authData) => {
    const refreshToken = authData?.refreshToken || authData?.refresh_token;
    const user =
      authData?.user ||
      (authData?.phone_number
        ? {
            phone_number: authData.phone_number,
            firstName: authData.firstName || "",
            lastName: authData.lastName || "",
            role: authData.role || "",
          }
        : null);
    const accessToken =
      authData?.accessToken || authData?.access_token || authData?.token;
    const adminToken = authData?.admin_token || authData?.adminToken || null;

    if (accessToken) {
      setStoredAccessToken(accessToken);
    }
    if (refreshToken) {
      setStoredRefreshToken(refreshToken);
    }
    if (isAdminRole(user?.role) && (adminToken || accessToken)) {
      localStorage.setItem("admin_token", adminToken || accessToken);
    }
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }

    setTimeout(() => {
      window.dispatchEvent(new Event("auth-changed"));
      window.dispatchEvent(new Event("storage"));
    }, 50);

    try {
      const profileResponse = await $api.get("/users/profile/me", {
        _skipAuthRetry: true,
      });
      if (profileResponse.status === 201 && !extractProfileUser(profileResponse.data)) {
        showNotification(
          "warning",
          "Sessiya muddati tugagan. Iltimos, qayta ro'yxatdan o'ting."
        );
        handleLogout();
        router.push("/register");
        return;
      }
      const freshUserData = extractProfileUser(profileResponse.data);
      if (freshUserData) {
        localStorage.setItem("user", JSON.stringify(freshUserData));
        if (isAdminRole(freshUserData?.role) && accessToken) {
          localStorage.setItem("admin_token", accessToken);
        }
        setTimeout(() => {
          window.dispatchEvent(new Event("auth-changed"));
        }, 50);
      }
    } catch (error) {
      console.error("Failed to fetch fresh user profile:", error);
    }
  };

  // ===== TO'G'IRLANDI: Login so'rovida + belgisi bilan yuborish =====
  const handleLoginRequest = async () => {
    if (!validatePhone()) {
      showNotification(
        "warning",
        "Iltimos, to'liq telefon raqam kiriting (+998-XX-XXX-XX-XX formatida)."
      );
      return;
    }

    try {
      setIsLoading(true);

      const requestData = {
        // OLDINGI: phone_number: phone_number.replace(/[^\d]/g, ""),
        // YANGI: + belgisi bilan yuborish
        phone_number: getFormattedPhoneForBackend(phone_number),
      };

      const response = await $api.post("/auth/phone", requestData);

      if (response.data.success) {
        showNotification("info", "SMS kodi yuborildi!");
        setShowSmsCard(true);
        setSmsCode(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        showNotification(
          "error",
          response.data.message ||
            "Telefon raqam topilmadi yoki xatolik yuz berdi!"
        );
      }
    } catch (error) {
      console.error("Login request error:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Server bilan bog'lanishda xatolik yuz berdi!";
      showNotification("error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== TO'G'IRLANDI: SMS tasdiqlashda + belgisi bilan yuborish =====
  const handleSmsSubmit = async () => {
    const enteredCode = smsCode.join("");

    if (enteredCode.length !== 6) {
      showNotification("warning", "Iltimos, 6 xonali kodni to'liq kiriting.");
      return;
    }

    try {
      setIsLoading(true);

      const verificationData = {
        // OLDINGI: phone_number: phone_number.replace(/[^\d]/g, ""),
        // YANGI: + belgisi bilan yuborish
        phone_number: getFormattedPhoneForBackend(phone_number),
        verify_code: enteredCode,
      };

      const response = await $api.post("/auth/verify", verificationData);

      if (response.data.success || response.status === 201) {
        let authData = response.data.data || response.data;

        if (!authData.user) {
          authData = {
            user: {
              id: authData.id || "",
              phone_number: authData.phone_number,
              firstName: authData.firstName || "",
              lastName: authData.lastName || "",
              role: authData.role || "",
            },
            accessToken: authData.accessToken,
            access_token: authData.access_token,
            refreshToken: authData.refreshToken,
            refresh_token: authData.refresh_token,
            admin_token: authData.admin_token || authData.adminToken,
          };
        }

        await handleAuthSuccess(authData);

        const message = `Tizimga muvaffaqiyatli kirdingiz, ${authData.user.firstName}!`;

        showNotification("success", message);

        setShowSmsCard(false);
        setSmsCode(["", "", "", "", "", ""]);
        setPhoneNumber("+998");

        setTimeout(() => {
          router.push("/");
        }, 100);
      } else {
        showNotification(
          "error",
          response.data.message || "SMS kodni tasdiqlashda xatolik yuz berdi!"
        );
        setSmsCode(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch (error) {
      console.error("Verification error:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Server bilan bog'lanishda xatolik yuz berdi!";
      showNotification("error", errorMessage);
      setSmsCode(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenRefresh = async () => {
    try {
      const storedRefreshToken = getStoredRefreshToken();
      if (!storedRefreshToken) {
        throw new Error("No refresh token found");
      }

      const response = await $api.post(
        "/auth/refresh/token",
        {
          refreshToken: storedRefreshToken,
          refresh_token: storedRefreshToken,
        },
        {
          headers: {
            refreshToken: storedRefreshToken,
            refresh_token: storedRefreshToken,
            Authorization: `Bearer ${storedRefreshToken}`,
          },
          _skipAuthRetry: true,
        }
      );

      if (response.data.success || response.data.status === 200) {
        const responseData = response.data.data || response.data;
        const accessToken =
          responseData?.accessToken ||
          responseData?.access_token ||
          responseData?.token;
        const newRefreshToken =
          responseData?.refreshToken || responseData?.refresh_token;

        setStoredAccessToken(accessToken);
        if (newRefreshToken) {
          setStoredRefreshToken(newRefreshToken);
        }
        return accessToken;
      } else {
        throw new Error("Failed to refresh token");
      }
    } catch (error) {
      console.error("Token refresh error:", error);
      throw error;
    }
  };

  const handleSmsChange = (index, value) => {
    if (/^[0-9]?$/.test(value)) {
      const newCode = [...smsCode];
      newCode[index] = value;
      setSmsCode(newCode);
      if (value && index < 5) {
        setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
      }
    }
  };

  const handleSmsKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (smsCode[index]) {
        const newCode = [...smsCode];
        newCode[index] = "";
        setSmsCode(newCode);
      } else if (index > 0) {
        const newCode = [...smsCode];
        newCode[index - 1] = "";
        setSmsCode(newCode);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "Enter") {
      if (smsCode.every((d) => d !== "")) {
        handleSmsSubmit();
      }
    }
  };

  const handleCloseSmsCard = () => {
    setShowSmsCard(false);
    setSmsCode(["", "", "", "", "", ""]);
  };

  const handleKeyPress = (e, action) => {
    if (e.key === "Enter") {
      action();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("user");
    setPhoneNumber("+998");
    setShowSmsCard(false);
    setSmsCode(["", "", "", "", "", ""]);
    setNotification({ type: "", message: "" });
  };

  useEffect(() => {
    if (interceptorsSetupRef.current) {
      return;
    }

    interceptorsSetupRef.current = true;

    const requestInterceptor = $api.interceptors.request.use(
      (config) => {
        if (config._skipAuthRetry) {
          return config;
        }

        const token = getStoredAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    const responseInterceptor = $api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const original = error.config;

        if (
          original._retry ||
          original._skipAuthRetry ||
          error.response?.status !== 401
        ) {
          return Promise.reject(error);
        }

        original._retry = true;

        try {
          const newToken = await handleTokenRefresh();
          if (newToken) {
            original.headers.Authorization = `Bearer ${newToken}`;
            return $api(original);
          }
        } catch (refreshError) {
          console.error("Token refresh failed in interceptor:", refreshError);
          return Promise.reject(error);
        }

        return Promise.reject(error);
      }
    );

    return () => {
      $api.interceptors.request.eject(requestInterceptor);
      $api.interceptors.response.eject(responseInterceptor);
      interceptorsSetupRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (notification.message) {
      const timer = setTimeout(() => {
        setNotification({ type: "", message: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-green-50 to-green-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 via-green-50 to-green-50 relative overflow-hidden">
      {notification.message && (
        <div
          className={`fixed top-4 right-4 max-w-md p-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
            notification.type === "success"
              ? "bg-green-500 text-white"
              : notification.type === "error"
              ? "bg-red-500 text-white"
              : notification.type === "warning"
              ? "bg-yellow-500 text-white"
              : "bg-green-500 text-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification({ type: "", message: "" })}
              className="ml-2 text-white hover:text-gray-200 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {!showSmsCard && (
        <div className="relative max-w-md w-full bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
          <h1 className="text-center py-4 text-4xl font-extrabold text-[#249B73]">
            BARAKA SAVDO
          </h1>
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Xush kelibsiz!
              </h2>
              <p className="text-gray-600 text-sm">
                Telefon raqamingizni kiriting, sizga SMS kod yuboramiz
              </p>
            </div>

            <div className="relative">
              <input
                type="tel"
                placeholder="+998-90-123-45-67"
                value={phone_number}
                onChange={handlePhoneChange}
                onKeyPress={(e) => handleKeyPress(e, handleLoginRequest)}
                className="w-full px-4 py-3 border border-gray-300 outline-none rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                📱
              </div>
            </div>

            <button
              onClick={handleLoginRequest}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#249B73] cursor-pointer to-[#249B73] text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  SMS yuborilmoqda...
                </div>
              ) : (
                "SMS Kodi Olish"
              )}
            </button>
          </div>
        </div>
      )}

      {showSmsCard && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"></div>
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 z-40 mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                SMS Kodni Kiriting
              </h3>
              <button
                onClick={handleCloseSmsCard}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-center mb-6">
              <p className="text-gray-600 text-sm">
                {phone_number} raqamiga yuborilgan 6 xonali kodni kiriting
              </p>
            </div>

            <div className="flex justify-center space-x-2 mb-6">
              {smsCode.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleSmsChange(index, e.target.value)}
                  onKeyDown={(e) => handleSmsKeyDown(e, index)}
                  ref={(el) => (inputRefs.current[index] = el)}
                  className="w-12 h-14 outline-none border-2 border-gray-300 rounded-xl text-center text-xl font-bold focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                />
              ))}
            </div>

            <button
              onClick={handleSmsSubmit}
              disabled={isLoading || smsCode.some((d) => d === "")}
              className="w-full cursor-pointer bg-gradient-to-r from-[#249B73] to-[#249B73] text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Tekshirilmoqda...
                </div>
              ) : (
                "Tasdiqlash"
              )}
            </button>

            <div className="mt-4 text-center">
              <p className="text-gray-500 text-sm">
                Kod noto'g'ri bo'lsa, qaytadan kiriting
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AuthPage;
