"use client";
import dynamic from "next/dynamic";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import $api from "../http/api";
import { getImageUrl } from "../utils/imageHelper";

const Slider = dynamic(() => import("react-slick"), { ssr: false });

export default function MobilFooterBanner() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const sliderRef = useRef(null);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoading(true);
        const response = await $api.get(
          "/banners/all?page=1&limit=10&position=footer_header"
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
    centerPadding: "0px",
    pauseOnHover: true,
  };

  if (loading) {
    return (
      <section className="text-center relative mt-4 mb-3 hidden max-[720px]:block">
        <div className="relative w-full px-[5%] min-[720px]:w-[90%] min-[720px]:mx-auto">
          <div
            className="rounded-2xl overflow-hidden bg-gray-200 animate-pulse"
            style={{ height: "180px" }}
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
    <section className="text-center relative mt-4 mb-3 hidden max-[720px]:block h-[190px]">
      <div className="relative w-full px-[5%] min-[720px]:w-[90%] min-[720px]:mx-auto">
        <div className="mobil-banner-slider rounded-2xl overflow-hidden">
          <Slider ref={sliderRef} {...settings}>
            {banners.map((banner, index) => (
              <div key={banner._id || index}>
                <div className="relative w-full" style={{ height: "180px" }}>
                  <Image
                    src={
                      getImageUrl(banner.mobile_image_url) ||
                      "/images/placeholder.png"
                    }
                    alt={`Banner ${index + 1}`}
                    fill
                    className="object-cover"
                    priority={index === 0}
                    placeholder="blur"
                    blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAABklEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII="
                    onError={(e) => {
                      console.error(
                        "Rasm yuklashda xato:",
                        banner.mobile_image_url
                      );
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
        .mobil-banner-slider .slick-list {
          overflow: hidden !important;
          border-radius: 16px !important;
        }

        .mobil-banner-slider .slick-track {
          display: flex !important;
        }

        .mobil-banner-slider .slick-slide {
          height: auto !important;
        }

        .mobil-banner-slider .slick-slide > div {
          height: 180px !important;
          border-radius: 16px !important;
          overflow: hidden !important;
        }

        .mobil-banner-slider .slick-dots {
          bottom: -30px !important;
        }

        .mobil-banner-slider .slick-dots li button:before {
          color: green;
          opacity: 0.3;
        }

        .mobil-banner-slider .slick-dots li.slick-active button:before {
          opacity: 1;
          color: #249b73;
        }
      `}</style>
    </section>
  );
}
