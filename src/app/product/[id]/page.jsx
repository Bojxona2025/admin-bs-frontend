"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProductDetail from "../../components/DetailCard/ProductDetail";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import { notFound } from "next/navigation";
import useProductStore from "@/app/store/productStore";
import $api from "@/app/http/api";
import BestSellers from "@/app/pages/bestsellers/page";

export default function ProductDetailPage() {
  const params = useParams();
  const { setCurrentProduct, currentProduct } = useProductStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!params.id) {
        notFound();
        return;
      }

      try {
        setLoading(true);
        const response = await $api.get(`/products/get/by/${params.id}`);
        const data = response.data;

        if (!response.status || response.status !== 200) {
          throw new Error("Mahsulot topilmadi");
        }


        if (data.status === 200 && data.productData) {
          // Process product data with correct image URLs
          const processedProduct = {
            ...data.productData,
            id: data.productData._id,

            // Keep original image paths - ProductDetail will handle URL processing
            mainImage: data.productData.mainImage,
            metaImage: data.productData.metaImage,

            // Keep original variant image paths
            variants: data.productData.variants || [],

            // Add price from first variant if not available on product level
            price:
              data.productData.price ||
              data.productData.variants?.[0]?.price ||
              0,
            discountedPrice:
              data.productData.discountedPrice ||
              data.productData.variants?.[0]?.discountedPrice ||
              null,
          };

          console.log("Processed Product:", processedProduct);
          setCurrentProduct(processedProduct);
        } else {
          throw new Error("Mahsulot ma'lumotlari noto'g'ri");
        }
      } catch (err) {
        console.error("Mahsulotni yuklashda xato:", err);
        setError(err.message);
        if (err.message.includes("topilmadi") || err.status === 404) {
          notFound();
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params.id, setCurrentProduct]);

  console.log("Product ID:", params.id);
  console.log("Current Product:", currentProduct);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar className="w-full" />
        <main className="bg-[#ECF4FF] flex items-center justify-center flex-1">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#249B73] mx-auto mb-4"></div>
            <p className="text-gray-600">Mahsulot yuklanmoqda...</p>
          </div>
        </main>
        <Footer className="mt-auto" />
      </div>
    );
  }

  if (error || !currentProduct) {
    return (
      <div className="flex flex-col min-h-screen ">
        <Navbar className="w-full" />
        <main className="bg-[#ECF4FF] flex items-center justify-center flex-1">
          <div className="text-center py-70">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Mahsulot topilmadi
            </h2>
            <p className="text-gray-600 text-lg mb-4">
              {error || "So'ralgan mahsulot mavjud emas"}
            </p>
            <button
              onClick={() => window.history.back()}
              className="bg-[#249B73] text-white px-6 py-3 text-xl rounded-lg hover:bg-[#249B73] cursor-pointer"
            >
               Orqaga qaytish
            </button>
          </div>
        </main>
        <Footer className="mt-auto" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar className="w-full" />
      <main className="bg-[#ECF4FF] flex items-center justify-center flex-1">
        <div className="w-full max-w-[1400px] py-6">
          <ProductDetail />
          <BestSellers />
        </div>
      </main>
      <Footer className="mt-auto" />
    </div>
  );
}
