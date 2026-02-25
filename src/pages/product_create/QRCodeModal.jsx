import React, { useRef } from "react";
import { X, Download, Printer } from "lucide-react";

const QRCodeModal = ({
  isOpen,
  onClose,
  qrCodeUrl,
  productName,
  variantInfo,
  variantSystemCode,
}) => {
  const printRef = useRef();

  if (!isOpen) return null;

  const getColorName = (colorCode) => {
    const colorMap = {
      "#f40b0b": "Qizil",
      "#ff0000": "Qizil",
      "#dc2626": "Qizil",
      "#ef4444": "Qizil",
      "#f87171": "Och qizil",

      "#f3f708": "Sariq",
      "#ffff00": "Sariq",
      "#fbbf24": "Sariq",
      "#f59e0b": "To'q sariq",
      "#fde047": "Och sariq",

      "#052beb": "Ko'k",
      "#0000ff": "Ko'k",
      "#2563eb": "Ko'k",
      "#3b82f6": "Ko'k",
      "#60a5fa": "Och ko'k",

      "#00ff00": "Yashil",
      "#22c55e": "Yashil",
      "#16a34a": "To'q yashil",
      "#4ade80": "Och yashil",

      "#800080": "Binafsha",
      "#a855f7": "Binafsha",
      "#8b5cf6": "Binafsha",
      "#c084fc": "Och binafsha",

      "#ffa500": "Apelsin",
      "#f97316": "Apelsin",
      "#fb923c": "Och apelsin",

      "#ffc0cb": "Pushti",
      "#ec4899": "Pushti",
      "#f472b6": "Pushti",

      "#000000": "Qora",
      "#1f2937": "To'q kulrang",
      "#374151": "Kulrang",
      "#6b7280": "Och kulrang",
      "#ffffff": "Oq",

      "#a52a2a": "Jigarrang",
      "#d2691e": "Jigarrang",
      "#cd853f": "Och jigarrang",
    };

    if (colorMap[colorCode.toLowerCase()]) {
      return colorMap[colorCode.toLowerCase()];
    }

    const hex = colorCode.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    if (r > 200 && g < 100 && b < 100) return "Qizil";
    if (r > 200 && g > 200 && b < 100) return "Sariq";
    if (r < 100 && g < 100 && b > 200) return "Ko'k";
    if (r < 100 && g > 200 && b < 100) return "Yashil";
    if (r > 150 && g < 150 && b > 150) return "Binafsha";
    if (r > 200 && g > 100 && b < 100) return "Apelsin";
    if (r > 150 && g > 150 && b > 150) return "Och kulrang";
    if (r < 100 && g < 100 && b < 100) return "To'q kulrang";

    return colorCode;
  };

  const formatVariantInfo = (info) => {
    if (!info) return "";

    const colorRegex = /#[0-9a-fA-F]{6}/g;

    return info.replace(colorRegex, (match) => getColorName(match));
  };

  const formatQRCodeUrl = (url) => {
    if (!url) return "";

    if (url.startsWith("http")) {
      return url;
    }

    const cleanUrl = url.replace(/\\/g, "/").replace(/^\/+/, "");
    const baseUrl = import.meta.env.VITE_BASE_URL || "http://localhost:3000";
    return `${baseUrl}/${cleanUrl}`;
  };

  const fullQRCodeUrl = formatQRCodeUrl(qrCodeUrl);
  const formattedVariantInfo = formatVariantInfo(variantInfo);

  const convertImageToBase64 = (url) => {
    return new Promise((resolve, reject) => {
      if (!url) {
        resolve("");
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = function () {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img, 0, 0);

        try {
          const dataURL = canvas.toDataURL("image/png");
          resolve(dataURL);
        } catch (error) {
          console.error("Canvas toDataURL error:", error);
          resolve(url);
        }
      };

      img.onerror = function (error) {
        console.error("Image load error:", error);
        resolve("");
      };

      setTimeout(() => {
        if (img.complete === false) {
          resolve(url);
        }
      }, 3000);

      img.src = url;
    });
  };

  const handlePrint = async (index) => {
    if (!fullQRCodeUrl) {
      console.log("QR kod mavjud emas");
      return;
    }

    try {
      const base64Image = await convertImageToBase64(fullQRCodeUrl);
      const printWindow = window.open("", "_blank", "width=800,height=600");

      if (!printWindow) {
        console.log("Print oynasi ochilmadi");
        return;
      }

      let cellsHtml = "";
      for (let i = 1; i <= 24; i++) {
        if (i === index) {
          cellsHtml += `
          <div class="cell">
            <img class="qr-image" src="${base64Image}" alt="QR" />
            <p>${variantSystemCode}</p>
          </div>
        `;
        } else {
          cellsHtml += `<div class="cell empty"></div>`;
        }
      }

      printWindow.document.write(`
      <html>
        <head>
          <style>
            @page { size: A4; margin: 24px; }
            body { font-family: Arial, sans-serif; }
            .grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              width: 100%;
              max-width: 800px;
              margin: 0 auto;
            }
            .cell {
              width: 120px;
              height: 150px;
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              box-sizing: border-box;
              padding-left: 5px;   
              padding-right: 5px;
            }
            .cell img {
              width: 80px;
              height: 80px;
            }
            
            .qr-image {
              width: 100px;
              height: 100px;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${cellsHtml}
          </div>
        </body>
      </html>
    `);

      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } catch (error) {
      console.error("Chop etishda xatolik:", error);
      console.log("Chop etishda xatolik yuz berdi");
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(fullQRCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `qr-code-${productName || "product"}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("QR kod yuklab olishda xatolik:", error);
      console.log("QR kodni yuklab olishda xatolik yuz berdi");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full h-[600px] overflow-y-auto mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X size={24} />
        </button>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="qr-item border p-2 h-20 cursor-pointer text-center"
              onClick={() => handlePrint(i + 1)}
            >
              <p>{i + 1}</p>
              <p>QR</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">QR Kod</h2>

          {fullQRCodeUrl ? (
            <div className="mb-6">
              <img
                src={fullQRCodeUrl}
                alt="QR Code"
                className="mx-auto max-w-[250px] h-auto border border-gray-300 rounded-lg shadow-sm"
                crossOrigin="anonymous"
                onError={(e) => {
                  console.error("QR kod yuklashda xatolik:", e);
                  e.target.src =
                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5RUiBrb2QgdG9waWxtYWRpPC90ZXh0Pjwvc3ZnPg==";
                }}
              />
              <p className="mt-3 text-gray-700 font-medium text-lg">
                {variantSystemCode}
              </p>
            </div>
          ) : (
            <div className="mb-6 p-8 bg-gray-100 rounded-lg">
              <p className="text-gray-500">QR kod mavjud emas</p>
            </div>
          )}

          <div className="flex justify-center space-x-4">
            <button
              onClick={handleDownload}
              disabled={!fullQRCodeUrl}
              className="flex items-center space-x-2 cursor-pointer bg-[#2db789]  disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Download size={18} />
              <span>Yuklab olish</span>
            </button>

            {/* <button
              onClick={handlePrint}
              disabled={!fullQRCodeUrl}
              data-print-button
              className="flex items-center space-x-2 cursor-pointer bg-[#2db789] hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Printer size={18} />
              <span>Chop etish</span>
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
