"use client";
import React, { useState, useEffect } from "react";
import Footer from "../components/Footer";
import Head from "next/head";
import Navbar from "../components/Navbar";
import { useCartStore } from "../components/hooks/cart";
import CartProduct from "../components/CartProduct";
import Image from "next/image";
import Button from "../components/ui/button";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import i18next from "@/i18n/i18n";
import $api from "../http/api";

export default function Cart() {
  const { t, i18n } = useTranslation();
  const {
    cart,
    onChecked,
    offChecked,
    getTotalPrice,
    getCheckedCount,
    updateCartFromAPI,
  } = useCartStore();
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState("");

  const isAllChecked = cart.every((item) => item.checked);
  const subtotal = getTotalPrice();
  const checkedCount = getCheckedCount();
  const route = useRouter();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchCartFromAPI();
    }
  }, [isAuthenticated, authLoading]);

  const fetchCartFromAPI = async () => {
    setCartLoading(true);
    setCartError("");
    try {
      console.log("🔄 API dan savat yuklanmoqda...");
      const response = await $api.get("/cart/my");

      console.log("📦 To'liq API response:", response);
      console.log("📦 response.data:", response.data);

      // API strukturasini tekshirish
      if (response.data && response.data.status === 200) {
        const cartData = response.data.carts?.[0];

        if (cartData && cartData.products && cartData.products.length > 0) {
          console.log("✅ Mahsulotlar topildi:", cartData.products.length);
          console.log("📋 Mahsulotlar:", cartData.products);

          // To'g'ri formatda yuborish
          updateCartFromAPI(response.data);
          console.log("✅ Cart yangilandi");
        } else {
          console.log("⚠️ Savat bo'sh");
          updateCartFromAPI({ products: [] });
        }
      } else {
        console.log("⚠️ Noto'g'ri API response format");
        setCartError(t("cart.invalid_response") || "Noto'g'ri javob formati");
      }
    } catch (error) {
      console.error("❌ Cart fetch error:", error);
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);

      if (
        error.response?.status === 404 ||
        error.response?.data?.message?.includes("No cart found")
      ) {
        console.log("ℹ️ Foydalanuvchida hali savat yo'q - bu normal");
        updateCartFromAPI({ products: [] });
        return;
      }

      setCartError("Savatni yuklashda xatolik");

      if (error.response?.status === 401) {
        setIsAuthenticated(false);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
      }
    } finally {
      setCartLoading(false);
    }
  };

  const checkAuthStatus = () => {
    setAuthLoading(true);
    try {
      const accessToken =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;
      const storedUser =
        typeof window !== "undefined" ? localStorage.getItem("user") : null;
      if (accessToken && storedUser) {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        setIsAuthenticated(true);
        setAuthError("");
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
      setCurrentUser(null);
      setAuthError(t("cart.auth_error"));
    } finally {
      setAuthLoading(false);
    }
  };

  const toggleChecked = () => {
    if (isAllChecked) {
      offChecked();
    } else {
      onChecked();
    }
  };

  const handleCheckout = async () => {
    if (checkedCount === 0) {
      console.log(t("cart.select_product_message"));
      return;
    }

    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      if (typeof window !== "undefined") {
        localStorage.setItem("redirectAfterLogin", "/checkout");
      }
      route.push("/register");
      return;
    }

    try {
      const selectedItems = cart.filter((item) => item.checked);

      const newOrder = {
        id: Date.now(),
        status: "processing",
        date: new Date().toLocaleDateString("uz-UZ"),
        total: total.toLocaleString(),
        items: selectedItems.length,
        products: selectedItems,
      };

      if (typeof window !== "undefined") {
        const existingOrders = JSON.parse(
          localStorage.getItem("orders") || "[]"
        );

        const updatedOrders = [newOrder, ...existingOrders];
        localStorage.setItem("orders", JSON.stringify(updatedOrders));

        const remainingCart = cart.filter((item) => !item.checked);
        localStorage.setItem("cart", JSON.stringify(remainingCart));
      }

      route.push("/checkout");
    } catch (error) {
      console.error("Checkout error:", error);
    }
  };

  const applyPromoCode = () => {
    const code = promoCode.toUpperCase().trim();
    if (promoCodes[code]) {
      setAppliedPromo({ code, ...promoCodes[code] });
      setPromoError("");
    } else {
      setPromoError(t("cart.promo_not_found"));
      setAppliedPromo(null);
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoCode("");
    setPromoError("");
  };

  const calculateDiscount = () => {
    if (!appliedPromo) return 0;
    if (appliedPromo.type === "percent") {
      return Math.floor((subtotal * appliedPromo.discount) / 100);
    }
    return Math.min(appliedPromo.discount, subtotal);
  };

  const discount = calculateDiscount();
  const total = subtotal - discount;
  const finalTotal = total;

  const retryAuth = () => {
    setAuthError("");
    checkAuthStatus();
  };

  const retryCartFetch = () => {
    setCartError("");
    fetchCartFromAPI();
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Head>
          <title>BS MARKET</title>
          <meta name="description" content="Online shopping platform" />
        </Head>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#249B73]"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>BS MARKET - {t("cart.title")}</title>
        <meta name="description" content="Online shopping platform" />
      </Head>

      <Navbar cartCount={cart.length} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Auth xatosi */}
        {authError && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-yellow-700">{authError}</p>
                <div className="mt-2">
                  <button
                    onClick={retryAuth}
                    className="text-sm text-yellow-800 underline hover:no-underline"
                  >
                    {t("cart.retry")}
                  </button>
                  <span className="mx-2 text-yellow-600">{t("cart.or")}</span>
                  <button
                    onClick={() => route.push("/register")}
                    className="text-sm text-yellow-800 underline hover:no-underline"
                  >
                    {t("cart.register_link")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cart yuklash xatosi */}
        {cartError && isAuthenticated && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-red-700">{cartError}</p>
                <button
                  onClick={retryCartFetch}
                  className="mt-2 text-sm text-red-800 underline hover:no-underline"
                >
                  {t("cart.retry")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cart yuklanmoqda */}
        {cartLoading && (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#249B73] mx-auto mb-4"></div>
              <p className="text-gray-600">
                {t("cart.loading") || "Yuklanmoqda..."}
              </p>
            </div>
          </div>
        )}

        {/* Bo'sh savat */}
        {!cartLoading && cart.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[500px]">
            <div className="text-center max-w-md">
              <div className="mb-8">
                <Image
                  alt="Empty cart"
                  src="/images/no-cart.png"
                  width={200}
                  height={150}
                  className="mx-auto opacity-60"
                />
              </div>

              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                {t("cart.empty_cart")}
              </h2>

              <Button
                onClick={() => route.push("/")}
                className="bg-[#249B73] hover:bg-[#249B73] text-white px-8 py-3 rounded-lg font-medium cursor-pointer transition-colors"
              >
                {t("cart.start_shopping")}
              </Button>
            </div>
          </div>
        )}

        {/* Cart mahsulotlari */}
        {!cartLoading && cart.length > 0 && (
          <div className="flex items-start gap-8 max-[800px]:flex-col">
            <div className="space-y-4 w-2/3 max-[1130px]:w-[60%] max-[800px]:w-full">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {t("cart.title")}
                </h1>
                <span className="text-gray-500">
                  {cart.length} {t("cart.products_count")}
                </span>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <label className="flex items-center cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={isAllChecked && cart.length > 0}
                        onChange={toggleChecked}
                        className="w-5 h-5 text-[#249B73] border-2 cursor-pointer border-gray-300 rounded-md focus:ring-2 focus:ring-[#249B73] focus:ring-offset-1 transition-all duration-200 group-hover:border-[#249B73]"
                      />
                      {isAllChecked && cart.length > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="ml-3 text-gray-800 font-medium group-hover:text-[#249B73] transition-colors duration-200">
                      {t("cart.select_all")}
                    </span>
                  </label>

                  <div className="flex items-center space-x-4 text-sm text-gray-500 max-[400px]:hidden">
                    {checkedCount > 0 && (
                      <span className="bg-green-100 text-[#249B73] px-3 py-1 rounded-full font-medium">
                        {checkedCount} {t("cart.selected")}
                      </span>
                    )}
                    <span className="text-gray-400 max-[500px]:hidden">
                      {cart.length} {t("cart.products_count")}
                    </span>
                  </div>
                </div>

                {cart.length > 0 && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-[#249B73] h-1.5 rounded-full transition-all duration-300 outline-none"
                        style={{
                          width: `${(checkedCount / cart.length) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {cart.map((product, index) => (
                  <div
                    key={product._id || index}
                    className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200"
                  >
                    <CartProduct product={product} />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 w-1/3 max-[1130px]:w-[40%] max-[800px]:w-full">
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {t("cart.promo_code")}
                </h3>

                {!appliedPromo ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={t("cart.enter_promo")}
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className="flex-1 px-3 py-2 max-[400px]:px-2 max-[400px]:w-[90%] max-[400px]:py-2 border outline-none border-gray-300 rounded-lg focus:ring-2 focus:ring-[#249B73] focus:border-[#249B73]"
                        onKeyPress={(e) =>
                          e.key === "Enter" && applyPromoCode()
                        }
                      />
                      <button
                        onClick={applyPromoCode}
                        className="px-4 py-2 max-[400px]:py-2 max-[400px]:px-2 bg-[#249B73] cursor-pointer text-white rounded-lg hover:bg-[#1a7a5a] transition-colors font-medium"
                      >
                        {t("cart.apply")}
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-sm text-red-500">{promoError}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-200">
                    <div>
                      <span className="font-medium text-green-800">
                        {appliedPromo.code}
                      </span>
                      <p className="text-sm text-[#249B73]">
                        {appliedPromo.description}
                      </p>
                    </div>
                    <button
                      onClick={removePromoCode}
                      className="text-red-500 hover:text-red-700 cursor-pointer p-1"
                      title="O'chirish"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {t("cart.your_order")}
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>
                      {t("cart.products")} ({checkedCount}):
                    </span>
                    <span>
                      {subtotal.toLocaleString()} {t("cart.sum")}
                    </span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-[#249B73]">
                      <span>{t("cart.discount")}:</span>
                      <span>
                        -{discount.toLocaleString()} {t("cart.sum")}
                      </span>
                    </div>
                  )}

                  <hr className="my-4" />

                  <div className="flex justify-between text-lg font-semibold text-gray-900">
                    <span>{t("cart.total")}:</span>
                    <span>
                      {finalTotal.toLocaleString()} {t("cart.sum")}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleCheckout}
                  className="w-full mt-6 bg-[#249B73] hover:bg-[#1a7a5a] text-white py-3 rounded-lg cursor-pointer font-medium transition-colors"
                  disabled={checkedCount === 0 || authLoading}
                >
                  {authLoading
                    ? t("cart.checking")
                    : !isAuthenticated
                    ? t("cart.register")
                    : t("cart.place_order")}
                </Button>

                {checkedCount === 0 && (
                  <p className="text-sm text-gray-500 text-center mt-2">
                    {t("cart.select_product_message")}
                  </p>
                )}
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-50 rounded-lg p-4 border">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-700">
                    <span className="text-green-500 mr-2">✓</span>
                    {t("cart.secure_payment")}
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <span className="text-green-500 mr-2">✓</span>
                    {t("cart.fast_delivery")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
