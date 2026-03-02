import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  User,
  Calendar,
  MessageCircle,
  Truck,
  Copy,
  CreditCard,
  Receipt,
  Printer,
  Download,
  Eye,
  EyeOff,
  User2,
  ExternalLink,
} from "lucide-react";
import { getRoleLabelUz } from "../../utils/roleLabel";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import $api from "../../http/api";
import UpdateOrderModal from "../../components/modals/order/OrderUpdateModal";
import { formatDate } from "../../utils/functions/functions.utils";
import { getColorName } from "../../utils/colorUtils";
import LazyImage from "../../components/image/LazyImage";

const formatMoney = (value) => `${new Intl.NumberFormat("uz-UZ").format(Number(value) || 0)} so'm`;
const BRAND_LOGO = "/images/telegram-cloud-document-2-5352691370182082102.jpg";
const PROJECT_NAME = "BS-MARKET";

const getAddressText = (location) => {
  if (!location) return "Noma'lum";
  if (typeof location === "string") return location;
  return location.address || location.name || "Noma'lum";
};

const resolveOrderItems = (orderData, variantData) => {
  if (Array.isArray(orderData?.items) && orderData.items.length) {
    return orderData.items.map((item, index) => {
      const qty = Number(item?.productQuantity ?? item?.quantity ?? 1);
      const lineTotal = Number(item?.totalSellingPrice ?? item?.sellingPrice);
      const unitPrice = Number(item?.price ?? item?.variantPrice ?? 0);
      const safeLine = Number.isFinite(lineTotal) && lineTotal > 0 ? lineTotal : unitPrice * qty;
      const productName =
        item?.productId?.name ||
        item?.product?.name ||
        orderData?.productId?.name ||
        `Mahsulot ${index + 1}`;
      return {
        key: item?._id || `${productName}-${index}`,
        name: productName,
        qty,
        total: safeLine,
        unitPrice: qty > 0 ? safeLine / qty : 0,
        color: getColorName(item?.color || variantData?.color),
      };
    });
  }

  const qty = Number(orderData?.productQuantity || 1);
  const fallbackTotal = Number(orderData?.totalSellingPrice ?? orderData?.sellingPrice ?? 0);
  const safeTotal = Number.isFinite(fallbackTotal) ? fallbackTotal : 0;
  return [
    {
      key: "single-item",
      name: orderData?.productId?.name || "N/A",
      qty,
      total: safeTotal,
      unitPrice: qty > 0 ? safeTotal / qty : 0,
      color: getColorName(variantData?.color),
    },
  ];
};

const getOrderTotal = (orderData, items) => {
  const direct = Number(orderData?.totalSellingPrice ?? orderData?.sellingPrice);
  if (Number.isFinite(direct) && direct > 0) return direct;
  return items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
};

const getStatusInfo = (status) => {
  switch (status) {
    case "qabul_qilinmagan":
      return {
        text: "Qabul qilinmagan",
        className: "bg-orange-100 text-orange-700 border border-orange-200",
      };
    case "jarayonda":
      return { text: "Jarayonda", className: "bg-blue-100 text-blue-700 border border-blue-200" };
    case "yetkazish_jarayonida":
      return {
        text: "Yetkazish jarayonida",
        className: "bg-amber-100 text-amber-700 border border-amber-200",
      };
    case "yetkazilgan":
      return {
        text: "Yetkazilgan",
        className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      };
    default:
      return { text: "Noma'lum", className: "bg-slate-100 text-slate-700 border border-slate-200" };
  }
};

const openYandexMap = (location) => {
  const lat = location?.la || location?.lat || location?.latitude;
  const lon = location?.lo || location?.lng || location?.lon || location?.longitude;
  const address = getAddressText(location);
  const url =
    lat && lon
      ? `https://yandex.com/maps/?pt=${encodeURIComponent(`${lon},${lat}`)}&z=16&l=map`
      : `https://yandex.com/maps/?text=${encodeURIComponent(address)}`;
  window.open(url, "_blank", "noopener,noreferrer");
};

const loadImage = (src) =>
  new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

