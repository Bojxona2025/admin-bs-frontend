import { useEffect, useState } from "react";
import {
  Truck,
  Eye,
  Star,
  Trash2,
  Send,
  Loader2,
  QrCode,
  X,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrderStore } from "@/app/store/orderStore";
import $api from "@/app/http/api";

const Orders = () => {
  const { addReview, removeReview, getOrderReviews } = useOrderStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userId, setUserId] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);

  const getUserProfile = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error("Token mavjud emas");
      }

      $api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const response = await $api.get("/users/profile/me");

      if (response.data.status === 200) {
        const userProfileId = response.data.myProfile._id;
        setUserId(userProfileId);
        return userProfileId;
      } else {
        throw new Error("Profile ma'lumotlarini olishda xatolik");
      }
    } catch (error) {
      console.error("User profile olishda xatolik:", error);
      const fallbackUserId =
        localStorage.getItem("userId") || "6833f4c9e24b22330eaff0f9";
      setUserId(fallbackUserId);
      return fallbackUserId;
    }
  };

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      let currentUserId = userId;
      if (!currentUserId) {
        currentUserId = await getUserProfile();
      }

      const token = localStorage.getItem("accessToken");
      if (token) {
        $api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }

      const response = await $api.get(`/order/my?page=${page}&limit=10`);

      console.log("API javobi:", response.data);

      if (response.data.status === 200) {
        const ordersData = response.data.myOrders || [];

        if (ordersData.length === 0) {
          setOrders([]);
          setTotalPages(response.data.pagination?.totalPages || 0);
          setLoading(false);
          return;
        }

        const transformedOrders = ordersData.map((order) => {
          // Items dan total narxni hisoblash
          let totalPrice = 0;
          let totalItems = 0;

          if (order.items && order.items.length > 0) {
            order.items.forEach((item) => {
              totalPrice +=
                (item.sellingPrice || 0) * (item.productQuantity || 0);
              totalItems += item.productQuantity || 0;
            });
          }

          // Agar totalSellingPrice mavjud bo'lsa, uni ishlatamiz
          if (order.totalSellingPrice) {
            totalPrice = order.totalSellingPrice;
          }

          return {
            id: order.order_code,
            date: new Date(order.createdAt).toLocaleDateString("uz-UZ"),
            status: mapApiStatusToLocal(order.status),
            total: totalPrice,
            items: totalItems,
            products: order.items
              ? order.items.map((item) => {
                  const product = item.productId;
                  let variantColor = "";
                  let variantUnit = "";

                  // Variant ma'lumotlarini olish
                  if (item.variantId && product?.variants) {
                    const variant = product.variants.find(
                      (v) => v._id === item.variantId
                    );
                    if (variant) {
                      variantColor = variant.color || "";
                      variantUnit = variant.unit || "";
                    }
                  }

                  return {
                    id: product?._id || item.productId,
                    name: product?.name || "Mahsulot",
                    quantity: item.productQuantity || 0,
                    price: item.sellingPrice || 0,
                    image: product?.mainImage || "",
                    variant: {
                      color: variantColor,
                      unit: variantUnit,
                    },
                  };
                })
              : [],
            customerInfo: {
              name: order.receiverName || "Mijoz",
              phone: order.receiverPhone || "",
              region: order.location?.address || "Manzil ko'rsatilmagan",
              pickupPoint: {
                name: order.receiverPvz ? [`PVZ: ${order.receiverPvz}`] : [],
              },
            },
            paid: order.paid || false,
            paymentMethodOnline: order.paymentMethodOnline || false,
            canceled: order.canceled || false,
            qrCode: order.scan_token || null,
            apiData: order,
          };
        });

        console.log("Transformed orders:", transformedOrders);
        setOrders(transformedOrders);
        setTotalPages(response.data.pagination?.totalPages || 1);
      } else {
        throw new Error("Buyurtmalarni yuklashda xatolik yuz berdi");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Buyurtmalarni yuklashda xatolik yuz berdi";
      setError(errorMessage);
      console.error("Buyurtmalarni yuklashda xatolik:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const mapApiStatusToLocal = (apiStatus) => {
    const statusMap = {
      qabul_qilinmagan: "processing",
      qabul_qilingan: "processing",
      Yetkazilgan: "processing",
      yolda: "shipping",
      yetkazilgan: "delivered",
      bekor_qilingan: "cancelled",
    };
    return statusMap[apiStatus] || "delivered";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "delivered":
        return "text-[#249B73] bg-green-100";
      case "shipping":
        return "text-blue-600 bg-blue-100";
      case "processing":
        return "text-[#249B73] bg-green-100";
      case "cancelled":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "delivered":
        return "Yetkazilgan";
      case "shipping":
        return "Yo'lda";
      case "processing":
        return "Yetkazilgan";
      case "cancelled":
        return "Bekor qilingan";
      default:
        return status;
    }
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return "0";
    const numericPrice =
      typeof price === "number"
        ? price
        : parseFloat(String(price).replace(/[^\d.-]/g, ""));
    if (isNaN(numericPrice)) return "0";
    return numericPrice.toLocaleString("uz-UZ");
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
  };

  const handleCreateReview = async () => {
    if (!newReview.comment.trim()) return;

    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        $api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }

      const productId = selectedOrder.products[0]?.id;

      const response = await $api.post("/review/create", {
        orderId: selectedOrder.id,
        productId,
        rating: newReview.rating,
        comment: newReview.comment,
      });

      console.log("Review API javobi:", response.data);

      const reviewData = response.data?.data || response.data;

      addReview({
        id: reviewData._id || reviewData.id || Date.now(),
        orderId: selectedOrder.id,
        rating: newReview.rating,
        comment: newReview.comment,
        date: new Date().toLocaleDateString("uz-UZ"),
      });

      setNewReview({ rating: 5, comment: "" });
      alert("Sharh muvaffaqiyatli qo'shildi!");
    } catch (error) {
      console.error("Sharh qo'shishda xatolik:", error);
      addReview({
        id: Date.now(),
        orderId: selectedOrder.id,
        rating: newReview.rating,
        comment: newReview.comment,
        date: new Date().toLocaleDateString("uz-UZ"),
      });

      setNewReview({ rating: 5, comment: "" });
      alert("Sharh qo'shildi!");
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm("Sharhni o'chirishni xohlaysizmi?")) return;

    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        $api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }

      const response = await $api.delete(`/review/delete/my/${reviewId}`);

      if (response.data.status === 200 || response.status === 200) {
        removeReview(reviewId);
        alert("Sharh o'chirildi!");
      }
    } catch (error) {
      console.error("Sharhni o'chirishda xatolik:", error);
      removeReview(reviewId);
      alert("Sharh o'chirildi!");
    }
  };

  const canReview = (order) => {
    return (
      order.status === "delivered" && getOrderReviews(order.id).length === 0
    );
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchOrders(newPage);
    }
  };

  const handleShowQRCode = () => {
    setShowQRCode(true);
  };

  const handleCloseQRCode = () => {
    setShowQRCode(false);
  };

  const handleRefresh = async () => {
    setError(null);
    await getUserProfile();
    await fetchOrders(currentPage);
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        await getUserProfile();
        await fetchOrders(currentPage);
      } catch (error) {
        console.error("Ma'lumotlarni yuklashda xatolik:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mening buyurtmalarim</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin mr-2" size={24} />
            <span>Buyurtmalar yuklanmoqda...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mening buyurtmalarim</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">
              <Truck size={48} className="mx-auto mb-2" />
              <p className="text-lg font-medium">Xatolik yuz berdi</p>
              <p className="text-sm mt-2">{error}</p>
            </div>
            <button
              onClick={handleRefresh}
              className="bg-[#249B73] text-white cursor-pointer px-4 py-2 rounded-lg hover:bg-[#1e8560] transition-colors"
            >
              Qayta urinish
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selectedOrder) {
    const orderReviews = getOrderReviews(selectedOrder.id);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedOrder(null)}
              className="text-green-600 cursor-pointer hover:text-green-800"
            >
              ← Orqaga
            </button>
            <CardTitle>Buyurtma #{selectedOrder.id}</CardTitle>
            {selectedOrder.qrCode && (
              <button
                onClick={handleShowQRCode}
                className="flex items-center gap-2 bg-[#249B73] text-white px-3 py-1 rounded-lg cursor-pointer hover:bg-[#1e8560] transition-colors"
              >
                <QrCode size={16} />
                QR Kod
              </button>
            )}
            <a
              href="https://ofd.soliq.uz/epi?t=EZ000000000947&r=50&c=20251018100000&s=386572473279"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-lg cursor-pointer bg-[#249B73] text-white flex items-center gap-2 hover:bg-[#1e8560] transition-colors"
            >
              <Download size={16} />
              Chekni yuklab olish
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Sana</p>
                  <p className="font-medium">{selectedOrder.date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span
                    className={`inline-flex px-2 py-1 rounded text-sm ${getStatusColor(
                      selectedOrder.status
                    )}`}
                  >
                    {getStatusText(selectedOrder.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">To'lov holati</p>
                  <span
                    className={`inline-flex px-2 py-1 rounded text-sm ${
                      selectedOrder.paid
                        ? "text-green-600 bg-green-100"
                        : "text-green-600 bg-green-100"
                    }`}
                  >
                    {selectedOrder.paid ? "To'langan" : "To'langan"}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">To'lov usuli</p>
                  <p className="font-medium">
                    {selectedOrder.paymentMethodOnline ? "Online" : "Naqd"}
                  </p>
                </div>
                {selectedOrder.customerInfo && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Yetkazish manzili</p>
                    <p className="font-medium">
                      {selectedOrder.customerInfo.region}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Mahsulotlar</p>
                <div className="space-y-3">
                  {selectedOrder.products.map((product, index) => (
                    <div
                      key={`${product.id}-${index}`}
                      className="flex justify-between items-center p-3 bg-white rounded border"
                    >
                      <div className="flex items-center gap-3">
                        {product.image && (
                          <img
                            src={
                              product.image.startsWith("http")
                                ? product.image
                                : `https://bsmarket.uz/api/${product.image}`
                            }
                            alt={product.name}
                            loading="lazy"
                            decoding="async"
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.src =
                                "/images/placeholder-product.jpg";
                            }}
                          />
                        )}
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.variant && (
                            <p className="text-sm text-gray-600">
                              {product.variant.color &&
                                `Rang: ${product.variant.color}`}
                              {product.variant.unit &&
                                ` • O'lchov: ${product.variant.unit}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {product.quantity} x {formatPrice(product.price)} so'm
                        </p>
                        <p className="text-sm text-gray-600">
                          = {formatPrice(product.price * product.quantity)} so'm
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Jami:</span>
                    <span className="text-[#249B73]">
                      {formatPrice(selectedOrder.total)} so'm
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {canReview(selectedOrder) && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-4">Sharh qoldiring</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Baho
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() =>
                            setNewReview((prev) => ({ ...prev, rating: star }))
                          }
                          className={`${
                            star <= newReview.rating
                              ? "text-yellow-500"
                              : "text-gray-300"
                          } hover:text-yellow-500 transition-colors cursor-pointer`}
                        >
                          <Star
                            size={24}
                            fill={
                              star <= newReview.rating ? "currentColor" : "none"
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Izoh
                    </label>
                    <textarea
                      value={newReview.comment}
                      onChange={(e) =>
                        setNewReview((prev) => ({
                          ...prev,
                          comment: e.target.value,
                        }))
                      }
                      className="w-full p-3 outline-none border rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      rows="4"
                      placeholder="Buyurtma haqida fikringizni yozing..."
                    />
                  </div>
                  <button
                    onClick={handleCreateReview}
                    disabled={!newReview.comment.trim()}
                    className="flex items-center cursor-pointer gap-2 bg-[#249B73] text-white px-4 py-2 rounded-lg hover:bg-[#1e8560] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={16} />
                    Sharh yuborish
                  </button>
                </div>
              </div>
            )}

            {orderReviews.length > 0 && (
              <div>
                <h3 className="font-semibold mb-4">Sizning sharhingiz</h3>
                <div className="space-y-4">
                  {orderReviews.map((review) => (
                    <div
                      key={review.id}
                      className="border rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={16}
                                className={
                                  star <= review.rating
                                    ? "text-yellow-500"
                                    : "text-gray-300"
                                }
                                fill={
                                  star <= review.rating
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">
                            {review.date}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleDeleteReview(review._id || review.id)
                          }
                          className="text-red-600 hover:text-red-800 cursor-pointer p-1 transition-colors"
                          title="Sharhni o'chirish"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-gray-700">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {showQRCode && selectedOrder.qrCode && (
          <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-[150] backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full relative">
              <button
                onClick={handleCloseQRCode}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                <X size={24} />
              </button>

              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">
                  Buyurtma QR Kodi #{selectedOrder.id}
                </h3>

                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <img
                    src={selectedOrder.qrCode}
                    alt="QR Code"
                    loading="lazy"
                    decoding="async"
                    className="mx-auto max-w-full h-auto"
                    style={{ maxWidth: "300px", maxHeight: "300px" }}
                  />
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Ushbu QR kodni kuryer yoki pickup punktida ko'rsating
                </p>

                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleCloseQRCode}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 cursor-pointer transition-colors"
                  >
                    Yopish
                  </button>

                  <button
                    onClick={() => {
                      const newWindow = window.open("", "_blank");
                      newWindow.document.write(`
                        <html>
                          <head><title>QR Code - Buyurtma #${selectedOrder.id}</title></head>
                          <body style="display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background-color: #f5f5f5;">
                            <div style="text-align: center; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                              <h2>Buyurtma #${selectedOrder.id}</h2>
                              <img src="${selectedOrder.qrCode}" alt="QR Code" style="max-width: 100%; height: auto;" />
                              <p style="margin-top: 10px; color: #666;">QR kodni kuryer yoki pickup punktida ko'rsating</p>
                            </div>
                          </body>
                        </html>
                      `);
                      newWindow.document.close();
                    }}
                    className="px-4 py-2 bg-[#249B73] text-white rounded-lg hover:bg-[#1e8560] cursor-pointer transition-colors"
                  >
                    Chop etish
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Mening buyurtmalarim</CardTitle>
          <button
            onClick={handleRefresh}
            className="text-sm bg-gray-100 hover:bg-gray-200 px-3 cursor-pointer py-1 rounded-lg transition-colors"
          >
            Yangilash
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <Truck size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">Buyurtmalar mavjud emas.</p>
              <p className="text-gray-400 text-sm">
                Birinchi buyurtmangizni bering!
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-green-200 transition-colors hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Truck size={20} className="text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          Buyurtma #{order.id}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.date} • {order.items} ta mahsulot
                        </p>
                        {order.customerInfo && (
                          <p className="text-xs text-gray-400 mt-1">
                            {order.customerInfo.region}
                          </p>
                        )}
                        <div className="flex gap-2 mt-1">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs ${
                              order.paid
                                ? "text-green-600 bg-green-100"
                                : "text-green-600 bg-green-100"
                            }`}
                          >
                            {order.paid ? "To'langan" : "To'langan"}
                          </span>
                          {order.canceled && (
                            <span className="inline-flex px-2 py-0.5 rounded text-xs text-red-600 bg-red-100">
                              Bekor qilingan
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="flex items-center gap-2 text-green-600 hover:text-green-800 cursor-pointer px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Eye size={16} />
                        Ko'rish
                      </button>

                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusText(order.status)}
                      </span>

                      <p className="font-semibold text-gray-900 min-w-[120px] text-right">
                        {formatPrice(order.total)} so'm
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                  >
                    Oldingi
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 border rounded-lg cursor-pointer transition-colors ${
                          page === currentPage
                            ? "bg-[#249B73] text-white border-[#249B73]"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border cursor-pointer rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                  >
                    Keyingi
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Orders;
