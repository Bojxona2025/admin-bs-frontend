"use client";
import dynamic from "next/dynamic";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import $api from "../http/api";
import { getImageUrl } from "../utils/imageHelper";

const Slider = dynamic(() => import("react-slick"), { ssr: false });

export default function HeroBanner() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const sliderRef = useRef(null);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoading(true);
        const response = await $api.get(
          "/banners/all?page=1&limit=10&position=header"
        );

        if (response.data.success && response.data.data) {
          setBanners(response.data.data);
        } else {
          setError("Bannerlar topilmadi");
        }
      } catch (err) {
        console.error("Banner yuklashda xato:", err);
        setError("Bannerlarni yuklashda xato yuz berdi");
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  const settings = {
    dots: true,
    infinite: banners.length > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: banners.length > 1,
    autoplaySpeed: 3000,
    arrows: false,
    centerPadding: "20px",
    pauseOnHover: true,
  };

  if (loading) {
    return (
      <section className="text-center relative mt-10 mb-6 max-[720px]:hidden">
        <div className="relative max-w-[1240px] max-[750px]:max-w-[95%] max-[1400px]:max-w-[80%] mx-auto">
          <div
            className="rounded-2xl overflow-hidden bg-gray-200 animate-pulse"
            style={{ height: "366px" }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-gray-500">Yuklanmoqda...</div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !banners || banners.length === 0) {
    return null;
  }

  return (
    <section className="text-center relative mt-10 mb-6 max-[720px]:hidden">
      <div className="relative max-w-[1240px] max-[750px]:max-w-[95%] max-[1400px]:max-w-[80%] mx-auto">
        {banners.length > 1 && (
          <>
            <button
              onClick={() => sliderRef.current?.slickPrev()}
              className="absolute top-[calc(50%)] -left-16 z-20 max-[950px]:hidden cursor-pointer -translate-y-1/2 bg-gradient-to-r from-[#EED3DC] to-[#CDD6FD] text-black p-2 rounded-full shadow-lg hover:scale-110 transition"
            >
              <ChevronLeft />
            </button>

            <button
              onClick={() => sliderRef.current?.slickNext()}
              className="absolute top-[calc(50%)] -right-16 z-20 max-[950px]:hidden cursor-pointer -translate-y-1/2 bg-gradient-to-r from-[#3ed890] to-[#388ef0] text-white p-2 rounded-full shadow-lg hover:scale-110 transition"
            >
              <ChevronRight />
            </button>
          </>
        )}

        <div
          className="rounded-2xl overflow-hidden"
          style={{ height: "366px" }}
        >
          <Slider ref={sliderRef} {...settings}>
            {banners.map((banner, index) => (
              <div key={banner._id || index} className="h-full">
                <div className="h-full relative">
                  <Image
                    src={getImageUrl(banner.image_url) || "/images/placeholder.png"}
                    alt={`Banner ${index + 1}`}
                    className="w-full h-full object-cover"
                    width={1240}
                    height={366}
                    priority={index === 0}
                    placeholder="blur"
                    blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAABklEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII="
                    onError={(e) => {
                      console.error("Rasm yuklashda xato:", banner.image_url);
                      e.target.src = "/images/placeholder.png";
                    }}
                  />
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </div>

      <style jsx global>{`
        .slick-list {
          overflow: hidden !important;
          border-radius: 16px !important;
          height: 400px !important;
        }
        .slick-slide {
          padding: 0 !important;
          margin: 0 !important;
        }
        .slick-track {
          display: flex !important;
          height: 400px !important;
        }
        .slick-slide > div {
          height: 400px !important;
          border-radius: 16px !important;
          overflow: hidden !important;
        }
        .slick-dots {
          bottom: -30px !important;
        }
        .slick-dots li button:before {
          color: green;
          opacity: 0.3;
        }
        .slick-dots li.slick-active button:before {
          opacity: 1;
          color: #249b73;
        }
      `}</style>
    </section>
  );
}
