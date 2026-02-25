"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import "rc-slider/assets/index.css";
import { Skeleton } from "@/components/ui/skeleton";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "lucide-react";
import $api from "@/app/http/api";
import { useTranslation } from "react-i18next";
import i18next from "@/i18n/i18n";
import { getImageUrl } from "@/app/utils/imageHelper";
import { useSearchParams } from "next/navigation";
import ProductCardItems from "@/app/components/ProductCardItems";

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
        setSkeletonCount(6);
      }
    };

    updateSkeletonCount();
    window.addEventListener("resize", updateSkeletonCount);
    return () => window.removeEventListener("resize", updateSkeletonCount);
  }, []);

  return skeletonCount;
}

const Slider = dynamic(() => import("react-slick"), {
  ssr: false,
});

function SkeletonLoader() {
  const skeletonCount = useSkeletonCount();

  return (
    <div className="flex gap-4 overflow-hidden">
      {[...Array(skeletonCount)].map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md flex flex-col w-[200px] max-[420px]:w-[180px] max-[400px]:w-[170px] max-[380px]:w-[160px] max-[361px]:w-[150px] relative h-full min-h-[320px]">
      <div className="flex-grow">
        <Skeleton className="w-full h-[160px] mb-2 rounded-t-lg" />

        <div className="min-h-[45px] flex flex-col justify-start px-3 mt-[2px]">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        <div className="px-3 mb-2">
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-4/5" />
        </div>

        <div className="px-3 mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </div>

      <div className="p-3 mt-auto">
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

const NextArrow = (props) => {
  const { onClick } = props;
  return (
    <div
      onClick={onClick}
      className="absolute -right-10 max-[800px]:hidden top-1/2 transform -translate-y-1/2 z-10 cursor-pointer bg-white rounded-full shadow p-2 hover:bg-gray-200 transition max-[1330px]:right-0"
    >
      <ChevronRight />
    </div>
  );
};

const PrevArrow = (props) => {
  const { onClick } = props;
  return (
    <div
      onClick={onClick}
      className="absolute -left-10 max-[800px]:hidden top-1/2 transform -translate-y-1/2 z-10 cursor-pointer bg-white rounded-full shadow p-2 hover:bg-gray-200 transition max-[1330px]:-left-5"
    >
      <ChevronLeft />
    </div>
  );
};

function ShoesProductContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true); // Auto scroll holati
  const sliderRef = useRef(null);
  const autoScrollRef = useRef(null);
  const skeletonCount = useSkeletonCount();
  const currentCategoryId =
    searchParams?.get("category") || "689dcbdce9443d84b885e4bc";

  // Auto scroll setup
  useEffect(() => {
    if (isPlaying && sliderRef.current && products.length > skeletonCount) {
      autoScrollRef.current = setInterval(() => {
        sliderRef.current.slickNext();
      }, 1500);
    } else {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
      }
    }

    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
      }
    };
  }, [isPlaying, products.length, skeletonCount]);

  // Mouse hover paytida auto scroll to'xtatish
  const handleMouseEnter = () => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
    }
  };

  const handleMouseLeave = () => {
    if (isPlaying && products.length > skeletonCount) {
      autoScrollRef.current = setInterval(() => {
        sliderRef.current.slickNext();
      }, 1500);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchCategoryProducts = async () => {
      if (!currentCategoryId) {
        setError("No category ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await $api.get(
          `/products/get/query?category=${currentCategoryId}`
        );

        if (response.status === 200 && response.data && response.data.results) {
          const categoryProducts = response.data.results.map((product) => {
            const bestDiscountVariant =
              product.variants && product.variants.length > 0
                ? product.variants.reduce(
                    (best, current) =>
                      (current.discount || 0) > (best.discount || 0)
                        ? current
                        : best,
                    product.variants[0]
                  )
                : null;

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
              discountedVariants: product.variants
                ? product.variants.filter(
                    (variant) => (variant.discount || 0) > 0
                  )
                : [],
              price: bestDiscountVariant?.price || 0,
              discountedPrice:
                bestDiscountVariant?.discountedPrice ||
                bestDiscountVariant?.price ||
                0,
              discount: bestDiscountVariant?.discount || 0,
            };
          });

          setProducts(categoryProducts);
        } else {
          console.log("No results found in response");
          setProducts([]);
        }
      } catch (error) {
        console.error("Error fetching category products:", error);
        setError(`Error loading products: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryProducts();
  }, [currentCategoryId, i18next.language]);

  const sliderSettings = {
    dots: false,
    infinite: products.length > skeletonCount,
    speed: 500,
    autoplay: false, // Manual auto scroll ishlatamiz
    slidesToShow: Math.min(skeletonCount, products.length),
    slidesToScroll: 1,
    arrows: products.length > skeletonCount,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    variableHeight: true,
    responsive: [
      {
        breakpoint: 1330,
        settings: {
          slidesToShow: Math.min(5, products.length),
          infinite: products.length > 5,
          arrows: products.length > 5,
        },
      },
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: Math.min(4, products.length),
          infinite: products.length > 4,
          arrows: products.length > 4,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: Math.min(3, products.length),
          infinite: products.length > 3,
          arrows: products.length > 3,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: Math.min(2, products.length),
          infinite: products.length > 2,
          arrows: products.length > 2,
        },
      },
    ],
  };

  if (loading) {
    return (
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-6 max-[500px]:px-1">
          <div className="flex gap-4 overflow-hidden">
            {[...Array(skeletonCount)].map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length < 7) {
    return null;
  }

  return (
    <section className="py-4">
      <div className="max-w-7xl mx-auto px-6 max-[500px]:px-1">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 max-[500px]:font-medium max-[500px]:text-xl max-[500px]:px-2">
            {mounted ? t("catagories3.title") : ""}
          </h2>
        </div>
        {products.length <= skeletonCount ? (
          <div className="flex gap-4 overflow-x-auto">
            {products.map((product) => (
              <div key={product.id} className="w-[200px] flex-shrink-0">
                <ProductCardItems product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <Slider
              {...sliderSettings}
              ref={sliderRef}
              className="slider-transition"
            >
              {products.map((product) => (
                <div key={product._id} className="px-2">
                  <div className="w-[200px]">
                    <ProductCardItems product={product} />
                  </div>
                </div>
              ))}
            </Slider>
          </div>
        )}
      </div>
    </section>
  );
}

export default function ShoesProduct() {
  const skeletonCount = useSkeletonCount();
  return (
    <Suspense
      fallback={
        <section className="py-4">
          <div className="max-w-7xl mx-auto px-6 max-[500px]:px-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 max-[500px]:font-medium max-[500px]:text-xl max-[500px]:px-2">
                Loading...
              </h2>
            </div>
            <div className="flex gap-4 overflow-hidden">
              {[...Array(skeletonCount)].map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          </div>
        </section>
      }
    >
      <ShoesProductContent />
    </Suspense>
  );
}
