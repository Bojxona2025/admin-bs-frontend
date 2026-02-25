import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAddressesStore = create(
  persist(
    (set, get) => ({
      addresses: [
        {
          id: 1,
          name: "Uy manzili",
          address: "Toshkent, Yunusobod tumani, Buyuk ipak yo'li 123",
          phone: "+998901234567",
          default: true,
        },
        {
          id: 2,
          name: "Ish joyi",
          address: "Toshkent, Mirobod tumani, Amir Temur ko'chasi 45-uy",
          phone: "+998901234567",
          default: false,
        },
      ],
      addAddress: (address) => {
        const newId = get().addresses.length + 1;
        if (address.default) {
          set({
            addresses: [
              ...get().addresses.map((addr) => ({ ...addr, default: false })),
              { ...address, id: newId },
            ],
          });
        } else {
          set({
            addresses: [...get().addresses, { ...address, id: newId }],
          });
        }
      },
      updateAddress: (id, updatedAddress) => {
        set({
          addresses: get().addresses.map((addr) =>
            addr.id === id
              ? {
                  ...updatedAddress,
                  id,
                  default: updatedAddress.default ? true : addr.default,
                }
              : {
                  ...addr,
                  default: updatedAddress.default ? false : addr.default,
                }
          ),
        });
      },
      removeAddress: (id) => {
        set({
          addresses: get().addresses.filter((addr) => addr.id !== id),
        });
      },
      setDefaultAddress: (id) => {
        set({
          addresses: get().addresses.map((addr) =>
            addr.id === id
              ? { ...addr, default: true }
              : { ...addr, default: false }
          ),
        });
      },
    }),
    {
      name: "addresses-storage",
      getStorage: () =>
        typeof window !== "undefined" ? localStorage : undefined,
    }
  )
);
