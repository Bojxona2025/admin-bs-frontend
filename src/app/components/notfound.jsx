"use client";
import { useState, useEffect } from "react";
import {
  ShoppingBag,
  Home,
  Search,
  ArrowLeft,
  Package,
  AlertCircle,
} from "lucide-react";

export default function NotFound() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleBackClick = () => {
    setIsAnimating(true);
    setTimeout(() => {
      window.history.back();
    });
  };

  const popularProducts = [
    "Elektronika",
    "Kiyim-kechak",
    "Uy-ro'zg'or buyumlari",
    "Sport tovarlari",
    "Kitoblar",
    "Go'zallik vositalari",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 relative overflow-hidden">
      <div className="absolute inset-0">
        <div
          className="absolute w-96 h-96 bg-gradient-to-r from-green-200 to-green-200 rounded-full opacity-20 blur-3xl transition-all duration-1000"
          style={{
            transform: `translate(${mousePosition.x * 0.5}px, ${
              mousePosition.y * 0.3
            }px)`,
          }}
        ></div>
        <div
          className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-r from-pink-200 to-yellow-200 rounded-full opacity-20 blur-2xl transition-all duration-700"
          style={{
            transform: `translate(${-mousePosition.x * 0.3}px, ${
              -mousePosition.y * 0.2
            }px)`,
          }}
        ></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-screen text-center">
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-[#249B73]  to-[#249B73]  rounded-xl shadow-lg">
              <ShoppingBag className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#249B73]  to-[#249B73]  bg-clip-text text-transparent">
              BS Market
            </h1>
          </div>
        </div>

        <div className="mb-8 relative">
          <div className="text-8xl md:text-9xl font-bold text-gray-300 relative">
            4
            <span
              className="inline-block animate-bounce"
              style={{ animationDelay: "0.1s" }}
            >
              0
            </span>
            <span
              className="inline-block animate-bounce"
              style={{ animationDelay: "0.2s" }}
            >
              4
            </span>
            <div className="absolute -top-4 -right-4">
              <AlertCircle className="w-12 h-12 text-red-400 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Sahifa topilmadi
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Kechirasiz, siz qidirayotgan sahifa mavjud emas yoki o'chirilgan
            bo'lishi mumkin. Biroq, bizda hali ham ajoyib mahsulotlar mavjud!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={handleBackClick}
            className={`flex items-center px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl cursor-pointer font-medium transition-all duration-300 hover:from-gray-700 hover:to-gray-800 hover:scale-105 shadow-lg ${
              isAnimating ? "animate-pulse" : ""
            }`}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Orqaga qaytish
          </button>

          <button
            onClick={() => (window.location.href = "/")}
            className="flex items-center px-8 py-4 bg-gradient-to-r from-[#249B73] to-[#249B73] text-white rounded-xl font-medium cursor-pointer transition-all duration-300 hover:from-[#249B73] hover:to-[#249B73] hover:scale-105 shadow-lg"
          >
            <Home className="w-5 h-5 mr-2" />
            Bosh sahifa
          </button>
        </div>

        <div className="mt-12 text-sm text-gray-500">
          <p>© 2025 BS Market. Barcha huquqlar himoyalangan.</p>
        </div>
      </div>
    </div>
  );
}
