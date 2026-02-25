import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useOrdersStore = create(
  persist(
    (set, get) => ({
      orders: [
        {
          id: 1,
          status: "delivered",
          total: "145,000",
          date: "15 Dekabr",
          items: 3,
        },
        {
          id: 2,
          status: "shipping",
          total: "89,500",
          date: "12 Dekabr",
          items: 1,
        },
        {
          id: 3,
          status: "processing",
          total: "234,000",
          date: "10 Dekabr",
          items: 5,
        },
      ],
      addOrder: (order) => {
        set({
          orders: [...get().orders, { ...order, id: get().orders.length + 1 }],
        });
      },
      removeOrder: (orderId) => {
        set({
          orders: get().orders.filter((order) => order.id !== orderId),
        });
      },
      updateOrderStatus: (orderId, status) => {
        set({
          orders: get().orders.map((order) =>
            order.id === orderId ? { ...order, status } : order
          ),
        });
      },
    }),
    {
      name: "orders-storage",
      getStorage: () =>
        typeof window !== "undefined" ? localStorage : undefined,
    }
  )
);
