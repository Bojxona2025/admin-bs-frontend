const MediaPreview = ({
  src,
  alt,
  className,
  onClick,
  showPlayIcon = false,
}) => {
  const isVideo = (src) => {
    const videoExtensions = [
      ".mp4",
      ".avi",
      ".mov",
      ".wmv",
      ".flv",
      ".webm",
      ".mkv",
    ];
    return videoExtensions.some((ext) => src.toLowerCase().includes(ext));
  };

  if (isVideo(src)) {
    return (
      <div className={`relative ${className}`} onClick={onClick}>
        <video className="w-full h-full object-cover" muted preload="metadata">
          <source src={src} type="video/mp4" />
          Video yuklanmadi
        </video>
        {showPlayIcon && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <div className="w-8 h-8 bg-white bg-opacity-80 rounded-full flex items-center justify-center">
              <div className="w-0 h-0 border-l-4 border-l-gray-800 border-y-2 border-y-transparent ml-1"></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`object-cover ${className}`}
      onClick={onClick}
    />
  );
};

export default MediaPreview;
