import { create } from "zustand";
import { persist } from "zustand/middleware";

const useProductStore = create(
  persist(
    (set, get) => ({
      products: [],
      currentProduct: null,
      loading: false,
      error: null,
      filters: {
        category: "",
        priceRange: [0, 1000000000000],
        brand: "",
        inStock: false,
      },

      setProducts: (products) => set({ products }),

      setCurrentProduct: (product) => set({ currentProduct: product }),

      clearCurrentProduct: () => set({ currentProduct: null }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),

      clearFilters: () =>
        set({
          filters: {
            category: "",
            priceRange: [0, 100000000],
            brand: "",
            inStock: false,
          },
        }),

      getProductById: (id) => {
        const state = get();
        return state.products.find(
          (product) => product.id === id || product._id === id
        );
      },

      addProduct: (product) =>
        set((state) => ({
          products: [...state.products, product],
        })),

      updateProduct: (id, updatedProduct) =>
        set((state) => ({
          products: state.products.map((product) =>
            product.id === id || product._id === id
              ? { ...product, ...updatedProduct }
              : product
          ),
          currentProduct:
            state.currentProduct?.id === id || state.currentProduct?._id === id
              ? { ...state.currentProduct, ...updatedProduct }
              : state.currentProduct,
        })),

      removeProduct: (id) =>
        set((state) => ({
          products: state.products.filter(
            (product) => product.id !== id && product._id !== id
          ),
          currentProduct:
            state.currentProduct?.id === id || state.currentProduct?._id === id
              ? null
              : state.currentProduct,
        })),
    }),
    {
      name: "product-store",
      partialize: (state) => ({
        currentProduct: state.currentProduct,
        filters: state.filters,
      }),
    }
  )
);

export default useProductStore;
