import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useOrderStore = create(
  persist(
    (set, get) => ({
      orders: [],
      reviews: [],

      addOrder: (orderData) => {
        const newOrder = {
          id: Date.now().toString(), 
          date: new Date().toISOString().split("T")[0],
          items: orderData.items.length,
          status: "delivered",
          total: orderData.totalPrice,
          products: orderData.items.map((item) => ({
            id: item.id || item.productId,
            name: item.name,
            price: item.variant
              ? item.variant.discountedPrice || item.variant.price
              : item.sale_price || item.price,
            quantity: item.quantity,
            image: item.variant ? item.variant.mainImg : item.image,
            variant: item.variant,
          })),
          customerInfo: {
            name: orderData.name,
            phone: orderData.phone,
            region: orderData.region,
            pickupPoint: orderData.pickupPoint,
          },
          payment: orderData.payment,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          orders: [newOrder, ...state.orders],
        }));

        return newOrder;
      },

      updateOrderStatus: (orderId, status) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId ? { ...order, status } : order
          ),
        }));
      },

      addReview: (reviewData) => {
        const newReview = {
          id: Date.now(),
          orderId: reviewData.orderId,
          rating: reviewData.rating,
          comment: reviewData.comment,
          date: new Date().toISOString().split("T")[0],
          userId: "current-user",
        };

        set((state) => ({
          reviews: [...state.reviews, newReview],
        }));
      },

      removeReview: (reviewId) => {
        set((state) => ({
          reviews: state.reviews.filter((review) => review.id !== reviewId),
        }));
      },

      getOrders: () => get().orders,

      getOrderReviews: (orderId) => {
        return get().reviews.filter((review) => review.orderId === orderId);
      },
    }),
    {
      name: "order-storage",
      version: 1,
    }
  )
);
