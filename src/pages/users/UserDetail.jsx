import { useEffect, useState } from "react";
import {
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Package,
  ShoppingCart,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import $api from "../../http/api";
import { formatDate, formatPrice } from "../../utils/functions/functions.utils";
import { useParams } from "react-router-dom";
import { getRoleLabelUz, normalizeRole } from "../../utils/roleLabel";

export const UserDetail = () => {
  const { id } = useParams();
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, [id]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchUser(), fetchOrders(), fetchCarts()]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  async function fetchUser() {
    try {
      let { data } = await $api.get(`/users/get/by/${id}`);
      setUserData(data.userData);
    } catch (error) {
      console.log(error);
    }
  }

  async function fetchOrders() {
    try {
      let { data } = await $api.get(`/order/get/by/user/${id}?limit=10&page=1`);
      setOrders(data.data || []);
    } catch (error) {
      console.log(error);
    }
  }

  async function fetchCarts() {
    try {
      let { data } = await $api.get(
        `/cart/get/user/carts/${id}?limit=10&page=1`
      );

      if (data.carts) {
        setCarts(data.carts);
      } else {
        setCarts([]); 
        console.warn(data.message || "Savatlar topilmadi");
      }
    } catch (error) {
      console.log(error);
      setCarts([]);
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "qabul_qilinmagan":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "qabul_qilingan":
        return "bg-green-100 text-green-800 border-green-200";
      case "bekor_qilingan":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "qabul_qilinmagan":
        return "Qabul qilinmagan";
      case "jarayonda":
        return "Jarayonda";
      case "yetkazish_jarayonida":
        return "Yetkazish jarayonida";
      case "yetkazilgan":
        return "Yetkazilgan";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ma'lumotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Foydalanuvchi topilmadi
          </h2>
          <p className="text-gray-600">
            Ushbu ID bo'yicha foydalanuvchi mavjud emas
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className=" mx-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-white  shadow-sm border border-gray-200 overflow-hidden">
              <div
                className="px-6 py-4 border-b border-gray-200"
                style={{ backgroundColor: "#249B73" }}
              >
                <h2 className="text-lg font-semibold text-white">
                  Shaxsiy ma'lumotlar
                </h2>
              </div>
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-8 w-8 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {userData.firstName} {userData.lastName}
                    </h3>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        normalizeRole(userData.role) === "admin" || normalizeRole(userData.role) === "superadmin"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {getRoleLabelUz(userData.role)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-900">
                      {userData.phoneNumber}
                    </span>
                  </div>

                  {userData.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-900">{userData.email}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Ro'yxatdan o'tgan</p>
                      <p className="text-gray-900">
                        {formatDate(userData.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Oxirgi faollik</p>
                      <p className="text-gray-900">
                        {formatDate(userData.last_activity)}
                      </p>
                    </div>
                  </div>

                  {userData.isWorker && (
                    <div className="pt-4 border-t">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Xodim
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Orders and Carts */}
          <div className="lg:col-span-2 space-y-8">
            {/* Orders Section */}
            <div className="bg-white shadow-sm border border-gray-200">
              <div
                className="px-6 py-4 border-b border-gray-200"
                style={{ backgroundColor: "#249B73" }}
              >
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-white" />
                  <h2 className="text-lg font-semibold text-white">
                    Buyurtmalar
                  </h2>
                </div>
              </div>
              <div className="p-6">
                {orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      Hozircha buyurtmalar mavjud emas
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order._id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                                order.status
                              )}`}
                            >
                              {getStatusText(order.status)}
                            </span>
                          </div>
                          <span className="text-lg font-semibold text-gray-900">
                            {formatPrice(order.sellingPrice)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Miqdor</p>
                            <p className="font-medium">
                              {order.productQuantity} dona
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Joylashuv</p>
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <p className="font-medium">{order.location?.address}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-500">To'lov</p>
                            <p className="font-medium">
                              {order.paymentMethodOnline ? "Online" : "Naqd"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Sana</p>
                            <p className="font-medium">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cart Section */}
            <div className="bg-white shadow-sm border border-gray-200">
              <div
                className="px-6 py-4 border-b border-gray-200"
                style={{ backgroundColor: "#249B73" }}
              >
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5 text-white" />
                  <h2 className="text-lg font-semibold text-white">Savatlar</h2>
                </div>
              </div>
              <div className="p-6">
                {carts.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      Hozircha savatlar mavjud emas
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {carts.map((cart) => (
                      <div
                        key={cart._id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-medium text-gray-900">
                            Savat #{cart._id.slice(-8)}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {formatDate(cart.createdAt)}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {cart.products.map((product) => (
                            <div
                              key={product._id}
                              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <Package className="h-5 w-5 text-gray-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {product.productId?.name || "Mahsulot nomi"}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    Miqdor: {product.quantity}
                                  </p>
                                </div>
                              </div>
                              <span className="font-medium text-gray-900">
                                {formatPrice(product.price)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-900">
                              Jami mahsulotlar:
                            </span>
                            <span className="font-semibold text-gray-900">
                              {cart.products.length} dona
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
