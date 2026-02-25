import React, { useEffect, useState } from "react";
import { X, Upload, ImageIcon, QrCodeIcon } from "lucide-react"; // QrCodeIcon qo'shildi
import EventProductSelect from "./EventProductSelect";
import QRCodeModal from "./QRCodeModal"; // QRCodeModal import qilindi

export default function VariantForm({
  currentVariant,
  setCurrentVariant,
  setVariants,
  setShowVariantForm,
  setSelectedImage,
  editingVariant = null,
  setEditingVariant = null,
  variants = [],
  eventFormData = null,
}) {
  const isEditing = editingVariant !== null;
  const normalizedColor = (currentVariant?.color || "#000000").trim();

  // QR kod uchun state-lar
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentQRCode, setCurrentQRCode] = useState(null);
  const [qrProductName, setQrProductName] = useState("");
  const [qrVariantInfo, setQrVariantInfo] = useState("");
  const [qrVariantSystemCode, setQrVariantSystemCode] = useState("");

  useEffect(() => {
    if (!isEditing || !editingVariant || variants.length === 0) return;

    const variantToEdit = variants.find((v) => v.id === editingVariant);

    if (!variantToEdit) {
      console.warn("Tahrirlanadigan variant topilmadi:", editingVariant);
      return;
    }

    setCurrentVariant({
      ...variantToEdit,
      length: String(variantToEdit.length ?? "0"),
      width: String(variantToEdit.width ?? "0"),
      height: String(variantToEdit.height ?? "0"),
      weight: String(variantToEdit.weight ?? "0"),
      price: String(variantToEdit.price ?? ""),
      discount: String(variantToEdit.discount ?? ""),
      stockQuantity: String(variantToEdit.stockQuantity ?? ""),
      quantity: String(variantToEdit.quantity ?? "0"),
    });
  }, [isEditing, editingVariant, variants]);

  const handleShowQRCode = () => {
    if (currentVariant && currentVariant.variant_qrcode) {
      setCurrentQRCode(currentVariant.variant_qrcode);
      setQrProductName("Mahsulot"); // Yoki formData dan olish mumkin
      setQrVariantInfo(
        `Rang: ${currentVariant.color || "Belgilanmagan"}, Narx: ${
          currentVariant.price || 0
        } UZS`
      );
      setQrVariantSystemCode(
        currentVariant.variant_system_code ||
          currentVariant.variantSystemCode ||
          ""
      );
      setShowQRModal(true);
    } else {
      console.log("Bu variant uchun QR kod mavjud emas");
    }
  };

  const handleCloseQRModal = () => {
    setShowQRModal(false);
    setCurrentQRCode(null);
    setQrProductName("");
    setQrVariantInfo("");
  };

  const handleVariantMainImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCurrentVariant((prev) => ({
          ...prev,
          image: event.target.result,
          imageFile: file,
        }));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleVariantAdditionalImagesUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newImage = {
            id: Date.now() + Math.random(),
            url: event.target.result,
            preview: event.target.result,
            file: file,
            existing: false,
          };
          setCurrentVariant((prev) => ({
            ...prev,
            images: [...(prev.images || []), newImage],
          }));
        };
        reader.readAsDataURL(file);
      });
    }
    e.target.value = "";
  };

  const handleDeleteAdditionalImage = (imageId) => {
    setCurrentVariant((prev) => ({
      ...prev,
      images: (prev.images || []).filter((img) => img.id !== imageId),
    }));
  };

  const handleDeleteMainImage = () => {
    setCurrentVariant((prev) => ({
      ...prev,
      image: null,
      imageFile: null,
    }));
  };

  const canSaveVariant = Number(currentVariant?.price) > 0;

  const handleSaveVariant = () => {
    if (!currentVariant.color?.trim() || !currentVariant.price) {
      console.log("Rang va narx majburiy!");
      return;
    }


    const variantData = {
      id: isEditing ? editingVariant : Date.now(),
      color: normalizedColor,
      unit: currentVariant.unit || "dona",
      price: parseFloat(currentVariant.price) || 0,
      discount: parseFloat(currentVariant.discount) || 0,
      stockQuantity: parseInt(currentVariant.stockQuantity) || 0,
      quantity: parseInt(currentVariant.quantity) || 0,
      saleStatus: currentVariant.saleStatus || "active",
      size: currentVariant.size || "",

      length: parseFloat(currentVariant.length) || 0,
      lengthUnit: "sm",
      width: parseFloat(currentVariant.width) || 0,
      widthUnit: "sm",
      height: parseFloat(currentVariant.height) || 0,
      heightUnit: "sm",
      weight: parseFloat(currentVariant.weight) || 0,
      weightUnit: "kg",

      name: currentVariant.name || currentVariant.color,
      code: currentVariant.code || "",
      image: currentVariant.image,
      imageFile: currentVariant.imageFile,
      images: currentVariant.images || [],
      existing: currentVariant.existing || false,
      existingId: currentVariant.existingId || null,

      // QR kod ma'lumotlarini saqlash
      variant_qrcode: currentVariant.variant_qrcode || null,
      variant_system_code: currentVariant.variant_system_code || "",

      // Event ma'lumotlarini opsional qilish
      eventData:
        eventFormData?.event_id && eventFormData?.selectedProduct
          ? {
              event_id: eventFormData.event_id,
              event_number: eventFormData.event_number,
              event_date: eventFormData.event_date,
              selectedProduct: eventFormData.selectedProduct,
              mib: eventFormData.selectedProduct?.mib,
            }
          : null,
    };

    if (isEditing) {
      setVariants((prev) =>
        prev.map((variant) =>
          variant.id === editingVariant ? variantData : variant
        )
      );

      if (setEditingVariant) {
        setEditingVariant(null);
      }
    } else {
      setVariants((prev) => [...prev, variantData]);
    }

    if (!isEditing) {
      resetForm();
    }
    setShowVariantForm(false);
  };

  const resetForm = () => {
    setCurrentVariant({
      name: "",
      price: "",
      code: "",
      image: null,
      color: "#000000",
      size: "",
      unit: "dona",
      discount: "",
      stockQuantity: "",
      quantity: "0",
      saleStatus: "active",
      images: [],
      imageFile: null,
      existing: false,
      existingId: null,
      length: "0",
      lengthUnit: "sm",
      width: "0",
      widthUnit: "sm",
      height: "0",
      heightUnit: "sm",
      weight: "0",
      weightUnit: "kg",
    });
  };

  const handleCancel = () => {
    if (isEditing && setEditingVariant) {
      setEditingVariant(null);
    }
    setShowVariantForm(false);

    if (!isEditing) {
      resetForm();
    }
  };

  const handleDiscountChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    const limitedValue = Math.min(value, 70);
    setCurrentVariant({ ...currentVariant, discount: limitedValue.toString() });
  };

  const handleStockQuantityChange = (e) => {
    const stockValue = e.target.value;
    setCurrentVariant({
      ...currentVariant,
      stockQuantity: stockValue,
      quantity: stockValue,
    });
  };


  return (
    <>
      <div className="bg-white rounded-lg border-2 border-green-200 p-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">
            {isEditing ? "Variantni Tahrirlash" : "Yangi Variant Qo'shish"}
          </h3>
          <div className="flex items-center gap-2">
            {currentVariant.variant_qrcode && (
              <button
                onClick={handleShowQRCode}
                className="flex items-center cursor-pointer gap-1 bg-[#2db789] hover:bg-[#249B73] text-white px-3 py-1 text-xs rounded transition-colors"
                title="QR kodni ko'rish"
              >
                <QrCodeIcon size={14} />
                <span>QR</span>
              </button>
            )}
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-gray-600 mb-2 font-medium">
              Variant Asosiy Rasmi {!isEditing && "*"}
            </label>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentVariant.image ? (
                  <div className="relative">
                    <div
                      className="w-20 h-20 rounded-lg overflow-hidden border-2 border-green-300 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedImage(currentVariant.image)}
                    >
                      <img
                        src={currentVariant.image}
                        alt="Variant asosiy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={handleDeleteMainImage}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <ImageIcon size={20} className="text-gray-400" />
                  </div>
                )}

                <label className="cursor-pointer bg-[#2db789] hover:bg-[#2db789] text-white px-3 py-2 text-[13px] font-[500] flex items-center gap-1 transition-colors rounded">
                  <Upload size={13} />
                  {currentVariant.image ? "O'zgartirish" : "Asosiy rasm"}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleVariantMainImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-gray-600 mb-2 font-medium">
              Variant Qo'shimcha Rasmlari {!isEditing && "*"}{" "}
              {(currentVariant.images || []).length} ta
            </label>

            <div className="flex items-start gap-4">
              <div className="flex flex-wrap gap-2 mb-3 flex-1">
                {(currentVariant.images || []).map((image, index) => {
                  const isVideo =
                    image.file?.type?.startsWith("video/") ||
                    (typeof image.url === "string" &&
                      image.url.match(/\.(mp4|webm|ogg|mov)$/i));


                      return (
                        <div
                          key={image.id || index}
                          className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group"
                        >
                          {isVideo ? (
                            <video
                              src={image.url || image.preview}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() =>
                                setSelectedImage(image.url || image.preview)
                              }
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={image.url || image.preview}
                              alt={`Qo'shimcha ${index + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() =>
                                setSelectedImage(image.url || image.preview)
                              }
                            />
                          )}
    
                          <button
                            onClick={() => handleDeleteAdditionalImage(image.id)}
                            className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={8} />
                          </button>
    
                          {image.existing && (
                            <div className="absolute bottom-0 left-0 bg-green-500 text-white text-[8px] px-1 rounded-tr">
                              Mavjud
                            </div>
                          )}
    
                          {/* Video uchun play icon qo'shish */}
                          {isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 pointer-events-none">
                              <div className="bg-white bg-opacity-80 rounded-full p-1">
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
    
                    <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                      <Upload size={16} className="text-gray-400" />
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleVariantAdditionalImagesUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
    
                  <label className="cursor-pointer bg-[#2db789] hover:bg-[#2db789] text-white px-3 py-2 text-[13px] font-[500] flex items-center gap-1 transition-colors rounded w-fit">
                    <Upload size={13} />
                    Rasm yuklash
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleVariantAdditionalImagesUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>


              <div className="col-span-2">
            {eventFormData?.event_id && (
              <div className="mb-4 bg-gray-50 p-3 rounded border">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs text-gray-600 font-medium">
                    Event Mahsuloti (Ixtiyoriy)
                  </label>
                  <span className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">
                    Ixtiyoriy
                  </span>
                </div>
                <EventProductSelect
                  formData={eventFormData}
                  setFormData={(data) => {
                    if (window.updateEventFormData) {
                      window.updateEventFormData(data);
                    }
                  }}
                  selectedEventId={eventFormData.event_id}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1 font-medium">
              Rangi <span className="text-red-800">*</span>
            </label>
            <input
              type="color"
              value={normalizedColor}
              onChange={(e) =>
                setCurrentVariant({ ...currentVariant, color: e.target.value })
              }
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-green-500 focus:outline-none"
              placeholder="Qizil, Ko'k, Yashil..."
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1 font-medium">
              Narxi (UZS) <span className="text-red-800">*</span>
            </label>
            <input
              type="number"
              value={currentVariant.price || ""}
              onChange={(e) =>
                setCurrentVariant({ ...currentVariant, price: e.target.value })
              }
              onWheel={(e) => e.target.blur()}
              className="w-full border no-spinner border-gray-300 rounded px-2 py-1 text-xs focus:border-green-500 focus:outline-none"
              placeholder="120000"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              O'lchov birligi <span className="text-red-800">*</span>
            </label>
            <select
              value={currentVariant.unit || "dona"}
              onChange={(e) =>
                setCurrentVariant({ ...currentVariant, unit: e.target.value })
              }
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-green-500 focus:outline-none"
            >
              <option value="dona">Dona</option>
              <option value="tonna">Tonna</option>
              <option value="kg">Kilogram</option>
              <option value="gr">Gramm</option>
              <option value="m">Metr</option>
              <option value="m2">Kvadrat metr</option>
              <option value="ml">Millilitr</option>
              <option value="sm">Santimetr</option>
              <option value="l">Litr</option>
              <option value="set">To'plam</option>
              <option value="pair">Juft</option>
              <option value="roll">O'ram</option>
              <option value="bundle">Tugun / Bog'lama</option>
              <option value="box">Quti</option>
              <option value="pack">Paket</option>
            </select>
          </div>


          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Chegirma (%) - Max 70%
            </label>
            <input
              type="number"
              value={currentVariant.discount || ""}
              onChange={handleDiscountChange}
              onWheel={(e) => e.target.blur()}
              className="w-full no-spinner border border-gray-300 rounded px-2 py-1 text-xs focus:border-green-500 focus:outline-none"
              placeholder="10"
              min="0"
              max="70"
            />
          </div>

          <div className="col-span-2">
            <h4 className="text-xs font-semibold text-gray-700 mb-2 border-b border-gray-200 pb-1">
              O'lchamlari
            </h4>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Uzunligi (sm)
            </label>
            <input
              type="number"
              value={currentVariant.length || ""}
              onChange={(e) =>
                setCurrentVariant({ ...currentVariant, length: e.target.value })
              }
              onWheel={(e) => e.target.blur()}
              className="w-full border no-spinner border-gray-300 rounded px-2 py-1 text-xs focus:border-green-500 focus:outline-none"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Eni (sm)</label>
            <input
              type="number"
              value={currentVariant.width || ""}
              onChange={(e) =>
                setCurrentVariant({ ...currentVariant, width: e.target.value })
              }
              onWheel={(e) => e.target.blur()}
              className="w-full no-spinner border border-gray-300 rounded px-2 py-1 text-xs focus:border-green-500 focus:outline-none"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Balandligi (sm)
            </label>
            <input
              type="number"
              value={currentVariant.height || ""}
              onChange={(e) =>
                setCurrentVariant({ ...currentVariant, height: e.target.value })
              }
              onWheel={(e) => e.target.blur()}
              className="w-full no-spinner border border-gray-300 rounded px-2 py-1 text-xs focus:border-green-500 focus:outline-none"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Og'irligi (kg)
            </label>
            <input
              type="number"
              value={currentVariant.weight || ""}
              onChange={(e) =>
                setCurrentVariant({ ...currentVariant, weight: e.target.value })
              }
              onWheel={(e) => e.target.blur()}
              className="w-full no-spinner border border-gray-300 rounded px-2 py-1 text-xs focus:border-green-500 focus:outline-none"
              placeholder="0"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Ombordagi miqdori
            </label>
            <input
              type="number"
              onWheel={(e) => e.target.blur()}
              value={currentVariant.stockQuantity || ""}
              onChange={handleStockQuantityChange}
              className="w-full no-spinner border border-gray-300 rounded px-2 py-1 text-xs focus:border-green-500 focus:outline-none"
              placeholder="100"
            />
          </div>


          <div>
            <label className="block text-xs text-gray-600 mb-1">Miqdori</label>
            <input
              type="number"
              onWheel={(e) => e.target.blur()}
              value={currentVariant.quantity || "0"}
              onChange={(e) =>
                setCurrentVariant({
                  ...currentVariant,
                  quantity: e.target.value,
                })
              }
              className="w-full no-spinner border border-gray-300 rounded px-2 py-1 text-xs focus:border-green-500 focus:outline-none"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Sotish holati
            </label>
            <select
              value={currentVariant.saleStatus || "active"}
              onChange={(e) =>
                setCurrentVariant({
                  ...currentVariant,
                  saleStatus: e.target.value,
                })
              }
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-green-500 focus:outline-none"
            >
              <option value="active">Faol</option>
              <option value="inactive">Nofaol</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Bekor qilish
          </button>
          <button
            onClick={handleSaveVariant}
            disabled={!canSaveVariant}
            className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            {isEditing ? "Saqlash" : "Qo'shish"}
          </button>
        </div>
      </div>

      <QRCodeModal
        isOpen={showQRModal}
        onClose={handleCloseQRModal}
        qrCodeUrl={currentQRCode}
        productName={qrProductName}
        variantInfo={qrVariantInfo}
        variantSystemCode={qrVariantSystemCode}
      />
    </>
  );
}
    
