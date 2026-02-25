import React from "react";
import { GripVertical, X } from "lucide-react";
import ImageModal from "./ImageModal";
import ImageThumbnail from "./ImageThumbnail";

export default function ImageSection({
  images,
  setImages,
  selectedImage,
  setSelectedImage,
  expanded,
  toggleSection,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  sectionId,
  draggedItem,
  dragOverItem,
}) {
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const hasMainImage = images.some((img) => img.isMainImage);
        const newImage = {
          id: Date.now(),
          url: event.target.result,
          preview: event.target.result,
          file: file,
          existing: false,
          isMainImage: !hasMainImage,
        };
        setImages([...images, newImage]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleDeleteImage = (id) => {
    setImages(images.filter((img) => img.id !== id));
    if (
      selectedImage &&
      images.find((img) => img.id === id)?.url === selectedImage
    ) {
      setSelectedImage(null);
    }
  };

  return (
    <div
      className={`bg-[#f3f1f1] mb-2 transition-all duration-200 ${
        draggedItem === sectionId ? "opacity-50 scale-95" : ""
      } ${dragOverItem === sectionId ? "ring-2 ring-green-400 bg-green-50" : ""}`}
      draggable
      onDragStart={(e) => onDragStart(e, sectionId)}
      onDragOver={(e) => onDragOver(e, sectionId)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, sectionId)}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0 px-2 py-3 cursor-grab active:cursor-grabbing">
          <GripVertical
            size={16}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          />
        </div>
        <button onClick={toggleSection} className="flex-1 px-2 py-3 text-left">
          <div className="flex justify-between items-center cursor-pointer">
            <span className="text-sm font-medium">Rasmlar</span>
            <div className="transition-transform duration-200">
              <span
                className={`text-gray-600 inline-block transition-transform duration-300 ${
                  expanded ? "rotate-0" : "-rotate-90"
                }`}
              >
                ▼
              </span>
            </div>
          </div>
        </button>
      </div>
      {expanded && (
        <div className="px-6 pb-3">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            id="imageUpload"
            className="hidden"
          />
          <div className="mt-4 grid grid-cols-5">
            {images.map((image) => (
              <ImageThumbnail
                key={image.id}
                image={image}
                onDelete={handleDeleteImage}
                onClick={() => setSelectedImage(image.url)}
              />
            ))}
          </div>
          <label
            htmlFor="imageUpload"
            className="flex items-center w-[100px] bg-gray-200 hover:bg-gray-300 font-medium px-4 py-1 rounded transition-colors duration-200 cursor-pointer gap-1 mt-2"
          >
            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-[16px] mb-1">+</span>
            </div>
            <span className="text-black text-sm">Rasm</span>
          </label>
        </div>
      )}
      <ImageModal
        selectedImage={selectedImage}
        setSelectedImage={setSelectedImage}
      />
    </div>
  );
}
