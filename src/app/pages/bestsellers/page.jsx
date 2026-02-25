"use client";
import { useState, useEffect, useRef } from "react";
import "rc-slider/assets/index.css";
import { Skeleton } from "@/components/ui/skeleton";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import $api from "@/app/http/api";
import { useTranslation } from "react-i18next";
import i18next from "@/i18n/i18n";
import ProductCardItems from "@/app/components/ProductCardItems";
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

function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md flex flex-col w-full max-w-[220px] mx-auto relative h-full min-h-[320px]">
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

export default function BestSellers() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCompactView, setIsCompactView] = useState(false);
  const sliderRef = useRef(null);
  const autoScrollRef = useRef(null);
  const skeletonCount = useSkeletonCount();

  useEffect(() => {
    if (
      isPlaying &&
      sliderRef.current &&
      typeof sliderRef.current.slickNext === "function" &&
      products.length > skeletonCount
    ) {
      autoScrollRef.current = setInterval(() => {
        sliderRef.current?.slickNext();
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
    const updateViewportMode = () => {
      setIsCompactView(window.innerWidth <= 1024);
    };
    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const extractProducts = (payload) => {
          if (Array.isArray(payload?.results)) return payload.results;
          if (Array.isArray(payload?.products)) return payload.products;
          if (Array.isArray(payload?.data)) return payload.data;
          if (Array.isArray(payload?.data?.results)) return payload.data.results;
          if (Array.isArray(payload?.data?.products)) return payload.data.products;
          return [];
        };

        const extractTotalPages = (payload) => {
          return (
            payload?.totalPages ||
            payload?.pagination?.totalPages ||
            payload?.meta?.totalPages ||
            payload?.data?.totalPages ||
            payload?.data?.pagination?.totalPages ||
            1
          );
        };

        const limit = 20;
        const firstPageResponse = await $api.get("/products/get/popular", {
          params: { page: 1, limit },
          timeout: 5000,
        });

        let rawProducts = extractProducts(firstPageResponse?.data);
        const totalPages = extractTotalPages(firstPageResponse?.data);

        if (totalPages > 1) {
          const pageRequests = [];
          for (let page = 2; page <= totalPages; page += 1) {
            pageRequests.push(
              $api.get("/products/get/popular", {
                params: { page, limit },
                timeout: 5000,
              })
            );
          }

          const pageResponses = await Promise.all(pageRequests);
          pageResponses.forEach((res) => {
            rawProducts = [...rawProducts, ...extractProducts(res?.data)];
          });
        }

        const uniqueProductsMap = new Map();
        rawProducts.forEach((item) => {
          if (item?._id && !uniqueProductsMap.has(item._id)) {
            uniqueProductsMap.set(item._id, item);
          }
        });
        rawProducts = Array.from(uniqueProductsMap.values());

        if (Array.isArray(rawProducts)) {
          const mappedProducts = rawProducts.map((item) => {
            const variant = item.variants?.[0] || {};
            const mainImagePath =
              item.mainImage || item.main_image || item.image || null;
            const fallbackImagePath =
              item.metaImage || item.meta_image || variant?.mainImg || null;
            const imageUrl =
              getImageUrl(mainImagePath) ||
              getImageUrl(fallbackImagePath) ||
              "/placeholder.png";

            const getLocalizedName = () => {
              switch (i18next.language) {
                case "ru":
                  return item.name_ru || item.name;
                case "en":
                  return item.name_en || item.name;
                default:
                  return item.name;
              }
            };

            const getLocalizedDescription = () => {
              switch (i18next.language) {
                case "ru":
                  return item.description_ru || item.description;
                case "en":
                  return item.description_en || item.description;
                default:
                  return item.description;
              }
            };

            return {
              id: item._id,
              name: getLocalizedName(),
              name_ru: item.name_ru,
              name_en: item.name_en,
              description: getLocalizedDescription(),
              price: variant.price || 0,
              discount: variant.discount || 0,
              discountedPrice: variant.discountedPrice || variant.price || 0,
              image: imageUrl,
              variants: item.variants || [],
              mainImage: mainImagePath,
              metaImage: fallbackImagePath,
              reviews_count: item.reviews_count || 0,
            };
          });

          setProducts(mappedProducts);
        } else {
          throw new Error(t("bestsellers.data_format_error"));
        }
      } catch (error) {
        console.error("Mahsulotlarni yuklashda xatolik:", error);
        setError(error.message || t("bestsellers.loading_error"));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [i18next.language, t]);

  const sliderSettings = {
    dots: false,
    infinite: products.length > skeletonCount,
    speed: 500,
    autoplay: false,
    slidesToShow: Math.min(skeletonCount, products.length),
    slidesToScroll: 1,
    arrows: products.length > skeletonCount,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
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

  return (
    <section className="py-4">
      <div className="max-w-7xl mx-auto px-6 max-[500px]:px-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 max-[500px]:font-medium max-[500px]:text-xl max-[500px]:px-2">
            {mounted ? t("bestsellers.title") : ""}
          </h2>
        </div>

        {loading ? (
          <div
            className={
              isCompactView
                ? "grid grid-cols-2 max-[380px]:grid-cols-1 sm:grid-cols-3 gap-3"
                : "flex gap-4 overflow-hidden"
            }
          >
            {[...Array(skeletonCount)].map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : products.length === 0 ? (
          ""
        ) : isCompactView ? (
          <div className="grid grid-cols-2 max-[380px]:grid-cols-1 sm:grid-cols-3 gap-3">
            {products.map((product) => (
              <div key={product.id} className="min-w-0 h-full">
                <ProductCardItems product={product} />
              </div>
            ))}
          </div>
        ) : products.length <= skeletonCount ? (
          <div className="flex flex-wrap gap-4">
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
                <div key={product.id} className="px-2 h-full">
                  <div className="h-full">
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
