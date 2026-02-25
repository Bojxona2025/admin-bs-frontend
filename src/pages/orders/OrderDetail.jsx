import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  Package,
  User,
  Calendar,
  MessageCircle,
  Truck,
  Copy,
  Edit,
  MoreVertical,
  CreditCard,
  Receipt,
  Printer,
  Eye,
  EyeOff,
  User2,
  X,
  Save,
} from "lucide-react";
import { getRoleLabelUz } from "../../utils/roleLabel";
import { Link, useLocation, useParams } from "react-router-dom";
import $api from "../../http/api";
import UpdateOrderModal from "../../components/modals/order/OrderUpdateModal";
import { formatDate } from "../../utils/functions/functions.utils";
import { getColorName } from "../../utils/colorUtils";
import LazyImage from "../../components/image/LazyImage";

export const OrderDetailsPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const [copied, setCopied] = useState(false);
  const [orderData, setOrderData] = useState({});
  const [updateData, setUpdateData] = useState({
    sellingPrice: "",
    location: "",
    status: "qabul_qilinmagan",
    paid: false,
    paymentMethodOnline: false,
    canceled: false,
  });
  const [variantData, setVariantData] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  async function handleUpdateOrder() {
    setIsUpdating(true);
    try {
      let { data } = await $api.patch(`/order/update/${id}`, updateData);
      console.log("Order updated successfully:", data);
    } catch (error) {
      console.error("Error updating order:", error);
    } finally {
      setIsUpdating(false);
    }
  }

  async function fetchOrder() {
    try {
      let { data } = await $api.get(`/order/get/by/${id}`);
      setOrderData(data.orderData);
      setVariantData(data.variantData);
      setUpdateData({
        sellingPrice: data.orderData.sellingPrice || "",
        location: data.orderData.location || "",
        status: data.orderData.status,
        paid: data.orderData.paid,
        paymentMethodOnline: data.orderData.paymentMethodOnline,
        canceled: data.orderData.canceled,
      });
    } catch (error) {
      console.log(error);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat("uz-UZ").format(num);
  };

  // Get the actual unit price per item
  const getUnitPrice = () => {
    if (orderData.productQuantity && orderData.sellingPrice) {
      return parseInt(orderData.sellingPrice) / orderData.productQuantity;
    }
    return variantData.price || 0;
  };

  const receiptData = {
    company: "BestMarket.uz MCHJ",
    stir: "305008734",
    qqsStatus: "To'lovchisi",
    address: "Toshkent shahar, Chilonzor tumani",
    phone: "+998 90 123-45-67",
    email: "info@bestmarket.uz",
    date: orderData.createdAt
      ? new Date(orderData.createdAt).toLocaleString("uz-UZ")
      : "",
    receiptNumber: orderData._id ? `#${orderData._id.slice(-8)}` : "",
    transactionId: orderData._id ? `TXN-${orderData._id.slice(-12)}` : "",
    customer: orderData.userId
      ? `${orderData.userId.firstName} ${orderData.userId.lastName}`
      : "",
    customerPhone: orderData.userId ? orderData.userId.phoneNumber : "",
    items: [
      {
        name: orderData.productId ? orderData.productId.name : "iPhone 15",
        qty: orderData.productQuantity || 0,
        price: parseInt(orderData.sellingPrice) || 0,
        unitPrice: getUnitPrice(),
        color: getColorName(variantData?.color),
      },
    ],
    discount: variantData?.discount || 0,
    vat: orderData.sellingPrice
      ? Math.round(parseInt(orderData.sellingPrice) * 0.12)
      : 0,
    total: parseInt(orderData.sellingPrice) || 0,
    paymentMethod: orderData.paymentMethodOnline
      ? "Online to'lov"
      : "Naqd to'lov",
    delivery: "Bepul",
    deliveryAddress: orderData.location || "",
  };

  // Get status text and color
  const getStatusInfo = (status) => {
    switch (status) {
      case "qabul_qilinmagan":
        return { text: "Qabul qilinmagan", color: "orange" };
      case "jarayonda":
        return { text: "Jarayonda", color: "green" };
      case "yetkazish_jarayonida":
        return { text: "Yetkazish jarayonida", color: "yellow" };
      case "yetkazilgan":
        return { text: "Yetkazilgan", color: "green" };
    }
  };

  const statusInfo = getStatusInfo(orderData.status);

  const copyUrlToClipboard = () => {
    setCopied(true);
    const fixedUrl = `${
      import.meta.env.VITE_FRONTEND_URL +
      location.pathname +
      location.search +
      location.hash
    }`;

    // Fallback usul: HTTPS bo‘lmasa ham ishlaydi
    const textarea = document.createElement("textarea");
    textarea.value = fixedUrl;
    document.body.appendChild(textarea);
    textarea.select();

    document.execCommand("copy");

    document.body.removeChild(textarea);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white">
        <div className="mx-auto py-4 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to={-1}
                className="p-2 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Buyurtma tafsilotlari
                </h1>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-sm text-gray-500">ID:</span>
                  <code className="text-sm text-gray-700 font-mono">
                    {location.pathname + location.search + location.hash}
                  </code>
                  <button
                    onClick={copyUrlToClipboard}
                    className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span
                className={`px-3 py-1 bg-${statusInfo?.color}-100 text-${statusInfo?.color}-800 text-sm font-medium rounded-full`}
              >
                {statusInfo?.text}
              </span>
              <button
                className="px-4 py-2 text-white transition-colors cursor-pointer"
                style={{ backgroundColor: "#1F75A8" }}
                onClick={() => setShowUpdateModal(true)}
              >
                Tahrirlash
              </button>
            </div>
          </div>
        </div>
      </div>
      <UpdateOrderModal
        showUpdateModal={showUpdateModal}
        setShowUpdateModal={setShowUpdateModal}
        updateData={updateData}
        setUpdateData={setUpdateData}
        handleUpdateOrder={handleUpdateOrder}
        isUpdating={isUpdating}
      />
      <div className="mx-auto py-8 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Information */}
            <div className="bg-white shadow-sm border p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center">
                    {variantData?.mainImg && (
                      <LazyImage
                        src={`${import.meta.env.VITE_BASE_URL}/${
                          variantData?.mainImg
                        }`}
                        alt={`Product Image`}
                        className="w-24 h-24 object-cover rounded-md cursor-pointer"
                      />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {orderData.productId?.name || "iPhone 15"}
                    </h2>
                    <p className="text-gray-600 text-sm">
                      Mahsulot ID:{" "}
                      <Link
                        to={`/product/${orderData.productId?._id}`}
                        className="text-[#0404fa] cursor-pointer hover:underline"
                      >
                        {orderData.productId?._id}
                      </Link>
                    </p>
                    <p className="text-gray-600 text-sm">
                      Miqdor: {orderData.productQuantity}{" "}
                      {variantData?.unit || "dona"}
                    </p>
                    <p className="text-gray-600 text-sm">
                      Rang:{" "}
                      {getColorName(variantData?.color) || "Belgilanmagan"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {parseInt(orderData.sellingPrice || 0).toLocaleString()} UZS
                  </p>
                  <p className="text-sm text-gray-500">Umumiy narx</p>
                  {variantData?.discount > 0 && (
                    <p className="text-sm text-red-500">
                      Chegirma: {variantData.discount}%
                    </p>
                  )}
                </div>
              </div>
              <div className="border-t pt-4 flex gap-2 pb-4 flex-wrap">
                {Array.isArray(variantData?.productImages) &&
                  variantData.productImages.map((image, index) => (
                    <LazyImage
                      key={index}
                      src={`${import.meta.env.VITE_BASE_URL}/${image}`}
                      alt={`Product Image ${index + 1}`}
                      className="w-24 h-24 object-cover rounded-md cursor-pointer"
                    />
                  ))}
              </div>
              {/* Payment Status */}
              <div className="border-t pt-4">
                <div
                  className={`flex items-center justify-between p-4 ${
                    orderData.paid
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 ${
                        orderData.paid ? "bg-green-600" : "bg-red-600"
                      } flex items-center justify-center`}
                    >
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p
                        className={`font-medium ${
                          orderData.paid ? "text-green-800" : "text-red-800"
                        }`}
                      >
                        {orderData.paid
                          ? "To'lov amalga oshirildi"
                          : "To'lov kutilmoqda"}
                      </p>
                      <p
                        className={`text-sm ${
                          orderData.paid ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {orderData.paymentMethodOnline
                          ? "Online to'lov"
                          : "Naqd to'lov"}
                      </p>
                    </div>
                  </div>
                  <CreditCard
                    className={`w-5 h-5 ${
                      orderData.paid ? "text-green-600" : "text-red-600"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Receipt Section */}
            <div className="bg-white shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Receipt className="w-6 h-6" style={{ color: "#1F75A8" }} />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Elektron chek
                  </h3>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowReceipt(!showReceipt)}
                    className="flex cursor-pointer items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 font-medium transition-colors"
                  >
                    {showReceipt ? <EyeOff size={16} /> : <Eye size={16} />}
                    {showReceipt ? "Yashirish" : "Ko'rish"}
                  </button>
                  {showReceipt && (
                    <button
                      onClick={handlePrint}
                      className="flex cursor-pointer items-center gap-2 px-4 py-2 text-white font-medium transition-colors"
                      style={{ backgroundColor: "#1F75A8" }}
                    >
                      <Printer size={16} />
                      Chiqarish
                    </button>
                  )}
                </div>
              </div>

              {showReceipt && (
                <div className="mt-6 flex justify-start">
                  <div
                    id="receipt"
                    className="bg-white shadow-lg border-2 border-gray-200"
                    style={{
                      width: "320px",
                      fontFamily: "Courier New, monospace",
                      fontSize: "12px",
                      lineHeight: "1.2",
                    }}
                  >
                    <div className="p-4">
                      {/* Header */}
                      <div className="text-center border-b-2 border-dashed border-gray-400 pb-3 mb-3">
                        <div className="font-bold text-sm mb-1">
                          ONLINE MARKET CHECK
                        </div>
                        <div className="text-xs">
                          ─────────────────────────────────────
                        </div>
                      </div>

                      {/* Company Info */}
                      <div className="text-xs mb-3 space-y-1">
                        <div>
                          <strong>Sotuvchi:</strong> "{receiptData.company}"
                        </div>
                        <div>
                          <strong>STIR:</strong> {receiptData.stir} |{" "}
                          <strong>QQS:</strong> {receiptData.qqsStatus}
                        </div>
                        <div>
                          <strong>Manzil:</strong> {receiptData.address}
                        </div>
                        <div>
                          <strong>Tel:</strong> {receiptData.phone}
                        </div>
                        <div>
                          <strong>Email:</strong> {receiptData.email}
                        </div>
                      </div>

                      {/* Transaction Info */}
                      <div className="text-xs mb-3 space-y-1 border-t border-dashed border-gray-400 pt-2">
                        <div>
                          <strong>Sana:</strong> {receiptData.date}
                        </div>
                        <div>
                          <strong>Chek raqami:</strong>{" "}
                          {receiptData.receiptNumber}
                        </div>
                        <div>
                          <strong>Tranzaksiya ID:</strong>{" "}
                          {receiptData.transactionId}
                        </div>
                        <div>
                          <strong>Xaridor:</strong> {receiptData.customer}
                        </div>
                        <div>
                          <strong>Tel:</strong> {receiptData.customerPhone}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="text-xs mb-3 border-t border-dashed border-gray-400 pt-2">
                        <div className="font-bold mb-2">Mahsulotlar:</div>
                        {receiptData.items.map((item, index) => (
                          <div key={index} className="mb-1">
                            <div>
                              {index + 1}. {item.name}
                              {item.color && ` (${item.color})`}
                            </div>
                            <div className="text-right">
                              {formatNumber(item.unitPrice)} so'm x{item.qty} ={" "}
                              {formatNumber(item.price)} so'm
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="text-xs mb-3 border-t border-dashed border-gray-400 pt-2">
                        {receiptData.discount > 0 && (
                          <div className="flex justify-between">
                            <span>Chegirma ({receiptData.discount}%):</span>
                            <span>
                              -
                              {formatNumber(
                                Math.round(
                                  (receiptData.total * receiptData.discount) /
                                    100
                                )
                              )}{" "}
                              so'm
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>QQS: 12% =</span>
                          <span>{formatNumber(receiptData.vat)} so'm</span>
                        </div>
                        <div className="flex justify-between font-bold text-sm border-t border-solid border-gray-400 pt-1 mt-1">
                          <span>JAMI TO'LOV:</span>
                          <span>{formatNumber(receiptData.total)} so'm</span>
                        </div>
                      </div>

                      {/* Payment & Delivery */}
                      <div className="text-xs mb-3 border-t border-dashed border-gray-400 pt-2">
                        <div>
                          <strong>To'lov usuli:</strong>{" "}
                          {receiptData.paymentMethod}
                        </div>
                        <div>
                          <strong>Yetkazib berish:</strong>{" "}
                          {receiptData.delivery}
                        </div>
                        <div>
                          <strong>Manzil:</strong> {receiptData.deliveryAddress}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="text-center text-xs border-t-2 border-dashed border-gray-400 pt-3">
                        <div className="font-bold mb-1">
                          Rahmat! Xaridingiz uchun tashakkur!
                        </div>
                        <div className="mb-2">
                          Elektron chek: qonuniy hujjat hisoblanadi.
                        </div>
                        <div>─────────────────────────────────────</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Order Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white shadow-sm border p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <Calendar className="w-5 h-5" style={{ color: "#1F75A8" }} />
                  <h3 className="font-medium text-gray-900">Buyurtma sanasi</h3>
                </div>
                <p className="text-gray-700">
                  {orderData.createdAt
                    ? new Date(orderData.createdAt).toLocaleDateString(
                        "uz-UZ",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )
                    : ""}
                </p>
              </div>

              <div className="bg-white shadow-sm border p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <MapPin className="w-5 h-5" style={{ color: "#1F75A8" }} />
                  <h3 className="font-medium text-gray-900">
                    Yetkazib berish manzili
                  </h3>
                </div>
                <p className="text-gray-700">{orderData.location?.address}</p>
              </div>

              <div className="bg-white shadow-sm border p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <Truck className="w-5 h-5" style={{ color: "#1F75A8" }} />
                  <h3 className="font-medium text-gray-900">Yetkazib berish</h3>
                </div>
                <p className="text-gray-700">Standart yetkazib berish</p>
              </div>

              <div className="bg-white shadow-sm border p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <CreditCard
                    className="w-5 h-5"
                    style={{ color: "#1F75A8" }}
                  />
                  <h3 className="font-medium text-gray-900">To'lov holati</h3>
                </div>
                <p className="text-gray-700">
                  {orderData.paid ? "To'langan" : "To'lanmagan"}
                </p>
              </div>
            </div>

            {/* Order Timeline */}
            <div className="bg-white shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Buyurtma holati
              </h3>
              <div className="space-y-4">
                {[
                  {
                    step: "Buyurtma qabul qilindi",
                    time: orderData.createdAt
                      ? new Date(orderData.createdAt).toLocaleString("uz-UZ")
                      : "",
                    completed: true,
                  },
                  {
                    step: "To'lov tasdiqlandi",
                    time: orderData.paid
                      ? new Date(orderData.createdAt).toLocaleString("uz-UZ")
                      : "",
                    completed: orderData.paid,
                  },
                  {
                    step: "Mahsulot tayyorlanmoqda",
                    time: "",
                    completed: ["tayyorlanmoqda", "yetkazildi"].includes(
                      orderData.status
                    ),
                    current: orderData.status === "tayyorlanmoqda",
                  },
                  {
                    step: "Yetkazib berishga tayyor",
                    time: "",
                    completed: orderData.status === "yetkazildi",
                    current: orderData.status === "yetkazib_berish",
                  },
                  {
                    step: "Yetkazildi",
                    time:
                      orderData.status === "yetkazildi"
                        ? new Date().toLocaleString("uz-UZ")
                        : "",
                    completed: orderData.status === "yetkazildi",
                  },
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div
                      className={`mt-1 w-4 h-4 rounded-full border-2 ${
                        item.completed
                          ? "bg-green-600 border-green-600"
                          : item.current
                          ? "border-green-600"
                          : "border-gray-300"
                      }`}
                      style={item.current ? { borderColor: "#1F75A8" } : {}}
                    >
                      {item.completed && (
                        <CheckCircle className="w-4 h-4 text-white -m-0.5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          item.completed || item.current
                            ? "text-gray-900"
                            : "text-gray-500"
                        }`}
                      >
                        {item.step}
                      </p>
                      {item.time && (
                        <p className="text-sm text-gray-500 mt-1">
                          {item.time}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Information */}
            <div className="bg-white shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Mijoz ma'lumotlari
              </h3>

              <div className="flex items-center space-x-3 mb-4">
                <div
                  className="w-12 h-12 flex items-center justify-center"
                  style={{ backgroundColor: "#1F75A8" }}
                >
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {orderData.userId?.firstName} {orderData.userId?.lastName}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">
                    {getRoleLabelUz(orderData.userId?.role)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-gray-50">
                  <Phone className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-900">
                    {orderData.userId?.phoneNumber}
                  </span>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-50">
                  <MapPin className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-900">
                    {orderData.location?.address}
                  </span>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-50">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-900 text-sm">
                    Oxirgi faollik:{" "}
                    {orderData.userId?.last_activity
                      ? formatDate(orderData.userId.last_activity)
                      : ""}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Link
                  to={`/user/${orderData.userId?._id}`}
                  className="w-full inline-block py-2 text-white text-center transition-colors"
                  style={{ backgroundColor: "#1F75A8" }}
                >
                  <User2 className="w-4 h-4 inline mr-2" />
                  Profilni ko'rish
                </Link>
                <a
                  href="tel:+998901234567"
                  className="w-full inline-block py-2 text-white text-center transition-colors"
                  style={{ backgroundColor: "#1F75A8" }}
                >
                  <Phone className="w-4 h-4 inline mr-2" />
                  Qo'ng'iroq qilish
                </a>
                <a
                  href={`sms:${orderData.userId?.phoneNumber}`}
                  className="w-full inline-block py-2 border border-gray-300 text-gray-700 text-center hover:bg-gray-50 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 inline mr-2" />
                  SMS yuborish
                </a>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Buyurtma xulosasi
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {orderData.productId?.name} ({orderData.productQuantity}x):
                  </span>
                  <span className="text-gray-900">
                    {formatNumber(getUnitPrice())} UZS
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Miqdor:</span>
                  <span className="text-gray-900">
                    {orderData?.productQuantity} {variantData?.unit}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Yetkazib berish:</span>
                  <span className="text-gray-900">0 UZS</span>
                </div>
                {variantData?.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Chegirma ({variantData.discount}%):
                    </span>
                    <span className="text-red-600">
                      -
                      {formatNumber(
                        Math.round(
                          (parseInt(
                            variantData.price * orderData.productQuantity || 0
                          ) *
                            variantData.discount) /
                            100
                        )
                      )}{" "}
                      UZS
                    </span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">
                      Jami:
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {parseInt(orderData.sellingPrice || 0).toLocaleString()}{" "}
                      UZS
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt,
          #receipt * {
            visibility: visible;
          }
          #receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: none !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
};
