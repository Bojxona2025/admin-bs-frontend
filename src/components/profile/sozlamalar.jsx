import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Lock,
  Globe,
  Bell,
  Palette,
  Save,
  AlertCircle,
} from "lucide-react";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState({
    language: "uz",
    theme: "light",
    notifications: {
      email: true,
      push: true,
      sms: false,
    },
    password: {
      current: "",
      new: "",
      confirm: "",
    },
  });

  const [activeTab, setActiveTab] = useState("notifications");

  // Sozlamalarni saqlash
  const saveSettings = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("access_token");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL}/users/update/me`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            settings: {
              language: settings.language,
              theme: settings.theme,
              notifications: settings.notifications,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Sozlamalarni saqlashda xatolik");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Parolni o'zgartirish
  const changePassword = async () => {
    if (settings.password.new !== settings.password.confirm) {
      setError("Yangi parollar mos kelmadi");
      return;
    }

    if (settings.password.new.length < 6) {
      setError("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("access_token");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL}/users/update/my/password`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            oldPassword: settings.password.current,
            newPassword: settings.password.new,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Parolni o'zgartirishda xatolik");
      }

      setSettings((prev) => ({
        ...prev,
        password: { current: "", new: "", confirm: "" },
      }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleNotificationChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }));
  };

  const handlePasswordChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      password: {
        ...prev.password,
        [key]: value,
      },
    }));
  };

  const handleGoBack = () => {
    navigate(-1); // Oldingi sahifaga qaytaradi
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleGoBack}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-2xl font-semibold text-gray-800">
                Sozlamalar
              </h1>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
            
              <button
                onClick={() => setActiveTab("notifications")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "notifications"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Bell size={16} className="inline mr-2" />
                Bildirishnomalar
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "security"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Lock size={16} className="inline mr-2" />
                Xavfsizlik
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle size={16} className="text-red-500" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-green-700 text-sm">
                  {activeTab === "security"
                    ? "Parol muvaffaqiyatli o'zgartirildi!"
                    : "Sozlamalar saqlandi!"}
                </span>
              </div>
            )}

          

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg space-y-6">
                  <div className="flex items-center justify-between py-4 border-b border-gray-200">
                    <div>
                      <label className="text-base font-medium text-gray-700">
                        Email bildirishnomalar
                      </label>
                      <p className="text-sm text-gray-500 mt-1">
                        Emailga bildirishnomalar yuborish
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.email}
                        onChange={(e) =>
                          handleNotificationChange("email", e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-4 border-b border-gray-200">
                    <div>
                      <label className="text-base font-medium text-gray-700">
                        Push bildirishnomalar
                      </label>
                      <p className="text-sm text-gray-500 mt-1">
                        Brauzerda bildirishnomalar ko'rsatish
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.push}
                        onChange={(e) =>
                          handleNotificationChange("push", e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <div>
                      <label className="text-base font-medium text-gray-700">
                        SMS bildirishnomalar
                      </label>
                      <p className="text-sm text-gray-500 mt-1">
                        Telefonga SMS yuborish
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.sms}
                        onChange={(e) =>
                          handleNotificationChange("sms", e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">
                    Parolni o'zgartirish
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Joriy parol
                      </label>
                      <input
                        type="password"
                        value={settings.password.current}
                        onChange={(e) =>
                          handlePasswordChange("current", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Yangi parol
                      </label>
                      <input
                        type="password"
                        value={settings.password.new}
                        onChange={(e) =>
                          handlePasswordChange("new", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Yangi parolni tasdiqlang
                      </label>
                      <input
                        type="password"
                        value={settings.password.confirm}
                        onChange={(e) =>
                          handlePasswordChange("confirm", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <button
                      onClick={changePassword}
                      disabled={
                        loading ||
                        !settings.password.current ||
                        !settings.password.new ||
                        !settings.password.confirm
                      }
                      className="w-full py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {loading ? "Yuklanmoqda..." : "Parolni o'zgartirish"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer - faqat general va notifications tab uchun */}
          {activeTab !== "security" && (
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={saveSettings}
                disabled={loading}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2 font-medium"
              >
                <Save size={16} />
                <span>{loading ? "Yuklanmoqda..." : "Saqlash"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