export const OrderDetailsPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [orderData, setOrderData] = useState({});
  const [updateData, setUpdateData] = useState({
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
  const [actionHint, setActionHint] = useState("");
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  useEffect(() => {
    if (!actionHint) return;
    const t = setTimeout(() => setActionHint(""), 1800);
    return () => clearTimeout(t);
  }, [actionHint]);

  const userInfo = orderData?.user || orderData?.userId || {};
  const items = useMemo(() => resolveOrderItems(orderData, variantData), [orderData, variantData]);
  const totalPrice = useMemo(() => getOrderTotal(orderData, items), [orderData, items]);
  const totalQty = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
    [items]
  );
  const statusInfo = getStatusInfo(orderData?.status);

  async function handleUpdateOrder() {
    setIsUpdating(true);
    try {
      const normalizedLocation =
        typeof updateData.location === "string"
          ? updateData.location.trim()
          : getAddressText(updateData.location).trim();
      const fallbackLocation = getAddressText(orderData?.location).trim();
      const payload = {
        ...updateData,
        location: normalizedLocation || fallbackLocation,
      };
      await $api.patch(`/order/update/${id}`, payload);
      await fetchOrder();
      setShowUpdateModal(false);
      setActionHint("Buyurtma yangilandi");
    } finally {
      setIsUpdating(false);
    }
  }

  async function fetchOrder() {
    try {
      const { data } = await $api.get(`/order/get/by/${id}`);
      const orderPayload = data?.orderData || data?.data?.orderData || data?.order || {};
      const variantPayload =
        data?.variantData || data?.data?.variantData || orderPayload?.variantId || {};
      setOrderData(orderPayload);
      setVariantData(variantPayload);
      setUpdateData({
        location: orderPayload?.location || "",
        status: orderPayload?.status || "qabul_qilinmagan",
        paid: Boolean(orderPayload?.paid),
        paymentMethodOnline: Boolean(orderPayload?.paymentMethodOnline),
        canceled: Boolean(orderPayload?.canceled),
      });
    } catch {
      setOrderData({});
      setVariantData({});
    }
  }

  const receiptData = {
    projectName: PROJECT_NAME,
    logo: BRAND_LOGO,
    company: "BS-MARKET",
    stir: "305008734",
    qqsStatus: "To'lovchisi",
    address: "Toshkent shahar, Chilonzor tumani",
    phone: "+998 90 123-45-67",
    email: "info@bestmarket.uz",
    date: orderData.createdAt ? new Date(orderData.createdAt).toLocaleString("uz-UZ") : "",
    receiptNumber: orderData._id ? `#${orderData._id.slice(-8)}` : "",
    transactionId: orderData._id ? `TXN-${orderData._id.slice(-12)}` : "",
    orderCode: orderData?.order_code || "-",
    orderId: orderData?._id || "-",
    receiverPvz: orderData?.receiverPvz || "-",
    scanToken: orderData?.scan_token || "",
    customer: `${userInfo?.firstName || ""} ${userInfo?.lastName || ""}`.trim(),
    customerPhone: userInfo?.phoneNumber || "",
    items,
    discount: Number(variantData?.discount || 0),
    vat: Math.round(totalPrice * 0.12),
    total: totalPrice,
    paymentMethod: orderData.paymentMethodOnline ? "Online to'lov" : "Naqd to'lov",
    delivery: "Bepul",
    deliveryAddress: getAddressText(orderData?.location),
  };

  const copyUrlToClipboard = async () => {
    const fixedUrl = `${window.location.origin}${location.pathname}${location.search}${location.hash}`;
    try {
      await navigator.clipboard.writeText(fixedUrl);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = fixedUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const copyPhone = async () => {
    if (!userInfo?.phoneNumber) return;
    try {
      await navigator.clipboard.writeText(userInfo.phoneNumber);
      setActionHint("Telefon raqami nusxalandi");
    } catch {
      setActionHint("Nusxalash muvaffaqiyatsiz");
    }
  };

  const callCustomer = () => {
    if (!userInfo?.phoneNumber) return;
    copyPhone();
    setActionHint("Qo'ng'iroq uchun raqam nusxalandi");
  };

  const smsCustomer = () => {
    if (!userInfo?.phoneNumber) return;
    copyPhone();
    setActionHint("SMS uchun raqam nusxalandi");
  };

  const handleDownloadReceipt = async () => {
    if (!orderData?.paid) {
      setActionHint("Chekni yuklash uchun avval to'lov amalga oshirilgan bo'lishi kerak");
      return;
    }
    setIsDownloadingReceipt(true);
    try {
      const canvas = document.createElement("canvas");
      const width = 980;
      const itemsCount = receiptData.items.length || 1;
      const height = 760 + itemsCount * 36;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas mavjud emas");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#0f172a";

      const logo = await loadImage(receiptData.logo);
      const qr = await loadImage(receiptData.scanToken);

      if (logo) {
        ctx.drawImage(logo, 42, 32, 84, 84);
      }
      ctx.font = "700 34px Arial";
      ctx.fillText(receiptData.projectName, 142, 74);
      ctx.font = "500 20px Arial";
      ctx.fillStyle = "#334155";
      ctx.fillText("Elektron to'lov cheki", 142, 104);

      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 136);
      ctx.lineTo(width - 40, 136);
      ctx.stroke();

      ctx.fillStyle = "#0f172a";
      ctx.font = "600 20px Arial";
      ctx.fillText(`Chek: ${receiptData.receiptNumber}`, 42, 178);
      ctx.fillText(`Buyurtma kodi: ${receiptData.orderCode}`, 42, 210);
      ctx.fillText(`Sana: ${receiptData.date}`, 42, 242);
      ctx.fillText(`To'lov turi: ${receiptData.paymentMethod}`, 42, 274);
      ctx.fillText(`Mijoz: ${receiptData.customer || "-"}`, 42, 306);
      ctx.fillText(`Telefon: ${receiptData.customerPhone || "-"}`, 42, 338);
      ctx.fillText(`Manzil: ${receiptData.deliveryAddress}`, 42, 370);

      const qrBoxX = width - 280;
      const qrBoxY = 156;
      const qrBoxW = 230;
      const qrBoxH = 240;
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH);
      ctx.strokeStyle = "#cbd5e1";
      ctx.strokeRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH);
      ctx.fillStyle = "#0f172a";
      ctx.font = "600 18px Arial";
      ctx.fillText("QR tekshiruv", qrBoxX + 46, qrBoxY + 32);
      if (qr) {
        ctx.drawImage(qr, qrBoxX + 35, qrBoxY + 48, 160, 160);
      } else {
        ctx.font = "500 14px Arial";
        ctx.fillText("QR mavjud emas", qrBoxX + 62, qrBoxY + 140);
      }
      ctx.font = "500 13px Arial";
      ctx.fillStyle = "#475569";
      ctx.fillText("Scanner bilan tekshirish mumkin", qrBoxX + 25, qrBoxY + qrBoxH - 14);

      const tableY = 432;
      ctx.fillStyle = "#0f172a";
      ctx.font = "700 19px Arial";
      ctx.fillText("Mahsulotlar", 42, tableY);
      ctx.font = "600 15px Arial";
      ctx.fillStyle = "#475569";
      ctx.fillText("Nomi", 42, tableY + 30);
      ctx.fillText("Soni", 560, tableY + 30);
      ctx.fillText("Narxi", 700, tableY + 30);
      ctx.beginPath();
      ctx.moveTo(40, tableY + 40);
      ctx.lineTo(width - 40, tableY + 40);
      ctx.stroke();

      let currentY = tableY + 72;
      receiptData.items.forEach((item, index) => {
        ctx.fillStyle = "#0f172a";
        ctx.font = "500 16px Arial";
        ctx.fillText(`${index + 1}. ${item.name}`, 42, currentY);
        ctx.fillText(`${item.qty}`, 565, currentY);
        ctx.fillText(formatMoney(item.total), 700, currentY);
        ctx.strokeStyle = "#e2e8f0";
        ctx.beginPath();
        ctx.moveTo(40, currentY + 14);
        ctx.lineTo(width - 40, currentY + 14);
        ctx.stroke();
        currentY += 36;
      });

      ctx.fillStyle = "#0f172a";
      ctx.font = "600 17px Arial";
      ctx.fillText(`Miqdor: ${totalQty} dona`, 42, currentY + 24);
      ctx.fillText(`Yetkazib berish: ${formatMoney(0)}`, 42, currentY + 52);
      ctx.font = "700 28px Arial";
      ctx.fillText(`Jami: ${formatMoney(receiptData.total)}`, 42, currentY + 98);

      const link = document.createElement("a");
      link.download = `chek-${receiptData.receiptNumber.replace("#", "") || "order"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setActionHint("Chek yuklab olindi");
    } catch {
      setActionHint("Chekni yuklab olishda xatolik yuz berdi");
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 p-4 sm:p-6">
      {actionHint && (
        <div className="fixed right-4 top-4 z-50 rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm text-emerald-700 shadow-lg">
          {actionHint}
        </div>
      )}

      <div className="mx-auto max-w-[1500px]">
        <div className="mb-4 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-xl border border-emerald-200 bg-white p-2 text-slate-600 hover:bg-emerald-50 cursor-pointer"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Buyurtma tafsilotlari</h1>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <code>{location.pathname}</code>
                  <button
                    onClick={copyUrlToClipboard}
                    className="cursor-pointer rounded p-1 hover:bg-slate-100"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusInfo.className}`}>
                {statusInfo.text}
              </span>
              <button
                className="rounded-lg bg-[#249B73] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f8966] cursor-pointer"
                onClick={() => setShowUpdateModal(true)}
              >
                Tahrirlash
              </button>
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {variantData?.mainImg && (
                    <LazyImage
                      src={`${import.meta.env.VITE_BASE_URL}/${variantData.mainImg}`}
                      alt="Mahsulot rasmi"
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <h2 className="text-3xl font-semibold text-slate-900">
                      {items?.[0]?.name || "N/A"}
                    </h2>
                    <p className="text-sm text-slate-600">Miqdor: {totalQty || 0} dona</p>
                    <p className="text-sm text-slate-600">
                      Rang: {items?.[0]?.color || "Belgilanmagan"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-slate-900">{formatMoney(totalPrice)}</p>
                  <p className="text-sm text-slate-500">Umumiy narx</p>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        orderData.paid ? "bg-emerald-600" : "bg-rose-600"
                      }`}
                    >
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className={`font-semibold ${orderData.paid ? "text-emerald-700" : "text-rose-700"}`}>
                        {orderData.paid ? "To'lov amalga oshirilgan" : "To'lov kutilmoqda"}
                      </p>
                      <p className="text-sm text-slate-600">
                        {orderData.paymentMethodOnline ? "Online to'lov" : "Naqd to'lov"}
                      </p>
                    </div>
                  </div>
                  <CreditCard className="h-5 w-5 text-slate-500" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-700" />
                  <h3 className="text-xl font-semibold text-slate-900">Elektron chek</h3>
                </div>
                {orderData.paid && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowReceipt((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      {showReceipt ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showReceipt ? "Yashirish" : "Ko'rish"}
                    </button>
                    {showReceipt && (
                      <>
                        <button
                          onClick={handleDownloadReceipt}
                          disabled={isDownloadingReceipt}
                          className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 cursor-pointer disabled:opacity-60"
                        >
                          <Download className="h-4 w-4" />
                          {isDownloadingReceipt ? "Yuklanmoqda..." : "Yuklab olish"}
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-2 rounded-lg bg-[#249B73] px-3 py-2 text-sm font-medium text-white hover:bg-[#1f8966] cursor-pointer"
                        >
                          <Printer className="h-4 w-4" />
                          Chiqarish
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {!orderData.paid && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Chek faqat to'lov amalga oshirilgandan keyin chiqariladi.
                </div>
              )}

              {orderData.paid && showReceipt && (
                <div id="receipt" className="rounded-xl border border-slate-200 p-5 bg-white">
                  <div className="flex flex-col gap-4 border-b border-dashed border-slate-300 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={receiptData.logo}
                        alt="BS Market logo"
                        className="h-14 w-14 rounded-full border border-slate-200 object-cover"
                      />
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">{receiptData.projectName}</h4>
                        <p className="text-xs text-slate-500">Elektron to'lov cheki</p>
                        <p className="text-xs text-slate-500">STIR: {receiptData.stir}</p>
                      </div>
                    </div>

                    {receiptData.scanToken && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <img
                          src={receiptData.scanToken}
                          alt="Scan token QR"
                          className="h-24 w-24 object-contain"
                        />
                        <p className="mt-1 text-[10px] text-center text-slate-500">QR tekshirish</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <p>Chek: <span className="font-semibold text-slate-800">{receiptData.receiptNumber}</span></p>
                    <p>Tranzaksiya: <span className="font-semibold text-slate-800">{receiptData.transactionId}</span></p>
                    <p>Buyurtma ID: <span className="font-semibold text-slate-800">{receiptData.orderId}</span></p>
                    <p>Buyurtma kodi: <span className="font-semibold text-slate-800">{receiptData.orderCode}</span></p>
                    <p>Sana: <span className="font-semibold text-slate-800">{receiptData.date}</span></p>
                    <p>To'lov turi: <span className="font-semibold text-slate-800">{receiptData.paymentMethod}</span></p>
                    <p>Mijoz: <span className="font-semibold text-slate-800">{receiptData.customer || "-"}</span></p>
                    <p>Tel: <span className="font-semibold text-slate-800">{receiptData.customerPhone || "-"}</span></p>
                    <p className="sm:col-span-2">
                      Manzil: <span className="font-semibold text-slate-800">{receiptData.deliveryAddress}</span>
                    </p>
                  </div>

                  <div className="mt-4 rounded-lg border border-slate-200">
                    <div className="grid grid-cols-12 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                      <p className="col-span-7">Mahsulot</p>
                      <p className="col-span-2 text-center">Miqdor</p>
                      <p className="col-span-3 text-right">Narx</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {receiptData.items.map((item, index) => (
                        <div key={item.key || index} className="grid grid-cols-12 px-3 py-2 text-sm">
                          <p className="col-span-7 text-slate-700">{index + 1}. {item.name}</p>
                          <p className="col-span-2 text-center text-slate-600">{item.qty}</p>
                          <p className="col-span-3 text-right font-semibold text-slate-900">
                            {formatMoney(item.total)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 space-y-1 border-t border-dashed border-slate-300 pt-3 text-sm">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Miqdor</span>
                      <span>{totalQty} dona</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Yetkazib berish</span>
                      <span>{formatMoney(0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-lg font-bold text-slate-900">
                      <span>Jami</span>
                      <span>{formatMoney(receiptData.total)}</span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
                    Ushbu chek {receiptData.projectName} tizimida avtomatik yaratildi.
                    {receiptData.scanToken ? " QR kod orqali tekshirishingiz mumkin." : ""}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-slate-900">
                  <Calendar className="h-4 w-4 text-emerald-700" />
                  <h3 className="font-semibold">Buyurtma sanasi</h3>
                </div>
                <p className="text-slate-700">
                  {orderData.createdAt
                    ? new Date(orderData.createdAt).toLocaleString("uz-UZ")
                    : "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => openYandexMap(orderData.location)}
                className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm text-left hover:border-emerald-300 hover:bg-emerald-50/40 cursor-pointer"
                title="Yandex xaritada ochish"
              >
                <div className="mb-2 flex items-center gap-2 text-slate-900">
                  <MapPin className="h-4 w-4 text-emerald-700" />
                  <h3 className="font-semibold">Yetkazib berish manzili</h3>
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-slate-700">{getAddressText(orderData.location)}</p>
              </button>

              <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-slate-900">
                  <Truck className="h-4 w-4 text-emerald-700" />
                  <h3 className="font-semibold">Yetkazib berish</h3>
                </div>
                <p className="text-slate-700">Standart yetkazib berish</p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-slate-900">
                  <CreditCard className="h-4 w-4 text-emerald-700" />
                  <h3 className="font-semibold">To'lov holati</h3>
                </div>
                <p className="text-slate-700">{orderData.paid ? "To'langan" : "To'lanmagan"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-xl font-semibold text-slate-900">Mijoz ma'lumotlari</h3>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#249B73]">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {userInfo?.firstName || ""} {userInfo?.lastName || ""}
                  </p>
                  <p className="text-sm text-slate-500">{getRoleLabelUz(userInfo?.role)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={copyPhone}
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <Phone className="h-4 w-4 text-slate-500" />
                  <span>{userInfo?.phoneNumber || "-"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openYandexMap(orderData.location)}
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <MapPin className="h-4 w-4 text-slate-500" />
                  <span>{getAddressText(orderData.location)}</span>
                </button>
                <div className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span className="text-sm">
                    Oxirgi faollik: {userInfo?.last_activity ? formatDate(userInfo.last_activity) : "-"}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2">
                <Link
                  to={`/user/${userInfo?._id}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#249B73] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f8966] cursor-pointer"
                >
                  <User2 className="h-4 w-4" />
                  Profilni ko'rish
                </Link>
                <button
                  type="button"
                  onClick={callCustomer}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                >
                  <Phone className="h-4 w-4" />
                  Qo'ng'iroq qilish
                </button>
                <button
                  type="button"
                  onClick={smsCustomer}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  SMS yuborish
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-xl font-semibold text-slate-900">Buyurtma xulosasi</h3>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      {item.name} ({item.qty}x)
                    </span>
                    <span className="font-semibold text-slate-900">{formatMoney(item.total)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 text-sm">
                  <span className="text-slate-600">Miqdor</span>
                  <span className="text-slate-900">{totalQty} dona</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Yetkazib berish</span>
                  <span className="text-slate-900">0 so'm</span>
                </div>
                <div className="mt-3 border-t border-slate-200 pt-3 flex items-center justify-between">
                  <span className="text-lg font-semibold text-slate-900">Jami</span>
                  <span className="text-2xl font-bold text-slate-900">{formatMoney(totalPrice)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
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
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
};
