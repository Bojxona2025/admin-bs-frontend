"use client";
import { useState, useEffect } from "react";
import ProductCard from "../../components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import $api from "@/app/http/api";
import { useTranslation } from "react-i18next";
import i18next from "@/i18n/i18n";
import { getImageUrl } from "@/app/utils/imageHelper";

function useSkeletonCount() {
  const [skeletonCount, setSkeletonCount] = useState(null);

  useEffect(() => {
    const updateSkeletonCount = () => {
      const width = window.innerWidth;
      if (width <= 640) {
        setSkeletonCount(2);
      } else if (width <= 768) {
        setSkeletonCount(3);
      } else if (width <= 1024) {
        setSkeletonCount(4);
      } else if (width <= 1330) {
        setSkeletonCount(5);
      } else {
        setSkeletonCount(5);
      }
    };

    updateSkeletonCount();

    window.addEventListener("resize", updateSkeletonCount);

    return () => window.removeEventListener("resize", updateSkeletonCount);
  }, []);

  return skeletonCount;
}

// Har bir breakpoint uchun to'liq qatorlar sonini hisoblash funksiyasi
function getCompleteRowsCount(totalProducts) {
  const width = window.innerWidth;
  let itemsPerRow;

  if (width <= 640) {
    itemsPerRow = 2;
  } else if (width <= 768) {
    itemsPerRow = 3;
  } else if (width <= 1024) {
    itemsPerRow = 4;
  } else if (width <= 1330) {
    itemsPerRow = 5;
  } else {
    itemsPerRow = 5;
  }

  // To'liq qatorlar sonini hisoblash
  const completeRows = Math.floor(totalProducts / itemsPerRow);
  return completeRows * itemsPerRow;
}

function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md flex flex-col w-full relative h-full min-h-[300px] aspect-[3/4]">
      <div className="flex-grow">
        <Skeleton className="w-full aspect-square mb-2 rounded-t-lg" />

        <div className="min-h-[40px] flex flex-col justify-start px-2 mt-1">
          <Skeleton className="h-3 w-3/4 mb-1" />
          <Skeleton className="h-3 w-1/2" />
        </div>

        <div className="px-2 mb-2">
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-4/5" />
        </div>

        <div className="px-2 mb-3">
          <div className="flex items-center gap-1">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-3 w-10" />
          </div>
        </div>
      </div>

      <div className="p-2 mt-auto">
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <p className="text-gray-500 text-lg">
        Hozircha chegirmadagi mahsulotlar mavjud emas
      </p>
    </div>
  );
}

export default function DiscountedProducts() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [displayProducts, setDisplayProducts] = useState([]);
  const skeletonCount = useSkeletonCount();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      const completeRowsCount = getCompleteRowsCount(products.length);
      setDisplayProducts(products.slice(0, completeRowsCount));
    }
  }, [products]);

  useEffect(() => {
    const handleResize = () => {
      if (products.length > 0) {
        const completeRowsCount = getCompleteRowsCount(products.length);
        setDisplayProducts(products.slice(0, completeRowsCount));
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [products]);

  useEffect(() => {
    const fetchDiscountedProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await $api.get("/products/get/discounted", {
          params: {
            page: 1,
            limit: 30,
          },
        });

        if (response.status === 200) {
          const discountedProducts = response.data.products.map((product) => {
            const bestDiscountVariant = product.variants.reduce(
              (best, current) =>
                current.discount > best.discount ? current : best,
              product.variants[0]
            );

            const imageUrl = getImageUrl(product.mainImage) || "/placeholder.png";

            const getProductName = () => {
              switch (i18next.language) {
                case "ru":
                  return product.name_ru || product.name;
                case "en":
                  return product.name_en || product.name;
                default:
                  return product.name;
              }
            };

            const getProductDescription = () => {
              switch (i18next.language) {
                case "ru":
                  return (
                    product.shortDescription_ru || product.shortDescription
                  );
                case "en":
                  return (
                    product.shortDescription_en || product.shortDescription
                  );
                default:
                  return product.shortDescription;
              }
            };

            return {
              ...product,
              id: product._id,
              name: getProductName(),
              shortDescription: getProductDescription(),
              image: imageUrl,
              mainVariant: bestDiscountVariant,
              discountedVariants: product.variants.filter(
                (variant) => variant.discount > 0
              ),
              price: bestDiscountVariant?.price,
              discountedPrice: bestDiscountVariant?.discountedPrice,
              discount: bestDiscountVariant?.discount,
            };
          });

          const limitedProducts = discountedProducts.slice(0, 30);
          setProducts(limitedProducts);

          const completeRowsCount = getCompleteRowsCount(
            limitedProducts.length
          );
          setDisplayProducts(limitedProducts.slice(0, completeRowsCount));
        }
      } catch (error) {
        console.error("Error fetching discounted products:", error);

        if (error.response?.status === 404) {
          setProducts([]);
          setDisplayProducts([]);
        } else {
          setProducts([]);
          setDisplayProducts([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDiscountedProducts();
  }, [i18next.language, t]);

  if (loading) {
    return (
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-6 max-[500px]:px-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4 max-[500px]:gap-2">
            {[...Array(30)].map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (displayProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-4">
      <div className="max-w-7xl mx-auto px-6 max-[500px]:px-1">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4 max-[500px]:gap-2">
            {displayProducts.map((product) => (
              <div
                key={product.id}
                className="w-full flex items-center justify-center"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
