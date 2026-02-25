"use client";

import Head from "next/head";
import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useHomeLikes } from "../components/hooks/likes";
import ProductCard from "../components/ProductCard";
import Image from "next/image";
import Button from "../components/ui/button";
import BestSellers from "../pages/bestsellers/page";
import { useTranslation } from "react-i18next";

export default function Wishes() {
  const { likes } = useHomeLikes();
  const { t, i18n } = useTranslation();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Show loading or placeholder during hydration
  if (!isClient) {
    return (
      <div>
        <Head>
          <title>Baraka Savdo</title>
          <meta name="description" content="Online shopping platform" />
        </Head>
        <Navbar />
        <section className="py-8 bg-gray-100">
          <div className="flex flex-col items-center text-center px-4">
            <Image
              src={"/images/no-like.png"}
              alt="No image"
              width="100"
              height="400"
              priority
            />
            <p className="text-2xl font-semibold">Loading...</p>
          </div>
        </section>
        <BestSellers />
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Head>
        <title>Baraka Savdo</title>
        <meta name="description" content="Online shopping platform" />
      </Head>
      <Navbar />
      <section className="py-8 bg-gray-100">
        {likes.length === 0 ? (
          <div className="flex flex-col items-center text-center px-4">
            <Image
              src={"/images/no-like.png"}
              alt="No image"
              width="100"
              height="400"
              priority
            />
            <p className="text-2xl font-semibold">
              {t("wishes.add_favorites")}
            </p>
            <p className="text-md py-3 max-w-md">{t("wishes.no_likes")}</p>

            <Button className="cursor-pointer mt-2">
              <a href="/">{t("wishes.back_home")}</a>
            </Button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 max-[500px]:px-2">
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
              {t("wishes.favorites")}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {likes.map((product, index) => (
                <ProductCard key={index} product={product} />
              ))}
            </div>
          </div>
        )}
      </section>
      <BestSellers />
      <Footer />
    </div>
  );
}
