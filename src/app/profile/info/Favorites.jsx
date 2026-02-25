"use client";
import { Heart, Star, Trash2, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useHomeLikes } from "@/app/components/hooks/likes";
import { useCartStore } from "@/app/components/hooks/cart";

const Favorites = () => {
  const { likes, toggleLike, removeLike } = useHomeLikes();
  const { addCart, updateQuantity, removeCart, cart } = useCartStore();
  const [isLoading, setIsLoading] = useState({});

  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    setIsLoading((prev) => ({ ...prev, [product.id]: true }));

    setTimeout(() => {
      addCart({
        ...product,
        quantity: 1,
        checked: false,
      });

      setIsLoading((prev) => ({ ...prev, [product.id]: false }));
    }, );
  };

  const handleQuantityChange = (e, productId, change) => {
    e.stopPropagation();
    const currentItem = cart.find((item) => item.id === productId);
    if (!currentItem) return;

    const newQuantity = currentItem.quantity + change;
    if (newQuantity <= 0) {
      removeCart(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleRemoveFavorite = (e, id) => {
    e.stopPropagation();
    removeLike(id);
  };

  const handleProductClick = (e, id) => {
    e.stopPropagation();
    console.log(`Mahsulot ${id} sahifasiga o'tish`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mening sevimlilarim</CardTitle>
      </CardHeader>
      <CardContent>
        {likes.length === 0 ? (
          <p className="text-gray-500 text-center">Sevimli mahsulotlar yo'q</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {likes.map((item) => {
              const isInCart = cart.find((cartItem) => cartItem.id === item.id);
              const quantity = isInCart ? isInCart.quantity : 0;

              return (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-lg overflow-hidden relative cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={(e) => handleProductClick(e, item.id)}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleRemoveFavorite(e, item.id)}
                    className="absolute top-2 right-2 text-red-600 hover:text-red-800 cursor-pointer z-10"
                  >
                    <Trash2 size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => toggleLike(item)}
                    className={`absolute top-2 right-10 cursor-pointer z-10 ${
                      likes.some((like) => like.id === item.id)
                        ? "text-red-500"
                        : "text-gray-400"
                    }`}
                  >
                    <Heart
                      size={18}
                      fill={
                        likes.some((like) => like.id === item.id)
                          ? "red"
                          : "none"
                      }
                    />
                  </Button>
                  <div className="relative w-full h-40 mb-3">
                    <Image
                      src={item.image || "/images/placeholder-product.jpg"}
                      alt={item.name}
                      className="object-contain"
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 line-clamp-2 h-12">
                      {item.name}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-lg font-bold text-gray-900">
                        {item.sale_price || item.price} so'm
                      </p>
                    </div>
                    {isLoading[item.id] ? (
                      <Button
                        className="w-full mt-4 flex items-center justify-center gap-2 bg-[#249B73] text-gray-200"
                        disabled
                      >
                        <span className="loader  border-2 border-t-[#249B73] rounded-full w-4 h-4 animate-spin" />
                        Yuklanmoqda...
                      </Button>
                    ) : quantity === 0 ? (
                      <Button
                        variant="outline"
                        onClick={(e) => handleAddToCart(e, item)}
                        className="w-full mt-4 flex items-center justify-center gap-2 cursor-pointer border-[#249B73] text-[#249B73] hover:bg-[#0d63f50f]"
                      >
                        <ShoppingCart size={18} />
                        Savatga qo'shish
                      </Button>
                    ) : (
                      <div className="w-full mt-4 flex items-center justify-between border border-[#249B73] rounded-lg px-4 py-2 bg-white">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleQuantityChange(e, item.id, -1)}
                          className="text-xl text-[#f44336] cursor-pointer hover:scale-110"
                        >
                          −
                        </Button>
                        <span className="bg-[#249B73] text-white text-sm w-7 h-7 flex items-center justify-center rounded-full font-semibold">
                          {quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleQuantityChange(e, item.id, 1)}
                          className="text-xl text-[#4caf50] cursor-pointer hover:scale-110"
                        >
                          +
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Favorites;
