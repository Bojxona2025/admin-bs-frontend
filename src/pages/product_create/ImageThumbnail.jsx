import { X } from "lucide-react";

export default function ImageThumbnail({ image, onDelete, onClick }) {
  const isVideo =
    image.file?.type?.startsWith("video/") ||
    (typeof image.url === "string" && image.url.match(/\.(mp4|webm|ogg)$/i));

  return (
    <div className="relative w-20 h-20 group">
      {isVideo ? (
        <video
          src={image.url}
          className="w-full h-full object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={onClick}
        />
      ) : (
        <img
          src={image.url}
          alt="Mahsulot rasmi"
          className="w-full h-full object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={onClick}
        />
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(image.id);
        }}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      >
        <X size={12} className="text-white" />
      </button>
    </div>
  );
}
