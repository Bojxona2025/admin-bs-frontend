import React from "react";
import { X, Pencil } from "lucide-react";
import { getColorName } from "../../utils/colorUtils";

export default function VariantList({
  variants,
  setVariants,
  setSelectedImage,
  setCurrentVariant,
  setShowVariantForm,
  setEditingVariant,
}) {
  const deleteVariant = (id) => {
    setVariants(variants.filter((variant) => variant.id !== id));
  };

  const handleEdit = (variant) => {
    setCurrentVariant({
      name: variant.name || variant.color || "",
      price: variant.price?.toString() || "",
      code: variant.code || "",
      color: variant.color || "",
      size: variant.size || "",
      unit: variant.unit || "dona",
      discount: variant.discount?.toString() || "",
      stockQuantity: variant.stockQuantity?.toString() || "",
      quantity: variant.quantity?.toString() || "1",
      saleStatus: variant.saleStatus || "active",

      image: variant.image || null,
      imageFile: variant.imageFile || null,
      images: variant.images || [],

      existing: variant.existing || false,
      existingId: variant.existingId || variant.id,
    });

    setEditingVariant(variant.id);
    setShowVariantForm(true);
  };

  return (
    <div className="space-y-3">
      {variants.map((variant) => (
        <div
          key={variant.id}
          className="bg-gray-50 border border-gray-200  rounded-lg p-4 relative"
        >
          <button
            onClick={() => deleteVariant(variant.id)}
            className="absolute top-0 right-2 text-red-500 hover:text-red-700 transition-colors"
          >
            <X size={16} />
          </button>

          <button
            onClick={() => handleEdit(variant)}
            className="absolute cursor-pointer top-0 right-8 text-green-500 hover:text-green-700 transition-colors"
          >
            <Pencil size={16} />
          </button>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">
                Asosiy Rasm
              </h4>
              {variant.image ? (
                <div
                  className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedImage(variant.image)}
                >
                  <img
                    src={variant.image}
                    alt="Variant"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <span className="text-xs text-gray-400">Rasm yo'q</span>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">
                Mahsulot Media ({(variant.images || []).length})
              </h4>
              <div className="flex flex-wrap gap-1">
                {(variant.images || []).slice(0, 3).map((media, index) => {
                  const url = media.url || media;
                  const isVideo = url.match(/\.(mp4|mov|webm)$/i);

                  return (
                    <div
                      key={media.id || index}
                      className="w-12 h-12 rounded border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center overflow-hidden"
                      onClick={() => setSelectedImage(url)}
                    >
                      {isVideo ? (
                        <video
                          src={url}
                          className="w-full h-full object-cover rounded"
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={url}
                          alt={`Mahsulot ${index + 1}`}
                          className="w-full h-full object-cover rounded"
                        />
                      )}
                    </div>
                  );
                })}

                {(variant.images || []).length > 3 && (
                  <div className="w-12 h-12 rounded border border-gray-200 bg-gray-100 flex items-center justify-center">
                    <span className="text-xs text-gray-500">
                      +{(variant.images || []).length - 3}
                    </span>
                  </div>
                )}

                {!(variant.images && variant.images.length > 0) && (
                  <div className="w-12 h-12 rounded border-2 border-dashed border-red-300 bg-red-50 flex items-center justify-center">
                    <span className="text-xs text-red-500">Yo'q</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">
                Ma'lumotlar
              </h4>
              <div className="space-y-1">
                <p className="text-xs">
                  <span className="font-medium">Rang:</span>{" "}
                  {getColorName(variant.color)}
                </p>
                <p className="text-xs">
                  <span className="font-medium">Narx:</span> {variant.price}{" "}
                  so'm
                </p>
                {variant.size && (
                  <p className="text-xs">
                    <span className="font-medium">O'lcham:</span> {variant.size}
                  </p>
                )}
                <p className="text-xs">
                  <span className="font-medium">Birlik:</span> {variant.unit}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">
                Qo'shimcha
              </h4>
              <div className="space-y-1">
                {variant.discount > 0 && (
                  <p className="text-xs">
                    <span className="font-medium">Chegirma:</span>{" "}
                    {variant.discount}%
                  </p>
                )}
                <p className="text-xs">
                  <span className="font-medium">Ombor:</span>{" "}
                  {variant.stockQuantity || 0}
                </p>
                <p className="text-xs">
                  <span className="font-medium">Miqdor:</span>{" "}
                  {variant.quantity}
                </p>
                <p className="text-xs">
                  <span className="font-medium">Holat:</span>{" "}
                  <span
                    className={`px-1 py-0.5 rounded text-xs ${
                      variant.saleStatus === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {variant.saleStatus === "active" ? "Faol" : "Nofaol"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
