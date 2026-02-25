import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  RefreshCw,
  HelpCircle,
  Users,
  Package,
  ShoppingCart,
  CreditCard,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import $api from "../../http/api";
import { motion, AnimatePresence } from "framer-motion";
import GlobalTable from "../../components/global_table/GlobalTable";
import { useNavigate } from "react-router-dom";
import { getRoleLabelUz } from "../../utils/roleLabel";

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState("Hafta");
  const [modalPosition, setModalPosition] = useState({ top: 0, right: 0 });
  const [orderStatistics, setOrderStatistics] = useState(null);
  const [userStatistics, setUserStatistics] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoad, setDataLoad] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    fullName: true,
    phoneNumber: true,
    role: true,
    ordersCount: true,
    setting: true,
  });
  const settingsButtonRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pagination states
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const buttons = ["Hafta", "Oy", "Yil"];

  // Format number function
  const formatNumber = (num) => {
    return new Intl.NumberFormat("uz-UZ").format(num);
  };

  const handleSettingsClick = () => {
    if (settingsButtonRef.current && !showColumnSettings) {
      const rect = settingsButtonRef.current.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;

      setModalPosition({
        top: rect.bottom + scrollTop - 5,
        right: window.innerWidth - rect.left - 60,
      });
    }
    setShowColumnSettings(!showColumnSettings);
    setIsModalOpen(!showColumnSettings);
  };

  useEffect(() => {
    fetchAllData();
  }, [selectedPeriod]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${
        window.innerWidth - document.documentElement.clientWidth
      }px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isModalOpen]);

  // O'zbek tilidagi oy nomlari
  const uzbekMonths = [
    "Yan",
    "Fev",
    "Mar",
    "Apr",
    "May",
    "Iyn",
    "Iyl",
    "Avg",
    "Sen",
    "Okt",
    "Noy",
    "Dek",
  ];

  // O'zbek tilidagi hafta kunlari
  const uzbekDays = {
    monday: "Dushanba",
    tuesday: "Seshanba",
    wednesday: "Chorshanba",
    thursday: "Payshanba",
    friday: "Juma",
    saturday: "Shanba",
    sunday: "Yakshanba",
  };

  // Sana formatlash funksiyasi o'zbek tilida
  const formatDateUzbek = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const monthName = uzbekMonths[date.getMonth()];
    const dayOfWeek =
      uzbekDays[
        date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()
      ];

    return {
      dayMonth: `${day} ${monthName}`,
      weekday: dayOfWeek,
    };
  };

  async function fetchAllData() {
    setLoading(true);
    try {
      await Promise.all([
        fetchOrderStatistics(),
        fetchUserStatistics(),
        fetchOrderData(),
        fetchUserData(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrderStatistics() {
    try {
      // API parametrini ham o'zbek tiliga moslashtirish
      const periodMap = {
        Hafta: "Неделя",
        Oy: "Месяц",
        Yil: "Год",
      };

      let { data } = await $api.get(
        `/dashboard/orders/statistics?period=${
          periodMap[selectedPeriod] || selectedPeriod
        }`
      );
      setOrderStatistics(data);
    } catch (error) {
      setOrderStatistics(null);
    }
  }

  async function fetchUserStatistics() {
    try {
      let { data } = await $api.get(`/dashboard/user/statistics`);
      setUserStatistics(data);
    } catch (error) {
      setUserStatistics(null);
    }
  }

  async function fetchOrderData() {
    try {
      let { data } = await $api.get(`/dashboard/orders/data`);
      setOrderData(data);
    } catch (error) {
      setOrderData(null);
    }
  }

  async function fetchUserData() {
    try {
      let { data } = await $api.get(`/dashboard/get/users`);
      setUserData(data);
    } catch (error) {
      setUserData(null);
    }
  }

  const toggleColumn = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  const buyersData = useMemo(() => {
    if (!userStatistics?.topBuyers) return [];

    return userStatistics.topBuyers
      .filter((buyer) => buyer.user)
      .map((buyer) => ({
        fullName: `${buyer.user.firstName} ${buyer.user.lastName}`,
        phoneNumber: buyer.user.phoneNumber,
        role: getRoleLabelUz(buyer.user.role),
        ordersCount: buyer.ordersCount,
      }));
  }, [userStatistics]);

  // Pagination calculations
  const totalItems = buyersData.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = buyersData.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      const startPage = Math.max(
        1,
        currentPage - Math.floor(maxVisiblePages / 2)
      );
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      if (startPage > 1) {
        pageNumbers.push(1);
        if (startPage > 2) pageNumbers.push("...");
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pageNumbers.push("...");
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  // Chart data generation functions (with Uzbek months)
  const generateSalesData = () => {
    if (!orderStatistics?.salesData) return [];

    const isYearly = typeof orderStatistics.salesData[0]?._id === "number";

    if (isYearly) {
      return uzbekMonths.map((month, index) => {
        const monthData = orderStatistics.salesData.find(
          (item) => item._id === index + 1
        );
        return {
          name: month,
          value: monthData ? monthData.total : 0,
        };
      });
    }

    return orderStatistics.salesData.map((item) => {
      const date = new Date(item._id);
      const formatted = formatDateUzbek(date);
      return {
        name: formatted.dayMonth,
        value: item.total,
      };
    });
  };

  const getRoleDistribution = () => {
    if (!userStatistics?.roleBreakdown) return [];

    return userStatistics.roleBreakdown.map((role) => ({
      name: getRoleLabelUz(role._id),
      value: role.count,
      percentage: ((role.count / userStatistics.totalUsers) * 100).toFixed(1),
    }));
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const todaySales =
    orderStatistics?.salesData?.[orderStatistics.salesData.length - 1] || {
      total: 0,
      count: 0,
    };
  const roleDistribution = getRoleDistribution();

  // Bugungi sana o'zbek tilida
  const today = new Date();
  const todayFormatted = formatDateUzbek(today);

  const columns = [
    { key: "fullName", label: "Foydalanuvchi" },
    { key: "phoneNumber", label: "Telefon raqam" },
    { key: "role", label: "Rol" },
    { key: "ordersCount", label: "Buyurtmalar soni" },
    {
      key: "setting",
      label: (
        <button
          ref={settingsButtonRef}
          className="p-1 hover:bg-gray-100 rounded items-center"
          onClick={handleSettingsClick}
        >
          <Settings className="w-4 h-4 font-[900] text-[#2db789] cursor-pointer" />
        </button>
      ),
    },
  ];

  const handleCardKeyDown = (event, path) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate(path);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white border border-emerald-100 rounded-2xl py-4 px-4 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Sotish</h1>
      </div>

      <div className="py-6">
        {/* Statistics Cards - Real API data */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate("/system/users")}
            onKeyDown={(event) => handleCardKeyDown(event, "/system/users")}
            className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {orderStatistics?.users?.total ||
                    userStatistics?.totalUsers ||
                    userData?.totalUsers ||
                    0}
                </div>
                <div className="text-sm text-gray-600">
                  Jami foydalanuvchilar
                </div>
                <div className="text-xs text-green-600">
                  7 kun ichida faol:{" "}
                  {orderStatistics?.users?.activeLast7Days ||
                    userStatistics?.activeLast7Days ||
                    0}
                </div>
              </div>
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate("/products")}
            onKeyDown={(event) => handleCardKeyDown(event, "/products")}
            className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {orderStatistics?.products?.total || 0}
                </div>
                <div className="text-sm text-gray-600">Jami mahsulotlar</div>
              </div>
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate("/sales/orders")}
            onKeyDown={(event) => handleCardKeyDown(event, "/sales/orders")}
            className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {orderStatistics?.orders?.total || 0}
                </div>
                <div className="text-sm text-gray-600">Jami buyurtmalar</div>
                <div className="text-xs text-orange-600">
                  Qabul qilinmagan:{" "}
                  {orderStatistics?.orders?.status?.[0]?.count || 0}
                </div>
              </div>
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate("/money/accounts")}
            onKeyDown={(event) => handleCardKeyDown(event, "/money/accounts")}
            className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <div className="flex items-center">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {formatNumber(orderStatistics?.revenue || 0)}
                </div>
                <div className="text-sm text-gray-600">so'm (Daromad)</div>
                <div className="text-xs text-green-600">
                  Onlain: {orderStatistics?.orders?.payments?.online || 0}(
                  {orderData?.stats?.[0]?.percentage || "0"}%)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Period selector */}
        <div className="mb-6 inline-flex items-center rounded-2xl border border-emerald-200 bg-white p-1 shadow-sm">
          {buttons.map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                selectedPeriod === period
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-emerald-50"
              }`}
            >
              {period}
            </button>
          ))}
        </div>

        {/* Sales Chart */}
        <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-6 mb-6 overflow-hidden">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {selectedPeriod} statistikasi
              </div>
              <div className="mt-2 text-sm text-slate-600">
                Bugun, {todayFormatted.weekday}, {todayFormatted.dayMonth}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full xl:w-auto">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 min-w-[170px]">
                <div className="text-xs font-medium text-slate-500">Sotish</div>
                <div className="text-2xl font-bold text-slate-900">
                  {todaySales.count}
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 min-w-[170px]">
                <div className="text-xs font-medium text-slate-500">Daromad</div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatNumber(todaySales.total)}
                </div>
                <div className="text-xs text-slate-500">so'm</div>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 min-w-[170px]">
                <div className="text-xs font-medium text-slate-500">O'rtacha</div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatNumber(todaySales.total)}
                </div>
                <div className="text-xs text-slate-500">solishtirma</div>
              </div>
            </div>
          </div>

          <div className="h-64 rounded-2xl border border-dashed border-emerald-200 bg-gradient-to-b from-emerald-50/40 to-white px-2 py-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={generateSalesData()}>
                <CartesianGrid strokeDasharray="4 4" stroke="#dbece4" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#5f6b7a" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#5f6b7a" }}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0ea76b"
                  strokeWidth={3.5}
                  dot={{ fill: "#0ea76b", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: "#0b8c59" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-100 bg-slate-50/70 px-5 py-4">
            <div className="text-sm font-semibold text-slate-600 mb-2">
              Bu yil uchun
            </div>
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
              <div>
                <div className="text-3xl font-bold text-slate-900">
                  {orderStatistics?.orders?.total || 0}
                </div>
                <div className="text-sm text-slate-600">Sotish</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-900">
                  {formatNumber(orderStatistics?.revenue || 0)}
                </div>
                <div className="text-sm text-slate-600">so'm</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-900">
                  {formatNumber(orderStatistics?.revenue || 0)}
                  <span className="text-sm text-slate-500 ml-1">so'm</span>
                </div>
                <div className="text-sm text-slate-600">
                  O'tgan yilga nisbatan
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Roles and Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* User Roles Distribution - from userStatistics.roleBreakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Foydalanuvchi rollarini taqsimlash
              </h3>
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </div>

            {roleDistribution.length > 0 ? (
              <>
                <div className="mb-5">
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    {roleDistribution.map((role, index) => (
                      <div
                        key={`role-bar-${role.name}`}
                        className="h-full"
                        style={{
                          width: `${role.percentage}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roleDistribution.map((role, index) => (
                    <div
                      key={role.name}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-slate-500 uppercase tracking-wide">
                          {role.name}
                        </span>
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-lg font-bold text-slate-900">
                          {role.value}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          {role.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Ma'lumotlar yuklanmoqda...
              </div>
            )}

            {/* Gender Statistics - from userData */}
            {userData && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Jins bo'yicha statistika
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-2 py-2 text-center">
                    <div className="text-base font-bold text-green-600">
                      {userData.maleCount || 0}
                    </div>
                    <div className="text-xs text-gray-600">
                      Erkak ({userData.malePercentage || "0.00"}%)
                    </div>
                  </div>
                  <div className="rounded-xl border border-pink-100 bg-pink-50/70 px-2 py-2 text-center">
                    <div className="text-base font-bold text-pink-600">
                      {userData.femaleCount || 0}
                    </div>
                    <div className="text-xs text-gray-600">
                      Ayol ({userData.femalePercentage || "0.00"}%)
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-center">
                    <div className="text-base font-bold text-gray-600">
                      {userData.otherCount || 0}
                    </div>
                    <div className="text-xs text-gray-600">
                      Boshqa ({userData.otherPercentage || "0.00"}%)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Top Products - from orderStatistics.topSelling */}
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Eng yaxshi mahsulotlar
              </h3>
              <RefreshCw
                className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"
                onClick={fetchAllData}
              />
            </div>

            {orderStatistics?.topSelling &&
            orderStatistics.topSelling.length > 0 ? (
              <div className="space-y-4">
                {orderStatistics.topSelling
                  .slice(0, 5)
                  .map((product, index, arr) => {
                    const maxSales = Math.max(
                      ...arr.map((p) => p.totalSales || 0),
                      1
                    );
                    const percent = Math.round(
                      ((product.totalSales || 0) / maxSales) * 100
                    );

                    return (
                      <div
                        key={product._id}
                        className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {product.name}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-green-600">
                            {product.totalSales} sotish
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-emerald-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Ma'lumotlar yuklanmoqda...
              </div>
            )}

            {/* Most Viewed Products */}
            {orderStatistics?.mostViewed &&
              orderStatistics.mostViewed.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Eng ko'p ko'rilgan
                  </h4>
                  <div className="space-y-2">
                    {orderStatistics.mostViewed.slice(0, 3).map((product) => (
                      <div
                        key={product._id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-700">{product.name}</span>
                        <span className="text-gray-500">
                          {product.viewsCount} ko'rishlar
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Top Buyers Section - from userStatistics.topBuyers */}
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Eng yaxshi xaridorlar
            </h3>
            <RefreshCw
              className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"
              onClick={fetchAllData}
            />
          </div>

          <AnimatePresence>
            {showColumnSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0, scaleY: 0 }}
                animate={{ height: "auto", opacity: 1, scaleY: 1 }}
                exit={{ height: 0, opacity: 0, scaleY: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="fixed bg-white border border-gray-200 rounded shadow-lg overflow-hidden w-[190px] z-50"
                style={{
                  top: `${modalPosition.top}px`,
                  right: `${modalPosition.right}px`,
                  transformOrigin: "top right",
                }}
              >
                <div className="p-4">
                  <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                    {columns.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center justify-end space-x-2 cursor-pointer"
                      >
                        <span className="text-sm text-gray-700">
                          {typeof col.label === "string" ? col.label : "⚙️"}
                        </span>
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.key] ?? true}
                          onChange={() => toggleColumn(col.key)}
                          className="rounded text-green-600"
                        />
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
                            setRowsPerPage(num);
                          }}
                          className={`px-4 py-1 text-sm border-l first:border-l-0 cursor-pointer border-gray-300
          ${idx === 0 ? "rounded-l" : ""}
          ${idx === 2 ? "rounded-r" : ""}
          ${
            rowsPerPage === num
              ? "bg-[#249B73] text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Table */}
          {buyersData.length > 0 ? (
            <div>
              <GlobalTable
                columns={columns}
                visibleColumns={visibleColumns}
                sampleData={currentData}
                load={dataLoad}
              />

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                  {/* Items info */}
                  <div className="text-sm text-gray-700">
                    Ko'rsatilmoqda {startIndex + 1} dan{" "}
                    {Math.min(endIndex, totalItems)} gacha, jami {totalItems} ta
                    natija
                  </div>

                  {/* Pagination buttons */}
                  <div className="flex items-center space-x-2">
                    {/* Previous button */}
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg border ${
                        currentPage === 1
                          ? "border-gray-200 text-gray-400 cursor-not-allowed"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center space-x-1">
                      {getPageNumbers().map((pageNum, index) => (
                        <button
                          key={index}
                          onClick={() =>
                            typeof pageNum === "number" && goToPage(pageNum)
                          }
                          disabled={pageNum === "..."}
                          className={`px-3 py-2 text-sm rounded-lg border ${
                            pageNum === currentPage
                              ? "bg-green-600 text-white border-green-600"
                              : pageNum === "..."
                              ? "border-transparent text-gray-400 cursor-default"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                    </div>

                    {/* Next button */}
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg border ${
                        currentPage === totalPages
                          ? "border-gray-200 text-gray-400 cursor-not-allowed"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Ma'lumotlar yuklanmoqda...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
