"use client";
import { User, ShoppingBag, Heart, Bell, LogOut, Camera } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import ProfileTab from "./info/ProfileTab";
import Orders from "./info/Orders";
import Favorites from "./info/Favorites";
import Notifications from "./info/Notifications";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useHomeLikes } from "../components/hooks/likes";
import $api from "../http/api";
import { useTranslation } from "react-i18next";

const getStoredAccessToken = () =>
  localStorage.getItem("accessToken") || localStorage.getItem("access_token");

const ProfileClient = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef(null);
  const { likes } = useHomeLikes();

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getStoredAccessToken();
      if (!token) {
        throw new Error("Token mavjud emas");
      }

      const response = await $api.get("/users/profile/me");

      if (response.data.status === 200) {
        const profileData = response.data.myProfile;

        const formattedUser = {
          id: profileData._id,
          name:
            profileData.firstName && profileData.lastName
              ? `${profileData.firstName} ${profileData.lastName}`.trim()
              : profileData.firstName ||
                profileData.lastName ||
                "Foydalanuvchi",
          phone: profileData.phoneNumber || "",
          email: profileData.email || "",
          avatar: profileData.avatar
            ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}${
                profileData.avatar
              }`
            : null,
          firstName: profileData.firstName || "",
          lastName: profileData.lastName || "",
          gender: profileData.gender || "",
          age: profileData.age || null,
          interests: profileData.interests || [],
          isWorker: profileData.isWorker || false,
          role: profileData.role || "client",
          isOnline: profileData.isOnline || false,
          lastLogin: profileData.lastLogin || null,
          lastActivity: profileData.last_activity || null,
          telegramId: profileData.telegramId || null,
          tokenVersion: profileData.tokenVersion || 0,
          memberSince: profileData.createdAt
            ? new Date(profileData.createdAt).toLocaleDateString("uz-UZ")
            : new Date().toLocaleDateString("uz-UZ"),
          createdAt: profileData.createdAt || new Date().toISOString(),
          step: profileData.step || 0,
          __v: profileData.__v || 0,
        };

        setUser(formattedUser);
        localStorage.setItem("user", JSON.stringify(formattedUser));
      } else {
        throw new Error("Profile ma'lumotlarini olishda xatolik");
      }
    } catch (error) {
      console.error("Profile yuklashda xatolik:", error);
      setError(error.message || "Profile yuklashda xatolik yuz berdi");

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setError(null);
        } catch (parseError) {
          console.error("localStorage parse xatolik:", parseError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (updatedData) => {
    try {
      const token = getStoredAccessToken();
      if (!token) {
        throw new Error("Token mavjud emas");
      }

      const changedFields = {};

      if (updatedData.firstName !== user.firstName) {
        changedFields.firstName = updatedData.firstName;
      }
      if (updatedData.lastName !== user.lastName) {
        changedFields.lastName = updatedData.lastName;
      }
      if (updatedData.email !== user.email) {
        changedFields.email = updatedData.email;
      }
      if (updatedData.phone !== user.phone) {
        changedFields.phoneNumber = updatedData.phone;
      }
      if ((updatedData.gender || "") !== (user.gender || "")) {
        changedFields.gender = updatedData.gender || "";
      }

      if (Object.keys(changedFields).length === 0) {
        return true;
      }

      const response = await $api.patch("/users/update/me", changedFields);

      if (response.data.status === 200 || response.status === 200) {
        await fetchUserProfile();
        return true;
      } else {
        throw new Error("Profile yangilashda xatolik");
      }
    } catch (error) {
      console.error("Profile yangilashda xatolik:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchUserProfile();
    }
  }, [mounted]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError("Fayl hajmi 15MB dan oshmasligi kerak");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Faqat rasm fayllari qabul qilinadi");
      return;
    }

    try {
      const token = getStoredAccessToken();
      if (!token) {
        throw new Error("Token mavjud emas");
      }

      const formData = new FormData();
      formData.append("avatar", file);

      const response = await $api.patch("/users/update/me", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.status === 200 || response.status === 200) {
        await fetchUserProfile();
        setError(null);
      }
    } catch (error) {
      console.error("Avatar yuklashda xatolik:", error);
      setError("Avatar yuklashda xatolik yuz berdi");
    }
  };

  const handleLogout = async () => {
    try {
      const token = getStoredAccessToken();
      if (token) {
        await $api.post("/auth/logout");
      }
    } catch (error) {
      console.error("Logout xatolik:", error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      localStorage.removeItem("avatar");
      window.location.href = "/register";
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#249B73] mx-auto mb-4"></div>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: "profile", icon: User, label: t("profile.personal"), count: null },
    {
      id: "orders",
      icon: ShoppingBag,
      label: t("profile.orders"),
      count: null,
    },
    {
      id: "favorites",
      icon: Heart,
      label: t("profile.favorites"),
      count: likes.length,
    },
    {
      id: "notifications",
      icon: Bell,
      label: t("profile.notifications"),
      count: null,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#249B73] mx-auto mb-4"></div>
          <p className="text-gray-600">{t("profile.loading")}</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{t("profile.error")}</p>
          <button
            onClick={fetchUserProfile}
            className="px-4 cursor-pointer py-2 bg-[#249B73] text-white rounded-lg hover:bg-[#1e7f5f]"
          >
            {t("profile.retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">{t("profile.notFound")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-[#249B73] to-[#249B73] text-white">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        loading="lazy"
                        decoding="async"
                        className="w-30 h-20 rounded-full border-3 border-white object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full border-3 border-white bg-green-600 flex items-center justify-center">
                        <Camera size={40} className="text-white" />
                      </div>
                    )}
                    <button
                      className="absolute -bottom-1 cursor-pointer -right-1 w-8 h-8 bg-white text-[#249B73] rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
                      onClick={() => fileInputRef.current.click()}
                      title="Rasm yuklash"
                    >
                      <Camera size={16} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{user.name}</h3>
                    {user.phone && (
                      <p className="text-green-200 text-sm">{user.phone}</p>
                    )}
                    {user.isOnline && (
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                        <span className="text-green-200 text-xs">
                          {t("profile.online")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold">
                      {user.role === "admin"
                        ? t("profile.admin")
                        : user.isWorker
                        ? t("profile.worker")
                        : t("profile.client")}
                    </div>
                    <div className="text-green-200 text-xs">
                      {t("profile.role")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">
                      {user.interests?.length || 0}
                    </div>
                    <div className="text-green-200 text-xs">
                      {t("profile.interests")}
                    </div>
                  </div>
                </div> */}
              </div>

              <div className="p-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full cursor-pointer flex items-center justify-between p-3 rounded-lg ${
                      activeTab === item.id
                        ? "bg-green-50 text-[#249B73] border-r-2 border-[#249B73]"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={18} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    {item.count > 0 && (
                      <span className="bg-green-100 text-[#249B73] text-xs px-2 py-1 rounded-full">
                        {item.count}
                      </span>
                    )}
                  </button>
                ))}

                <button
                  onClick={handleLogout}
                  className="w-full flex cursor-pointer items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-lg mt-2"
                >
                  <LogOut size={18} />
                  <span className="text-sm font-medium">
                    {t("profile.logout")}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {activeTab === "profile" && (
              <ProfileTab
                user={user}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                setUser={setUser}
                updateUserProfile={updateUserProfile}
                refreshProfile={fetchUserProfile}
              />
            )}
            {activeTab === "orders" && <Orders />}
            {activeTab === "favorites" && <Favorites />}
            {activeTab === "notifications" && <Notifications />}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProfileClient;
