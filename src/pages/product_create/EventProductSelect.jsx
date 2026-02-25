import React, { useState, useEffect } from "react";
import { ChevronDown, Package } from "lucide-react";
import $api from "../../http/api";

export default function EventProductSelect({
  formData,
  setFormData,
  selectedEventId,
}) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (selectedEventId) {
      fetchProductsByEventId(selectedEventId);
    }
  }, [selectedEventId]);

  const fetchProductsByEventId = async (eventId) => {
    setIsLoading(true);
    setError(null);

    try {
      // fetch emas, $api ishlatyapmiz
      const response = await $api.get(`/bojxona/events/product/by/${eventId}`, {
        params: {
          page: 1,
          limit: 100,
        },
      });

      if (response.data?.success && response.data?.data?.products) {
        setProducts(response.data.data.products);
      } else {
        setProducts([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductSelect = async (product) => {
    try {
      // productni asosiy malumotlari
      const selectedProductData = {
        id: product.id,
        name: product.name,
        unit: product.unit,
        quantity: product.quantity,
        active_quantity: product.active_quantity,

        event_id: product.eventId,
        event_number: product.event_product?.event_number,
        event_date: product.event_product?.date,

        bs_product_id: product.id,

        warehouse: product.warehouse,
        region: product.region_product,
        type: product.type_product,
        childType: product.product_child,
        status: product.statusProduct,
        creator: product.productCreator,

        fullProductData: product,
      };

      const detailRes = await $api.get(`/bojxona/product/by/${product.id}`);

      if (detailRes.data?.success && detailRes.data?.data) {
        const detailedProduct = detailRes.data.data;

        selectedProductData.mib_dalolatnoma =
          detailedProduct?.sales_product?.[0]?.mib_dalolatnoma || "";
      }

      setFormData({
        ...formData,
        selectedProduct: selectedProductData,
        event_id: product.eventId,
        event_number: product.event_product?.event_number,
        event_date: product.event_product?.date,
        mib_dalolatnoma: selectedProductData.mib_dalolatnoma || "",
        bs_product_id: product.id,
      });

      setIsDropdownOpen(false);
    } catch (err) {
      console.error("Product detail fetch error:", err);
    }
  };

  const handleRemoveSelection = () => {
    setFormData({
      ...formData,
      selectedProduct: null,
      bs_product_id: null,
    });
  };

  if (!selectedEventId) {
    return (
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-700">
          Avval event tanlang, keyin mahsulotlarni ko'rishingiz mumkin
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-600 font-medium">
        Mahsulotni tanlang <span className="text-red-800">*</span>
      </label>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
          {error}
        </div>
      )}

      {formData.selectedProduct ? (
        <div className="p-3 bg-green-50 border-2 border-green-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Package size={14} className="text-green-600" />
                <h4 className="text-xs font-medium text-green-800">
                  Tanlangan mahsulot
                </h4>
              </div>

              <p className="text-lg text-green-700 mb-2 leading-relaxed">
                {formData.selectedProduct.name}
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Miqdori:</span>
                  <span className="ml-1 font-medium">
                    {formData.selectedProduct.quantity}{" "}
                    {formData.selectedProduct.unit}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Event №:</span>
                  <span className="ml-1 font-medium">
                    {formData.selectedProduct.event_number}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Turi:</span>
                  <span className="ml-1 font-medium">
                    {formData.selectedProduct.childType?.name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Holat:</span>
                  <span className="ml-1 font-medium">
                    {formData.selectedProduct.status?.product_status}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleRemoveSelection}
              className="text-red-500 hover:text-red-700 cursor-pointer text-xs px-2 py-1 hover:bg-red-50 rounded transition-colors"
            >
              O'chirish
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={isLoading}
            className="w-full flex items-center cursor-pointer justify-between p-2 border border-gray-300 rounded text-xs focus:border-green-500 focus:outline-none hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className={isLoading ? "text-gray-400" : "text-gray-700"}>
              {isLoading
                ? "Mahsulotlar yuklanmoqda..."
                : products.length > 0
                ? "Mahsulotni tanlang"
                : "Mahsulotlar mavjud emas"}
            </span>
            <ChevronDown
              size={14}
              className={`transition-transform ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isDropdownOpen && !isLoading && products.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleProductSelect(product)}
                  className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-800 leading-relaxed">
                      {product.name}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {product.quantity} {product.unit}
                      </span>
                      <span className="text-green-600">
                        {product.product_child?.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>#{product.event_product?.event_number}</span>
                      <span>{product.statusProduct?.product_status}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {isDropdownOpen && !isLoading && products.length === 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3">
              <p className="text-xs text-gray-500 text-center">
                Bu event uchun mahsulotlar topilmadi
              </p>
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center p-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
          <span className="ml-2 text-xs text-gray-600">Yuklanmoqda...</span>
        </div>
      )}
    </div>
  );
}
