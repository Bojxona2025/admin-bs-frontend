import { Suspense, lazy, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./protectedroute";
import { fetchUserProfile } from "../store/userSlice";

const SkladLogin = lazy(() => import("../pages/login/Login"));
const MainLayout = lazy(() =>
  import("../layouts/main/MainLayout").then((m) => ({ default: m.MainLayout }))
);
const Users = lazy(() =>
  import("../pages/users/Users").then((m) => ({ default: m.Users }))
);
const UserDetail = lazy(() =>
  import("../pages/users/UserDetail").then((m) => ({ default: m.UserDetail }))
);
const OrderPage = lazy(() =>
  import("../pages/orders/Order").then((m) => ({ default: m.OrderPage }))
);
const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));
const AccountsPage = lazy(() => import("../pages/receipts/accountspage"));
const Categories = lazy(() =>
  import("../pages/categories/Categories").then((m) => ({ default: m.Categories }))
);
const OrderDetailsPage = lazy(() =>
  import("../pages/orders/OrderDetail").then((m) => ({ default: m.OrderDetailsPage }))
);
const InventoryManagement = lazy(() =>
  import("../pages/products/Products").then((m) => ({ default: m.InventoryManagement }))
);
const CorporateForm = lazy(() => import("../pages/product_create/ProductCreate"));
const NotificationAdminPanel = lazy(() =>
  import("../pages/notifications/Notifications").then((m) => ({ default: m.NotificationAdminPanel }))
);
const ProductDetail = lazy(() => import("../pages/products/product-detail"));
const NotificationsDetail = lazy(
  () => import("../pages/notifications/Notifications-detail")
);
const ProfilePage = lazy(() => import("../components/profile/profile"));
const SettingsPage = lazy(() => import("../components/profile/sozlamalar"));
const EmuIntegrationPage = lazy(() =>
  import("../pages/emu_integration").then((m) => ({ default: m.EmuIntegrationPage }))
);
const OrderDetailPage = lazy(() =>
  import("../pages/orders/Detail").then((m) => ({ default: m.OrderDetailPage }))
);
const DeliveryCalculator = lazy(() =>
  import("../pages/calculator/Canculator").then((m) => ({ default: m.DeliveryCalculator }))
);
const BannerAdminPanel = lazy(() => import("../pages/bms/Banners"));
const Navigator = lazy(() =>
  import("../components/navigate/Navigate").then((m) => ({ default: m.Navigator }))
);
const ArchiveProducts = lazy(() =>
  import("../pages/products/arxiv").then((m) => ({ default: m.ArchiveProducts }))
);
const TrashProducts = lazy(() =>
  import("../pages/products/karzinka").then((m) => ({ default: m.TrashProducts }))
);

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

export const Router = () => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.user);
  const actorRole = resolveActorRole(user);
  const canUseUsersPage = isSuperAdminRole(actorRole) || isAdminLikeRole(actorRole);
  const canUseNotificationsPage = isSuperAdminRole(actorRole);

  useEffect(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#249B73] border-t-transparent" />
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={<SkladLogin />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/products/create"
          element={
            <ProtectedRoute>
              <CorporateForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/categories/all"
          element={
            <ProtectedRoute>
              <Categories />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales/orders"
          element={
            <ProtectedRoute>
              <OrderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              {loading ? (
                <div className="min-h-[50vh] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#249B73] border-t-transparent" />
                </div>
              ) : canUseNotificationsPage ? (
                <NotificationAdminPanel />
              ) : (
                <Navigate to="/indicators/general" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications/:userId"
          element={
            <ProtectedRoute>
              {loading ? (
                <div className="min-h-[50vh] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#249B73] border-t-transparent" />
                </div>
              ) : canUseNotificationsPage ? (
                <NotificationsDetail />
              ) : (
                <Navigate to="/indicators/general" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales/order/:id"
          element={
            <ProtectedRoute>
              <OrderDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <InventoryManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/archive"
          element={
            <ProtectedRoute>
              <ArchiveProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trash"
          element={
            <ProtectedRoute>
              <TrashProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/detail/:productId"
          element={
            <ProtectedRoute>
              <ProductDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/indicators/general"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/money/accounts"
          element={
            <ProtectedRoute>
              <AccountsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/:id"
          element={
            <ProtectedRoute>
              <UserDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/system/users"
          element={
            <ProtectedRoute>
              {loading ? (
                <div className="min-h-[50vh] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#249B73] border-t-transparent" />
                </div>
              ) : canUseUsersPage ? (
                <Users />
              ) : (
                <Navigate to="/indicators/general" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/system/companies"
          element={
            <ProtectedRoute>
              {loading ? (
                <div className="min-h-[50vh] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#249B73] border-t-transparent" />
                </div>
              ) : isSuperAdminRole(actorRole) ? (
                <Users />
              ) : (
                <Navigate to="/indicators/general" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/emu/integration"
          element={
            <ProtectedRoute>
              <EmuIntegrationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/emu/order/:orderno"
          element={
            <ProtectedRoute>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/system/banners"
          element={
            <ProtectedRoute>
              {loading ? (
                <div className="min-h-[50vh] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#249B73] border-t-transparent" />
                </div>
              ) : isSuperAdminRole(actorRole) ? (
                <BannerAdminPanel />
              ) : (
                <Navigate to="/indicators/general" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigator />} />
      </Route>
        <Route
          path="/calculator"
          element={
            <ProtectedRoute>
              <DeliveryCalculator />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
};
