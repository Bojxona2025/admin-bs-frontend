import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Filter,
  MoreVertical,
  Image,
  Calendar,
  MapPin,
  BarChart3,
  Settings,
  Download,
  Upload,
  X,
  Save,
  AlertCircle,
  Monitor,
  Smartphone,
} from "lucide-react";
import $api from "../../http/api";
import DeleteModal from "../../components/modals/delete/DeleteModal";
import { DeleteConfirmModal } from "../../components/modals/delete_confirm/DeleteConfirmModal";
import { toAssetUrl } from "../../utils/imageUrl";

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("uz-UZ");
};
const normalizeRole = (role) => String(role || "").toLowerCase().replace(/[_\s]/g, "");
const getBannerImageUrl = (banner, type = "desktop") => {
  if (!banner) return "";
  const desktopPath = banner.desktop_image_url || banner.image_url || "";
  const mobilePath = banner.mobile_image_url || banner.image_url || "";
  return toAssetUrl(type === "mobile" ? mobilePath : desktopPath);
};

const BannerAdminPanel = () => {
  const { user } = useSelector((state) => state.user);
  const [error, setError] = useState("");
  const [banners, setBanners] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteData, setDeleteData] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedBanners, setSelectedBanners] = useState([]);
  const [filterPosition, setFilterPosition] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filteredBanners, setFilteredBanners] = useState(banners);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  
  const [previewBanner, setPreviewBanner] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState("desktop"); 

  useEffect(() => {
    fetchBanners(filterPosition);
  }, [filterPosition]);

  useEffect(() => {
    if (showCreateModal) {
      fetchCompanies();
    }
  }, [showCreateModal]);

  async function fetchBanners(position = "all") {
    try {
      const { data } = await $api.get("/banners/all", {
        params: {
          page: 1,
          limit: 100,
          ...(position !== "all" ? { position } : {}),
        },
      });
      setBanners(data?.data || data?.banners || []);
    } catch (error) {
      console.log(error);
      setBanners([]);
    }
  }

  const [formData, setFormData] = useState({
    desktopImage: null,
    desktopPreview: "",
    mobileImage: null,
    mobilePreview: "",
    position: "header",
  });

  const positions = [
    {
      value: "header",
      label: "Header",
      color: "bg-emerald-50 text-emerald-700 border border-emerald-100",
      icon: "🏠",
    },
    {
      value: "mid_header",
      label: "Mid Header",
      color: "bg-teal-50 text-teal-700 border border-teal-100",
      icon: "📍",
    },
    {
      value: "footer_header",
      label: "Footer Header",
      color: "bg-slate-100 text-slate-700 border border-slate-200",
      icon: "⬇️",
    },
    {
      value: "other",
      label: "Other",
      color: "bg-emerald-50 text-emerald-700 border border-emerald-100",
      icon: "📋",
    },
  ];

  const getPositionInfo = (position) => {
    return positions.find((p) => p.value === position) || positions[0];
  };

  const handlePreview = (banner) => {
    setPreviewBanner(banner);
    setPreviewDevice("desktop");
    setShowPreviewModal(true);
  };

  const handleImagePreview = (banner, device = "desktop") => {
    setPreviewBanner(banner);
    setPreviewDevice(device);
    setShowPreviewModal(true);
  };

  useEffect(() => {
    let filtered = banners;

    if (searchTerm) {
      filtered = filtered.filter(
        (banner) =>
          banner.image_url.toLowerCase().includes(searchTerm.toLowerCase()) ||
          banner.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterPosition !== "all") {
      filtered = filtered.filter(
        (banner) => banner.position === filterPosition
      );
    }

    setFilteredBanners(filtered);
  }, [banners, searchTerm, filterPosition]);

  const handleSubmit = async () => {
    const role = normalizeRole(user?.role);
    const isSuperAdmin = role === "superadmin";
    const companyId =
      selectedCompanyId ||
      user?.companyId?._id ||
      user?.companyId ||
      localStorage.getItem("companyId");

    if (isSuperAdmin && !companyId) {
      setError("Kompaniyani tanlang.");
      return;
    }

    if (!editingBanner && !formData.desktopImage && !formData.mobileImage) {
      setError("Kamida bitta banner rasmi yuklang (desktop yoki mobile).");
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("position", formData.position);
      if (companyId) {
        formDataToSend.append("companyId", companyId);
      }

      if (formData.desktopImage) {
        formDataToSend.append("banner", formData.desktopImage);
      }

      if (formData.mobileImage) {
        formDataToSend.append("mobile_banner", formData.mobileImage);
      }

      if (editingBanner) {
        await $api.patch(
          `/banners/update/${editingBanner._id}`,
          formDataToSend,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        fetchBanners(filterPosition);
        setError("");
        return setShowCreateModal(false);
      }

      await $api.post(`/banners/create`, formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      fetchBanners(filterPosition);
      setError("");
      setShowCreateModal(false);
    } catch (error) {
      setError(
        error?.response?.data?.message ||
          error?.response?.data?.msg ||
          "Banner yaratishda xatolik"
      );
      console.error("Error creating banner:", error);
    }
  };

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (type === "desktop") {
        setFormData((prev) => ({
          ...prev,
          desktopImage: file,
          desktopPreview: URL.createObjectURL(file),
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          mobileImage: file,
          mobilePreview: URL.createObjectURL(file),
        }));
      }
      setError("");
    } catch (err) {
      setError(err?.message || err.toString());
    }
  };

  const handleDeleteBanner = async () => {
    setDeleteLoading(false);
    try {
      await $api.delete(`/banners/delete/${deleteData}`);
      setBanners((prev) => prev.filter((banner) => banner._id !== deleteData));
    } catch (error) {
      console.error("Error deleting banner:", error);
    } finally {
      setDeleteLoading(false);
      setDeleteData("");
      setIsModalOpen(false);
    }
  };

const handleBulkDelete = async () => {
  setLoading(true);
  try {
    let { data } = await $api.delete(`/banners/bulk/delete`, {
      data: { ids: selectedBanners }, // bu yerda `data` bo'lishi kerak
    });
    console.log(data);

    // O'chirilgan bannerni frontenddan ham olib tashlash
    setBanners(prev => prev.filter(b => !selectedBanners.includes(b._id)));
    setSelectedBanners([]);
    setIsBulkDeleteModalOpen(false);
  } catch (error) {
    console.error("Error deleting banners:", error);
  } finally {
    setLoading(false);
  }
};

  const resetForm = () => {
    setFormData({
      desktopImage: null,
      desktopPreview: "",
      mobileImage: null,
      mobilePreview: "",
      position: "header",
    });
    setSelectedCompanyId(user?.companyId?._id || user?.companyId || "");
    setError("");
  };

  const openEditModal = (banner) => {
    setEditingBanner(banner);
    setFormData({
      desktopImage: null,
      desktopPreview: getBannerImageUrl(banner, "desktop"),
      mobileImage: null,
      mobilePreview: getBannerImageUrl(banner, "mobile"),
      position: banner.position,
    });
    setSelectedCompanyId(
      banner?.companyId?._id ||
        banner?.companyId ||
        user?.companyId?._id ||
        user?.companyId ||
        ""
    );
    setShowCreateModal(true);
  };

  if (user?.role && user.role !== "superadmin") {
    return (
      <div className="min-h-[50vh] bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900">Ruxsat yo'q</h2>
          <p className="text-slate-600 mt-1">Bannerlar faqat superadmin uchun mavjud.</p>
        </div>
      </div>
    );
  }

  async function fetchCompanies() {
    try {
      const { data } = await $api.get(`/company/all`);
      const companyList = data?.companies || data?.data || [];
      setCompanies(companyList);

      if (!editingBanner && !selectedCompanyId) {
        setSelectedCompanyId(
          user?.companyId?._id || user?.companyId || companyList[0]?._id || ""
        );
      }
    } catch (err) {
      console.error("Kompaniyalarni olishda xatolik:", err);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 rounded-2xl">
      {/* Stats Cards */}
      <div className="px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Jami Bannerlar</p>
                <p className="text-2xl font-bold text-slate-900">
                  {banners.length}
                </p>
              </div>
              <div className="bg-emerald-100 p-3 rounded-lg">
                <Image className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          {positions.map((position) => (
            <div
              key={position.value}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">{position.label}</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {
                      banners.filter((b) => b.position === position.value)
                        .length
                    }
                  </p>
                </div>
                <div className="text-2xl">{position.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={() => {
                resetForm();
                setEditingBanner(null);
                setShowCreateModal(true);
              }}
              className="bg-[#249B73] hover:bg-[#1f8966] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Yangi Banner
            </button>

            <select
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">Barcha pozitsiyalar</option>
              {positions.map((position) => (
                <option key={position.value} value={position.value}>
                  {position.label}
                </option>
              ))}
            </select>

            {selectedBanners.length > 0 && (
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                O'chirish ({selectedBanners.length})
              </button>
            )}
          </div>
        </div>

        {/* Banners Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedBanners.length === filteredBanners.length &&
                        filteredBanners.length > 0
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBanners(filteredBanners.map((b) => b._id));
                        } else {
                          setSelectedBanners([]);
                        }
                      }}
                      className="rounded cursor-pointer border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Kompyuter rasmi
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Telefon rasmi
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Pozitsiya
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Yaratilgan
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Amallar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBanners.map((banner) => (
                  <tr key={banner._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedBanners.includes(banner._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBanners((prev) => [...prev, banner._id]);
                          } else {
                            setSelectedBanners((prev) =>
                              prev.filter((id) => id !== banner._id)
                            );
                          }
                        }}
                        className="rounded cursor-pointer border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Monitor className="w-4 h-4 text-emerald-600" />
                        <img
                          src={getBannerImageUrl(banner, "desktop")}
                          alt="Kompyuter banneri"
                          loading="lazy"
                          onClick={() => handleImagePreview(banner, "desktop")}
                          className="w-20 select-none h-12 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity" 
                          title="Kattalashtirib ko'rish"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                        <img
                          src={getBannerImageUrl(banner, "mobile")}
                          alt="Telefon banneri"
                          loading="lazy"
                          onClick={() => handleImagePreview(banner, "mobile")}
                          className="w-16 select-none h-16 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                          title="Kattalashtirib ko'rish"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          getPositionInfo(banner.position).color
                        }`}
                      >
                        <span className="mr-1">
                          {getPositionInfo(banner.position).icon}
                        </span>
                        {getPositionInfo(banner.position).label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        {formatDate(banner.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {/* PREVIEW TUGMASI QO'SHAMIZ */}
                        <button
                          onClick={() => handlePreview(banner)}
                          className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Saytda qanday ko'rinishini ko'rish"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(banner)}
                          className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Tahrirlash"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setIsModalOpen(true), setDeleteData(banner._id);
                          }}
                          disabled={loading}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredBanners.length === 0 && (
            <div className="text-center py-12">
              <Image className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg mb-2">Bannerlar topilmadi</p>
              <p className="text-slate-400 text-sm">
                Qidiruv shartlarini o'zgartiring yoki yangi banner yarating
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">
                  {editingBanner
                    ? "Bannerni tahrirlash"
                    : "Yangi banner yaratish"}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingBanner(null);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5 cursor-pointer" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {error && (
                <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Desktop Image */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="w-5 h-5 text-blue-600" />
                    <label className="block text-sm font-medium">
                      Kompyuter banneri (1920×600 yoki 1600×500)
                    </label>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "desktop")}
                    className="w-full px-3 py-2 border rounded-lg cursor-pointer"
                  />
                  {formData.desktopPreview && (
                    <div className="mt-3 relative">
                      <img
                        src={formData.desktopPreview}
                        alt="Kompyuter ko'rinishi"
                        className="w-full h-32 object-cover rounded-lg border select-none"
                      />
                      <span className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                        Kompyuter
                      </span>
                    </div>
                  )}
                </div>

                {/* Mobile Image */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-5 h-5 text-green-600" />
                    <label className="block text-sm font-medium">
                      Telefon banneri (1080×1080 yoki 1080×1350)
                    </label>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "mobile")}
                    className="w-full px-3 py-2 border rounded-lg cursor-pointer" 
                  />
                  {formData.mobilePreview && (
                    <div className="mt-3 relative">
                      <img
                        src={formData.mobilePreview}
                        alt="Telefon ko'rinishi"
                        className="w-full h-40 object-cover rounded-lg border select-none"
                      />
                      <span className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                        Telefon
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Position */}
              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">
                  Kompaniya
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => {
                    setSelectedCompanyId(e.target.value);
                    setError("");
                  }}
                  className="w-full px-3 py-2 border rounded-lg mb-4"
                >
                  <option value="">Kompaniyani tanlang</option>
                  {companies.map((company) => (
                    <option key={company._id} value={company._id}>
                      {company.name} ({company.stir})
                    </option>
                  ))}
                </select>

                <label className="block text-sm font-medium mb-2">
                  Pozitsiya
                </label>
                <select
                  value={formData.position}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      position: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {positions.map((pos) => (
                    <option key={pos.value} value={pos.value}>
                      {pos.icon} {pos.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingBanner(null);
                    resetForm();
                  }}
                  className="flex-1 cursor-pointer px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 cursor-pointer bg-[#1E2939] text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingBanner ? "Yangilash" : "Yaratish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL QO'SHAMIZ */}
      {showPreviewModal && previewBanner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gray-50">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">
                  Banner Ko'rinishi - {getPositionInfo(previewBanner.position).label}
                </h2>
                
                {/* Device Switcher */}
                <div className="flex bg-gray-200 rounded-lg p-1">
                  <button
                    onClick={() => setPreviewDevice("desktop")}
                    className={`px-4 py-2 rounded-md cursor-pointer flex items-center gap-2 text-sm font-medium transition-colors ${
                      previewDevice === "desktop" 
                        ? "bg-white text-blue-600 shadow-sm" 
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                    Kompyuter
                  </button>
                  <button
                    onClick={() => setPreviewDevice("mobile")}
                    className={`px-4 py-2 rounded-md cursor-pointer flex items-center gap-2 text-sm font-medium transition-colors ${
                      previewDevice === "mobile" 
                        ? "bg-white text-green-600 shadow-sm" 
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    Telefon
                  </button>
                </div>
              </div>
              
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-500 cursor-pointer hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Preview Content */}
            <div className="p-6 bg-gray-100 overflow-y-auto max-h-[calc(90vh-100px)]">
              {previewDevice === "desktop" ? (
                // Desktop Preview
                <div className="bg-white rounded-lg shadow-lg overflow-hidden mx-auto" style={{ maxWidth: '1200px' }}>
                  {/* Fake Website Header */}
                  <div className="bg-white border-b">
                    <div className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-blue-600 rounded"></div>
                        <span className="font-bold text-gray-800">Sizning saytingiz</span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <span>Bosh sahifa</span>
                        <span>Mahsulotlar</span>
                        <span>Haqida</span>
                        <span>Aloqa</span>
                      </div>
                    </div>
                    
                    {/* Header Banner */}
                    {previewBanner.position === "header" && (
                      <div className="w-full">
                        <img
                          src={getBannerImageUrl(previewBanner, "desktop")}
                          alt="Header Banner"
                          className="w-full h-auto object-cover select-none"  
                          style={{ maxHeight: '300px' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Mid Header Banner */}
                  {previewBanner.position === "mid_header" && (
                    <div className="p-4">
                      <img
                        src={getBannerImageUrl(previewBanner, "desktop")}
                        alt="Mid Header Banner"
                        className="w-full h-auto object-cover rounded-lg select-none"
                        style={{ maxHeight: '250px' }}
                      />
                    </div>
                  )}

                  {/* Fake Content */}
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="bg-gray-100 h-32 rounded-lg"></div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>

                  {/* Footer Header Banner */}
                  {previewBanner.position === "footer_header" && (
                    <div className="p-4 bg-gray-50">
                      <img
                        src={getBannerImageUrl(previewBanner, "desktop")}
                        alt="Footer Header Banner"
                        className="w-full h-auto object-cover rounded-lg select-none"
                        style={{ maxHeight: '200px' }}
                      />
                    </div>
                  )}

                  {/* Fake Footer */}
                  <div className="bg-gray-800 text-white p-6">
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <h4 className="font-semibold mb-2">Kompaniya</h4>
                        <div className="space-y-1 text-gray-300">
                          <div>Haqimizda</div>
                          <div>Xizmatlar</div>
                          <div>Aloqa</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Mahsulotlar</h4>
                        <div className="space-y-1 text-gray-300">
                          <div>Katalog</div>
                          <div>Yangi</div>
                          <div>Chegirmalar</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Yordam</h4>
                        <div className="space-y-1 text-gray-300">
                          <div>FAQ</div>
                          <div>Qo'llab-quvvatlash</div>
                          <div>Qaytarish</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Ijtimoiy</h4>
                        <div className="space-y-1 text-gray-300">
                          <div>Facebook</div>
                          <div>Instagram</div>
                          <div>Telegram</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Other Position Banner */}
                  {previewBanner.position === "other" && (
                    <div className="p-4 bg-blue-50">
                      <div className="text-center mb-2">
                        <span className="text-sm text-gray-600">Maxsus joy</span>
                      </div>
                      <img
                        src={getBannerImageUrl(previewBanner, "desktop")}
                        alt="Other Banner"
                        className="w-full h-auto object-cover rounded-lg mx-auto select-none"
                        style={{ maxHeight: '180px' }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                // Mobile Preview
                <div className="bg-white rounded-lg shadow-lg overflow-hidden mx-auto" style={{ maxWidth: '375px' }}>
                  {/* Fake Mobile Header */}
                  <div className="bg-white border-b">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-blue-600 rounded"></div>
                        <span className="font-bold text-sm">Sizning saytingiz</span>
                      </div>
                      <button className="p-2">
                        <div className="w-5 h-5 bg-gray-400 rounded"></div>
                      </button>
                    </div>
                    
                    {/* Mobile Header Banner */}
                    {previewBanner.position === "header" && (
                      <div className="w-full">
                        <img
                          src={getBannerImageUrl(previewBanner, "mobile")}
                          loading="lazy"
                          alt="Telefon tepa banneri"
                          className="w-full h-auto object-cover"
                          style={{ maxHeight: '200px' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Mobile Mid Header Banner */}
                  {previewBanner.position === "mid_header" && (
                    <div className="p-3">
                      <img
                        src={getBannerImageUrl(previewBanner, "mobile")}
                        loading="lazy"
                        alt="Telefon o'rta banneri"
                        className="w-full h-auto object-cover rounded-lg select-none"
                        style={{ maxHeight: '180px' }}
                      />
                    </div>
                  )}

                  {/* Mobile Fake Content */}
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((item) => (
                        <div key={item} className="bg-gray-100 h-24 rounded-lg"></div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>

                  {/* Mobile Footer Header Banner */}
                  {previewBanner.position === "footer_header" && (
                    <div className="p-3 bg-gray-50">
                      <img
                        src={getBannerImageUrl(previewBanner, "mobile")}
                        loading="lazy"
                        alt="Telefon pastki banneri"
                        className="w-full h-auto object-cover rounded-lg select-none"
                        style={{ maxHeight: '150px' }}
                      />
                    </div>
                  )}

                  {/* Mobile Footer */}
                  <div className="bg-gray-800 text-white p-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <h4 className="font-semibold mb-2">Kompaniya</h4>
                        <div className="space-y-1 text-gray-300">
                          <div>Haqimizda</div>
                          <div>Aloqa</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Yordam</h4>
                        <div className="space-y-1 text-gray-300">
                          <div>FAQ</div>
                          <div>Qo'llab-quvvatlash</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Other Position Banner */}
                  {previewBanner.position === "other" && (
                    <div className="p-3 bg-blue-50">
                      <div className="text-center mb-2">
                        <span className="text-xs text-gray-600">Maxsus joy</span>
                      </div>
                      <img
                        src={getBannerImageUrl(previewBanner, "mobile")}
                        loading="lazy"
                        alt="Telefon qo'shimcha banneri"
                        className="w-full h-auto object-cover rounded-lg select-none"
                        style={{ maxHeight: '120px' }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Preview Info */}
              <div className="mt-6 bg-white rounded-lg p-4 border-l-4 border-blue-500">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Eye className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Ko'rinish ma'lumoti</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><span className="font-medium">Pozitsiya:</span> {getPositionInfo(previewBanner.position).label}</p>
                      <p><span className="font-medium">Yaratilgan:</span> {formatDate(previewBanner.createdAt)}</p>
                      <p><span className="font-medium">Joriy ko'rinish:</span> {previewDevice === "desktop" ? "Kompyuter" : "Telefon"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDeleteBanner}
        title="Bannerni o'chirish"
        message="Haqiqatan ham bu bannerni o'chirishni xohlaysizmi? Bu amal bekor qilinmaydi va barcha ma'lumotlar yo'qoladi."
        loading={deleteLoading}
      />
      <DeleteConfirmModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        title="Bannerni o'chirish"
        message="Haqiqatan ham bu bannerni o'chirishni xohlaysizmi? Bu amal bekor qilinmaydi va barcha ma'lumotlar yo'qoladi."
        loading={deleteLoading}
      />
    </div>
  );
};

export default BannerAdminPanel;
