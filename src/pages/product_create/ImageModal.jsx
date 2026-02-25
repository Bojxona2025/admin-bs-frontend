// ImageModal.jsx
import React from "react";
import { X } from "lucide-react";

export default function ImageModal({ selectedImage, setSelectedImage }) {
  if (!selectedImage) return null;

  // Video fayl turini aniqlash uchun kengaytirilgan tekshirish
  const isVideo = (url) => {
    if (!url) return false;

    // URL orqali video formatini aniqlash
    const videoExtensions = /\.(mp4|mov|webm|avi|mkv|flv|wmv|m4v|3gp|ogv)$/i;
    if (videoExtensions.test(url)) return true;

    // Data URL orqali video formatini aniqlash
    if (url.startsWith("data:video/")) return true;

    // Blob URL uchun tekshirish
    if (url.startsWith("blob:")) return true;

    return false;
  };

  const videoType = isVideo(selectedImage);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={() => setSelectedImage(null)}
    >
      <div className="relative max-w-full max-h-full">
        {videoType ? (
          <video
            src={selectedImage}
            controls
            autoPlay
            muted
            playsInline
            className="max-w-full max-h-[90vh] rounded-lg"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "90vh" }}
            onError={(e) => {
              console.error("Video yuklashda xatolik:", e);
            }}
          >
            <source src={selectedImage} />
            Video yuklanmadi yoki qo'llab-quvvatlanmaydi.
          </video>
        ) : (
          <img
            src={selectedImage}
            alt="Kattaroq ko'rinish"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "90vh" }}
            onError={(e) => {
              console.error("Rasm yuklashda xatolik:", e);
            }}
          />
        )}

        <button
          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 rounded-full p-2 transition-colors shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedImage(null);
          }}
        >
          <X size={20} className="text-white" />
        </button>
      </div>
    </div>
  );
}
