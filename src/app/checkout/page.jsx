"use client";
import { useCartStore } from "../components/hooks/cart";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import Head from "next/head";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import $api from "../http/api";
import OrderItems from "./pages/OrderItems";
import PickupPoints from "./pages/PickupPoints";
import PaymentMethod from "./pages/PaymentMethod";
import OrderSummary from "./pages/OrderSummary";
import ProductModal from "./pages/ProductModal";
import { useTranslation } from "react-i18next";
import { getImageUrl } from "../utils/imageHelper";

export default function Checkout() {
  const { t, ready } = useTranslation(); 
  const { getCheckedItems, getTotalPrice, clearCart } = useCartStore();
  const router = useRouter();
  const checkedItems = getCheckedItems();
  const total = getTotalPrice();

  const deliveryCalculationRef = useRef(null);
  const isCalculatingRef = useRef(false);

  const [userProfile, setUserProfile] = useState(null);
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [pickupPoints, setPickupPoints] = useState([]);
  const [allPickupPoints, setAllPickupPoints] = useState([]);
  const [selectedPickupPoint, setSelectedPickupPoint] = useState(null);
  const [loadingPickupPoints, setLoadingPickupPoints] = useState(false);
  const [formData, setFormData] = useState({
    payment: "card",
  });
  const [loading, setLoading] = useState(true);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  // Add hydration state to prevent hydration mismatch
  const [isHydrated, setIsHydrated] = useState(false);

  // Yetkazib berish uchun state'lar
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [loadingDelivery, setLoadingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState(null);

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Foydalanuvchi profilini olish
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await $api.get("/users/profile/me");
        setUserProfile(response.data.myProfile);
      } catch (error) {
        console.error(
          "❌ Foydalanuvchi ma'lumotlarini olishda xatolik:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Viloyatlarni olish
  useEffect(() => {
    const fetchRegions = async () => {
      setRegionsLoading(true);
      try {
        const response = await $api.get("/emu/get/regions");
        if (response.data?.json?.regionlist?.city) {
          setRegions(response.data.json.regionlist.city);
        }
      } catch (error) {
        console.error("❌ Viloyatlarni olishda xatolik:", error);
      } finally {
        setRegionsLoading(false);
      }
    };

    fetchRegions();
  }, []);

  useEffect(() => {
    if (checkedItems.length === 0) {
      router.push("/cart");
    }
  }, [checkedItems.length, router]);

  useEffect(() => {
    const fetchPickupPoints = async () => {
      if (!selectedRegion) {
        setPickupPoints([]);
        setAllPickupPoints([]);
        setSelectedPickupPoint(null);
        // Delivery info ni tozalash
        setDeliveryInfo(null);
        setDeliveryError(null);
        return;
      }

      setLoadingPickupPoints(true);
      try {
        const response = await $api.get("/emu/get/uzbekistan/pvz");

        if (response.data?.data?.pvzlist?.pvz) {
          const allPoints = response.data.data.pvzlist.pvz;
          const selectedRegionData = regions.find(
            (region) => region.code[0] === selectedRegion
          );

          if (selectedRegionData) {
            if (selectedRegionData.name[0] === "UZBEKISTAN") {
              setAllPickupPoints(allPoints);
              setPickupPoints(allPoints);
              if (allPoints.length > 0) {
                setSelectedPickupPoint(allPoints[0]);
              }
            } else {
              const filteredPoints = allPoints.filter(
                (point) =>
                  point.town[0].$.regioncode === selectedRegionData.code[0] ||
                  point.town[0].$.regionname === selectedRegionData.name[0]
              );

              setAllPickupPoints(filteredPoints);
              setPickupPoints(filteredPoints);
              if (filteredPoints.length > 0) {
                setSelectedPickupPoint(filteredPoints[0]);
              }
            }
          }
        }
      } catch (error) {
        console.error("❌ PVZ larni olishda xatolik:", error);
        setPickupPoints([]);
        setAllPickupPoints([]);
        setSelectedPickupPoint(null);
      } finally {
        setLoadingPickupPoints(false);
      }
    };

    fetchPickupPoints();
  }, [selectedRegion, regions]);

  // Delivery calculation function
  const calculateDelivery = useCallback(async () => {
    if (
      !selectedPickupPoint ||
      !checkedItems.length ||
      !userProfile ||
      isCalculatingRef.current
    ) {
      return;
    }

    // Agar aynan shu pickup point uchun allaqachon hisoblangan bo'lsa, qayta hisoblamaymiz
    const currentCalculationKey = `${selectedPickupPoint.code[0]}-${
      checkedItems.length
    }-${JSON.stringify(
      checkedItems.map((item) => ({ id: item.id, quantity: item.quantity }))
    )}`;
    if (deliveryCalculationRef.current === currentCalculationKey) {
      return;
    }

    isCalculatingRef.current = true;
    deliveryCalculationRef.current = currentCalculationKey;
    setLoadingDelivery(true);
    setDeliveryError(null);

    try {
      const totalWeight = checkedItems.reduce((acc, item) => {
        const itemWeight = item.weight || 1;
        return acc + itemWeight * item.quantity;
      }, 0);

      const selectedRegionData = regions.find(
        (region) => region.code[0] === selectedRegion
      );

      const packages = checkedItems.map((item, index) => ({
        id: index + 1,
        weight: (item.weight || 1) * item.quantity,
        length: 10,
        width: 10,
        height: 10,
        name: item.name || item.title || `Mahsulot ${index + 1}`,
        price: parseFloat(
          (item.variant?.price || item.price || 0)
            .toString()
            .replace(/[^\d.-]/g, "")
        ),
        quantity: item.quantity,
      }));

      const deliveryData = {
        senderTown: "Ташкент",
        senderAddress: "Amir Temur ko'chasi 12",
        senderLat: "41.2995",
        senderLon: "69.2401",

        receiverTown:
          selectedPickupPoint.town[0]._ ||
          selectedPickupPoint.town[0].$.regionname,
        receiverRegionCode: selectedPickupPoint.town[0].$.regioncode,
        receiverCountry: "UZ",
        receiverAddress: selectedPickupPoint.address[0],
        receiverPvz: selectedPickupPoint.code[0],
        receiverLat: selectedPickupPoint.lat?.[0] || "41.2995",
        receiverLon: selectedPickupPoint.lon?.[0] || "69.2401",

        weight: Math.max(1, Math.ceil(totalWeight)),
        service: "1",
        payType: "CASH",
        userId: userProfile?.id || "",
        groupId: "",
        priceType: "CUSTOMER",
        packages: packages,

        townfrom: "272765",
        townto: selectedPickupPoint.town[0].$.code,
        mass: Math.max(1, Math.ceil(totalWeight)),
      };

      console.log("Yetkazib berish ma'lumotlari:", deliveryData);

      let response;
      try {
        response = await $api.post("/emu/calculate/delivery", deliveryData);
      } catch (error) {
        console.log("Yangi format ishlamadi, eski formatni sinab ko'ramiz...");

        const oldFormatData = {
          townfrom: "272765",
          townto: selectedPickupPoint.town[0].$.code,
          mass: Math.max(1, Math.ceil(totalWeight)),
          service: "1",

          senderTown: "Ташкент",
          receiverTown:
            selectedPickupPoint.town[0]._ ||
            selectedPickupPoint.town[0].$.regionname,
          receiverPvz: selectedPickupPoint.code[0],
          weight: Math.max(1, Math.ceil(totalWeight)),
          payType: "CASH",
          priceType: "CUSTOMER",
        };

        console.log("Eski format ma'lumotlari:", oldFormatData);
        response = await $api.post("/emu/calculate/delivery", oldFormatData);
      }

      // Javobni qayta ishlash
      if (response.data?.data?.calculator?.calc) {
        const calc = response.data.data.calculator.calc;
        setDeliveryInfo({
          price: parseInt(calc.$.price || calc.price),
          minDays: calc.mindeliverydays || calc.minDays,
          maxDays: calc.maxdeliverydays || calc.maxDays,
          minDate: calc.mindeliverydate || calc.minDate,
          townFrom: calc.townfrom?._ || calc.townFrom || "Tashkent",
          townTo:
            calc.townto?._ || calc.townTo || selectedPickupPoint.town[0]._,
          weight: calc.mass || calc.weight,
          service:
            calc.service?.$.name ||
            calc.service?.name ||
            "Standart yetkazib berish",
        });
      } else if (response.data?.price || response.data?.cost) {
        setDeliveryInfo({
          price: parseInt(response.data.price || response.data.cost),
          minDays: response.data.minDays || 3,
          maxDays: response.data.maxDays || 7,
          townFrom: "Tashkent",
          townTo: selectedPickupPoint.town[0]._,
          weight: totalWeight,
          service: "Standart yetkazib berish",
        });
      } else if (response.data) {
        console.log("Noma'lum javob formati:", response.data);

        const price =
          response.data.deliveryPrice ||
          response.data.shipping_cost ||
          response.data.total_cost ||
          response.data.amount ||
          0;

        setDeliveryInfo({
          price: parseInt(price),
          minDays: response.data.minDays || 3,
          maxDays: response.data.maxDays || 7,
          townFrom: "Tashkent",
          townTo: selectedPickupPoint.town[0]._,
          weight: totalWeight,
          service: "Standart yetkazib berish",
        });
      } else {
        throw new Error("Javob formatida xatolik");
      }
    } catch (error) {
      console.error("❌ Yetkazib berish narxini hisoblashda xatolik:", error);

      let errorMessage =
        "Yetkazib berish narxini hisoblashda xatolik yuz berdi";

      if (error.response) {
        console.log("Server javobi:", error.response.data);
        errorMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          `Server xatoligi: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = "Server bilan aloqa o'rnatilmadi";
      }

      setDeliveryError(errorMessage);

      // Default qiymatlar bilan davom etamiz
      setDeliveryInfo({
        price: 25000,
        minDays: 3,
        maxDays: 7,
        townFrom: "Tashkent",
        townTo: selectedPickupPoint.town[0]._,
        weight: totalWeight,
        service: "Standart yetkazib berish",
      });
    } finally {
      setLoadingDelivery(false);
      isCalculatingRef.current = false;
    }
  }, [selectedPickupPoint, checkedItems, regions, selectedRegion, userProfile]);

  // Delivery calculation useEffect - dependencies dan deliveryInfo ni olib tashladik
  useEffect(() => {
    calculateDelivery();
  }, [calculateDelivery]);

  const formatPrice = (price) => {
    if (!price) return "0";
    const numericPrice = parseFloat(price.toString().replace(/[^\d.-]/g, ""));
    return numericPrice.toLocaleString();
  };

  const getVariantData = (product) => {
    if (product.variant) {
      return {
        price: product.variant.discountedPrice || product.variant.price,
        originalPrice: product.variant.price,
        image: product.variant.mainImg || product.image,
        color: product.variant.color,
        unit: product.variant.unit,
        stockQuantity: product.variant.stockQuantity,
      };
    }
    return {
      price: product.sale_price || product.price,
      originalPrice: product.original_price,
      image: product.image,
      color: null,
      unit: null,
      stockQuantity: null,
    };
  };

  const getProductImages = (item) => {
    const images = [];
    const variantData = getVariantData(item);

    if (variantData.image) {
      images.push(getImageUrl(variantData.image));
    }

    if (
      item.variant?.productImages &&
      Array.isArray(item.variant.productImages)
    ) {
      item.variant.productImages.forEach((img) => {
        images.push(getImageUrl(img));
      });
    }

    if (item.mainImage && !item.variant) {
      images.push(getImageUrl(item.mainImage));
    }

    if (item.metaImage && !item.variant) {
      images.push(getImageUrl(item.metaImage));
    }

    return images
      .filter(Boolean)
      .filter((img, index, arr) => arr.indexOf(img) === index);
  };

  const handleSubmit = async () => {
    if (!userProfile) {
      console.error("❌", t("checkout.deliveryError"));
      return;
    }

    if (!selectedRegion) {
      console.log(t("checkout.selectRegion"));
      return;
    }

    if (!selectedPickupPoint) {
      console.log(t("checkout.selectPickup"));
      return;
    }

    try {
      setLoading(true);

      const selectedRegionData = regions.find(
        (region) => region.code[0] === selectedRegion
      );

      const locationName =
        selectedPickupPoint?.town?.[0]?.$.regionname ||
        selectedRegionData?.name?.[0] ||
        "Tashkent";

      const locationAddress = `${locationName}, ${
        selectedPickupPoint?.address?.[0] ||
        selectedPickupPoint?.town?.[0]?._ ||
        ""
      }`;

      const orderData = {
        paymentMethodOnline: formData.payment === "card",
        receiverPvz: selectedPickupPoint?.code?.[0] || "",
        location: {
          la: selectedPickupPoint?.lat?.[0] || "41.3111",
          lo: selectedPickupPoint?.lon?.[0] || "69.2797",
          address: locationAddress,
        },
        products: checkedItems.map((item) => ({
          productId: item.productId || item.id,
          variantId: item.variantId || item.variant?._id,
          productQuantity: item.quantity,
        })),
      };

      console.log("📤 Jo'natilayotgan buyurtma:", orderData);

      const response = await $api.post("/order/create", orderData);

      console.log("✅ Buyurtma muvaffaqiyatli yaratildi:", response.data);

      clearCart();
      router.push("/profile?tab=orders");
    } catch (error) {
      console.error("❌ Buyurtma yaratishda xatolik:", error);

      let errorMessage = "Buyurtma yaratishda xatolik yuz berdi";
      if (error.response) {
        console.log("Server response:", error.response.data);
        errorMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          `Server xatoligi: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = "Server bilan aloqa o'rnatilmadi";
      }

      console.log(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegionChange = (e) => {
    setSelectedRegion(e.target.value);
    setSelectedPickupPoint(null);
    setDeliveryInfo(null);
    setDeliveryError(null);
    deliveryCalculationRef.current = null;
  };

  const handlePickupPointSelect = (point) => {
    setSelectedPickupPoint(point);
    setDeliveryInfo(null);
    setDeliveryError(null);
    deliveryCalculationRef.current = null;
  };

  const openProductModal = (product) => {
    setSelectedProduct(product);
    setModalImageIndex(0);
    setIsModalOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    document.body.style.overflow = "unset";
  };

  const handleImageChange = (direction) => {
    if (!selectedProduct) return;
    const images = getProductImages(selectedProduct);

    if (direction === "next") {
      setModalImageIndex((prev) => (prev + 1) % images.length);
    } else {
      setModalImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const totalWithDelivery = total + (deliveryInfo?.price || 0);

  if (loading || !isHydrated || !ready) {
    return (
      <div>
        <Head>
          <title>Order</title>{" "}
          <meta name="description" content="Checkout - Baraka savdo" />
        </Head>
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading...</div> {/* Static text */}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Head>
        <title>{t("checkout.title")}</title>
        <meta name="description" content="Checkout - Baraka Savdo" />
      </Head>

      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8 max-[720px]:px-2">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">
          {t("checkout.title")}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <OrderItems
              checkedItems={checkedItems}
              onProductClick={openProductModal}
              formatPrice={formatPrice}
              getVariantData={getVariantData}
              getProductImages={getProductImages}
            />

            <PickupPoints
              regions={regions}
              selectedRegion={selectedRegion}
              pickupPoints={pickupPoints}
              allPickupPoints={allPickupPoints}
              selectedPickupPoint={selectedPickupPoint}
              loadingPickupPoints={loadingPickupPoints}
              regionsLoading={regionsLoading}
              deliveryInfo={deliveryInfo}
              loadingDelivery={loadingDelivery}
              deliveryError={deliveryError}
              onRegionChange={handleRegionChange}
              onPickupPointSelect={handlePickupPointSelect}
              formatPrice={formatPrice}
              userProfile={userProfile}
            />

            <PaymentMethod formData={formData} onFormChange={handleChange} />
          </div>

          <OrderSummary
            total={total}
            deliveryInfo={deliveryInfo}
            loadingDelivery={loadingDelivery}
            totalWithDelivery={totalWithDelivery}
            checkedItems={checkedItems}
            selectedRegion={selectedRegion}
            selectedPickupPoint={selectedPickupPoint}
            formatPrice={formatPrice}
            getVariantData={getVariantData}
            onSubmit={handleSubmit}
          />
        </div>
      </div>

      <ProductModal
        isOpen={isModalOpen}
        product={selectedProduct}
        imageIndex={modalImageIndex}
        onClose={closeModal}
        onImageChange={handleImageChange}
        formatPrice={formatPrice}
        getVariantData={getVariantData}
        getProductImages={getProductImages}
      />

      <Footer />
    </div>
  );
}
