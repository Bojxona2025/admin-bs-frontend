"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getImageUrl } from "../../utils/imageHelper";

export const useCartStore = create(
  persist(
    (set, get) => ({
      cart: [],

      normalizeId: (value) => {
        if (!value) return null;
        if (typeof value === "object") {
          return value._id || value.id || null;
        }
        return value;
      },

      addCart: (product, variantId = null) => {
        const { cart } = get();
        const stockLimit =
          Number(
            product?.variant?.stockQuantity ??
              product?.stockQuantity ??
              product?.variant?.quantity
          ) || 0;
        const clampByStock = (qty) =>
          stockLimit > 0 ? Math.min(qty, stockLimit) : qty;

        const itemKey = variantId ? `${product.id}_${variantId}` : product.id;
        const existingItem = cart.find((item) => {
          if (variantId) {
            return (
              item.productId === product.id && item.variantId === variantId
            );
          }
          return item.productId === product.id && !item.variantId;
        });

        if (existingItem) {
          set({
            cart: cart.map((item) =>
              (
                variantId
                  ? item.productId === product.id &&
                    item.variantId === variantId
                  : item.productId === product.id && !item.variantId
              )
                ? {
                    ...item,
                    quantity: clampByStock(
                      item.quantity + (product.quantity || 1)
                    ),
                  }
                : item
            ),
          });
        } else {
          const newCartItem = {
            productId: product.id,
            variantId: variantId || product.selectedVariant || null,
            quantity: clampByStock(product.quantity || 1),
            price:
              product.sale_price || product.discountedPrice || product.price,

            id: product.id,
            name: product.name,
            name_ru: product.name_ru,
            name_en: product.name_en,
            image: product.image,
            original_price:
              product.original_price ||
              (product.discountedPrice ? product.price : null),
            sale_price:
              product.sale_price || product.discountedPrice || product.price,
            checked: false,
            variant: product.variant || null,

            _id: `local_${Date.now()}_${Math.random()}`,
          };

          set({
            cart: [...cart, newCartItem],
          });
        }
      },

      updateCartFromAPI: (apiCart) => {
        const cartData = apiCart?.carts?.[0] || apiCart?.cart || apiCart;

        if (cartData && cartData.products && Array.isArray(cartData.products)) {
          console.log("✅ API dan kelgan mahsulotlar:", cartData.products);

          const cartItems = cartData.products.map((item) => {
            const product =
              typeof item.productId === "object" ? item.productId : null;
            const directVariant =
              (typeof item.variantId === "object" && item.variantId) ||
              (typeof item.variant === "object" && item.variant) ||
              null;
            const variant =
              directVariant ||
              product?.variants?.find((v) => v._id === item.variantId);
            const normalizedProductId =
              get().normalizeId(product?._id || item.productId) || item.productId;
            const normalizedVariantId =
              get().normalizeId(item.variantId || variant?._id) || null;

            console.log("🔍 Product:", product?.name);
            console.log("🔍 Variant:", variant);

            return {
              ...item,
              productId: normalizedProductId,
              variantId: normalizedVariantId,
              quantity: item.quantity,
              price: item.price,
              _id: item._id,

              id: normalizedProductId,
              name: product?.name,
              name_ru: product?.name_ru,
              name_en: product?.name_en,
              image: variant?.mainImg
                ? getImageUrl(variant.mainImg)
                : product?.mainImage
                ? getImageUrl(product.mainImage)
                : item?.image
                ? getImageUrl(item.image)
                : null,
              sale_price:
                variant?.discountedPrice || variant?.price || item.price,
              original_price: variant?.discountedPrice ? variant?.price : null,

              variant: variant
                ? {
                    ...variant,
                    _id: variant._id,
                    discountedPrice: variant.discountedPrice,
                    price: variant.price,
                    color: variant.color,
                    mainImg: variant.mainImg,
                    stockQuantity: variant.stockQuantity,
                    unit: variant.unit,
                  }
                : null,

              checked: false,
            };
          });

          console.log("✅ Formatlangan cart items:", cartItems);
          set({ cart: cartItems });
        } else {
          console.log("⚠️ Mahsulotlar topilmadi yoki noto'g'ri format");
          set({ cart: [] });
        }
      },

      syncWithAPI: (apiCart) => {
        const { cart: localCart } = get();

        // API strukturasini to'g'ri olish
        const cartData = apiCart?.carts?.[0] || apiCart?.cart || apiCart;

        if (!cartData || !cartData.products) {
          console.log("⚠️ syncWithAPI: Ma'lumot yo'q");
          return;
        }

        console.log("🔄 Sync qilinmoqda:", cartData.products);

        const syncedCart = cartData.products.map((apiItem) => {
          const product =
            typeof apiItem.productId === "object" ? apiItem.productId : null;
          const directVariant =
            (typeof apiItem.variantId === "object" && apiItem.variantId) ||
            (typeof apiItem.variant === "object" && apiItem.variant) ||
            null;
          const variant =
            directVariant ||
            product?.variants?.find((v) => v._id === apiItem.variantId);
          const normalizedProductId =
            get().normalizeId(product?._id || apiItem.productId) ||
            apiItem.productId;
          const normalizedVariantId =
            get().normalizeId(apiItem.variantId || variant?._id) || null;

          const localItem = localCart.find(
            (local) =>
              local.productId === normalizedProductId &&
              local.variantId === normalizedVariantId
          );

          return {
            ...apiItem,
            productId: normalizedProductId,
            variantId: normalizedVariantId,
            id: normalizedProductId,
            checked: localItem?.checked || false,

            name: product?.name,
            name_ru: product?.name_ru,
            name_en: product?.name_en,
            image: variant?.mainImg
              ? getImageUrl(variant.mainImg)
              : product?.mainImage
              ? getImageUrl(product.mainImage)
              : apiItem?.image
              ? getImageUrl(apiItem.image)
              : null,
            sale_price:
              variant?.discountedPrice || variant?.price || apiItem.price,
            original_price: variant?.discountedPrice ? variant?.price : null,

            variant: variant
              ? {
                  ...variant,
                  discountedPrice: variant.discountedPrice,
                  price: variant.price,
                  color: variant.color,
                  mainImg: variant.mainImg,
                  stockQuantity: variant.stockQuantity,
                  unit: variant.unit,
                }
              : null,
          };
        });

        console.log("✅ Sync tugadi:", syncedCart);
        set({ cart: syncedCart });
      },

      removeCart: (productId, variantId = null) => {
        const normalizedProductId = get().normalizeId(productId);
        const normalizedVariantId = get().normalizeId(variantId);
        set({
          cart: get().cart.filter((item) => {
            const itemProductId = get().normalizeId(item.productId);
            const itemVariantId = get().normalizeId(item.variantId);
            if (variantId) {
              return !(
                itemProductId === normalizedProductId &&
                itemVariantId === normalizedVariantId
              );
            }
            return !(itemProductId === normalizedProductId && !itemVariantId);
          }),
        });
      },

      clearCart: () => set({ cart: [] }),

      clearCheckedItems: () =>
        set((state) => ({
          cart: state.cart.filter((item) => !item.checked),
        })),

      updateQuantity: (productId, quantity, variantId = null) => {
        const normalizedProductId = get().normalizeId(productId);
        const normalizedVariantId = get().normalizeId(variantId);
        if (quantity <= 0) {
          get().removeCart(normalizedProductId, normalizedVariantId);
          return;
        }

        set({
          cart: get().cart.map((item) => {
            const isMatch = variantId
              ? get().normalizeId(item.productId) === normalizedProductId &&
                get().normalizeId(item.variantId) === normalizedVariantId
              : get().normalizeId(item.productId) === normalizedProductId &&
                !get().normalizeId(item.variantId);

            if (!isMatch) return item;

            const stockLimit =
              Number(
                item?.variant?.stockQuantity ??
                  item?.stockQuantity ??
                  item?.variant?.quantity
              ) || 0;
            const safeQuantity =
              stockLimit > 0 ? Math.min(quantity, stockLimit) : quantity;

            return { ...item, quantity: safeQuantity };
          }),
        });
      },

      toggleChecked: (productId, variantId = null) => {
        const normalizedProductId = get().normalizeId(productId);
        const normalizedVariantId = get().normalizeId(variantId);
        set({
          cart: get().cart.map((item) => {
            const isMatch = variantId
              ? get().normalizeId(item.productId) === normalizedProductId &&
                get().normalizeId(item.variantId) === normalizedVariantId
              : get().normalizeId(item.productId) === normalizedProductId &&
                !get().normalizeId(item.variantId);

            return isMatch ? { ...item, checked: !item.checked } : item;
          }),
        });
      },

      onChecked: () => {
        set({
          cart: get().cart.map((item) => ({ ...item, checked: true })),
        });
      },

      offChecked: () => {
        set({
          cart: get().cart.map((item) => ({ ...item, checked: false })),
        });
      },

      getTotalPrice: () => {
        return get()
          .cart.filter((item) => item.checked)
          .reduce((total, item) => {
            let price = 0;

            if (item.variant) {
              price = parseFloat(
                (item.variant.discountedPrice || item.variant.price)
                  ?.toString()
                  .replace(/[^\d.-]/g, "") || 0
              );
            } else {
              price = parseFloat(
                (item.price || item.sale_price)
                  ?.toString()
                  .replace(/[^\d.-]/g, "") || 0
              );
            }

            return total + price * item.quantity;
          }, 0);
      },

      getCheckedItems: () => get().cart.filter((item) => item.checked),

      getCheckedCount: () => {
        return get().cart.filter((item) => item.checked).length;
      },

      getCartForAPI: () => {
        const { cart } = get();
        return {
          products: cart.map((item) => {
            let price = item.price || item.sale_price;

            if (item.variant) {
              price = item.variant.discountedPrice || item.variant.price;
            }

            return {
              productId: item.productId || item.id,
              variantId: item.variantId || null,
              quantity: item.quantity,
              price: price,
            };
          }),
        };
      },

      findCartItem: (productId, variantId = null) => {
        const { cart } = get();
        const normalizedProductId = get().normalizeId(productId);
        const normalizedVariantId = get().normalizeId(variantId);
        return cart.find((item) => {
          if (variantId) {
            return (
              get().normalizeId(item.productId) === normalizedProductId &&
              get().normalizeId(item.variantId) === normalizedVariantId
            );
          }
          return (
            get().normalizeId(item.productId) === normalizedProductId &&
            !get().normalizeId(item.variantId)
          );
        });
      },

      getProductTotalQuantity: (productId) => {
        const { cart } = get();
        const normalizedProductId = get().normalizeId(productId);
        return cart
          .filter((item) => get().normalizeId(item.productId) === normalizedProductId)
          .reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: "cart-storage",
      getStorage: () =>
        typeof window !== "undefined" ? localStorage : undefined,
    }
  )
);
