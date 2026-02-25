import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useHomeLikes = create(
  persist(
    (set, get) => ({
      likes: [],

      toggleLike: (product) => {
        const { likes } = get();
        const exists = likes.find((item) => item.id === product.id);
        if (exists) {
          set({ likes: likes.filter((item) => item.id !== product.id) });
        } else {
          set({ likes: [...likes, product] });
        }
      },

      removeLike: (productId) => {
        set({ likes: get().likes.filter((item) => item.id !== productId) });
      },

      clearLikes: () => {
        set({ likes: [] });
      },

      isLiked: (productId) => {
        return get().likes.some((item) => item.id === productId);
      },

      getLikesCount: () => {
        return get().likes.length;
      },
    }),
    {
      name: "likes-storage", // localStorage key nomi
      getStorage: () =>
        typeof window !== "undefined" ? localStorage : undefined,
    }
  )
);
