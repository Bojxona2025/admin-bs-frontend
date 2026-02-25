"use client";

import { ShoppingCart, Heart } from "lucide-react";
import Button from "../ui/button";
import Link from "next/link";
import Image from "next/image";

export const laptops = [
  {
    id: 1,
    name: "Apple MacBook Pro 13.3 M2 8GB RAM 256GB SSD",
    price: 16114285,
    specs: "Core i5, 8GB RAM, 256GB SSD",
    image: "/images/mac.jpeg",
    topSale: false,
    orders: 230,
  },
  {
    id: 2,
    name: "Lenovo ThinkPad X1 Carbon",
    price: 16114285,
    specs: "Core i5, 8GB RAM, 256GB SSD",
    image: "/images/mac.jpeg",
    topSale: true,
    orders: 180,
  },
  {
    id: 3,
    name: "HP Spectre x360",
    price: 16114285,
    specs: "Core i5, 8GB RAM, 256GB SSD",
    image: "/images/mac.jpeg",
    topSale: false,
    orders: 150,
  },
  {
    id: 4,
    name: "Acer Aspire 5",
    price: 16114285,
    specs: "Core i5, 8GB RAM, 256GB SSD",
    image: "/images/mac.jpeg",
    topSale: false,
    orders: 200,
  },
  {
    id: 5,
    name: "MSI GS66 Stealth",
    price: 16114285,
    specs: "Core i7, 16GB RAM, 512GB SSD",
    image: "/images/mac.jpeg",
    topSale: true,
    orders: 300,
  },
  {
    id: 6,
    name: "Dell XPS 13",
    price: 16114285,
    specs: "Core i7, 16GB RAM, 512GB SSD",
    image: "/images/mac.jpeg",
    topSale: false,
    orders: 250,
  },
  {
    id: 7,
    name: "ASUS ROG Zephyrus G14",
    price: 16114285,
    specs: "Ryzen 9, 16GB RAM, 1TB SSD",
    image: "/images/mac.jpeg",
    topSale: true,
    orders: 320,
  },
  {
    id: 8,
    name: "Microsoft Surface Laptop 4",
    price: 16114285,
    specs: "Core i5, 8GB RAM, 256GB SSD",
    image: "/images/mac.jpeg",
    topSale: false,
    orders: 170,
  },
  {
    id: 9,
    name: "Razer Blade 15",
    price: 16114285,
    specs: "Core i7, 16GB RAM, 512GB SSD",
    image: "/images/mac.jpeg",
    topSale: true,
    orders: 280,
  },
  {
    id: 10,
    name: "LG Gram 17",
    price: 16114285,
    specs: "Core i7, 16GB RAM, 512GB SSD",
    image: "/images/mac.jpeg",
    topSale: false,
    orders: 190,
  },
  {
    id: 11,
    name: "Samsung Galaxy Book Pro",
    price: 16114285,
    specs: "Core i5, 8GB RAM, 256GB SSD",
    image: "/images/mac.jpeg",
    topSale: false,
    orders: 220,
  },
  {
    id: 12,
    name: "Huawei MateBook X Pro",
    price: 16114285,
    specs: "Core i7, 16GB RAM, 512GB SSD",
    image: "/images/mac.jpeg",
    topSale: false,
    orders: 210,
  },
];

export default function ProductGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
      {laptops.map((laptop) => (
        <div
          key={laptop.id}
          className="relative bg-white rounded-lg shadow-sm transition-all hover:shadow-lg group"
        >
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Saqlash"
              className="h-8 w-8 rounded-full bg-white shadow-sm hover:bg-gray-100"
            >
              <Heart className="h-4 w-4 text-gray-500" />
            </Button>
          </div>

          {/* Product Image */}
          <div className="p-4 flex justify-center h-40">
            <Image
              src={laptop.image}
              alt={laptop.name}
              className="h-full w-full object-contain transition-transform group-hover:scale-105"
              width={500}
              height={300}
              priority
            />
          </div>

          {/* Product Info */}
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">
              {laptop.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{laptop.specs}</p>
            <p className="text-xs text-gray-400 mt-1">
              {laptop.orders} ta buyurtma
            </p>
            <p className="text-lg font-bold text-[#249B73]  mt-2">
              {laptop.price.toLocaleString()} so‘m
            </p>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-2">
              <Link href={`/product`}>
                <Button
                  className="flex-1 bg-[#249B73] hover:bg-[#249B73] text-white text-sm font-medium"
                  aria-label={`Sotib olish ${laptop.name}`}
                >
                  Sotib olish
                </Button>
              </Link>
              <Button
                size="icon"
                variant="outline"
                aria-label="Savatchaga qo'shish"
                className="h-9 w-9 border-gray-300 hover:bg-gray-100"
              >
                <ShoppingCart className="h-4 w-4 text-gray-600" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
