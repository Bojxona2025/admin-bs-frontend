import $api from "../../http/api"; // axios instance with baseURL
import { useEffect, useState } from "react";

const ProtectedImage = ({ imagePath }) => {
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    let mounted = true;
    let createdUrl = null;

    const fetchImage = async () => {
      try {
        const res = await $api.get(
          `${import.meta.env.VITE_BASE_URL}${imagePath}`,
          {
            responseType: "blob",
            headers: {
              Authorization: `Bearer ${
                localStorage.getItem("accessToken") ||
                localStorage.getItem("access_token") ||
                ""
              }`,
            },
          }
        );

        createdUrl = URL.createObjectURL(res.data);
        if (mounted) {
          setImageUrl(createdUrl);
        }
      } catch (err) {
        console.error("Rasmni olishda xatolik:", err);
      }
    };

    if (imagePath) fetchImage();

    return () => {
      mounted = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [imagePath]);

  return imageUrl ? (
    <img
      src={imageUrl}
      alt="QR Code"
      className="h-25 w-25"
      loading="lazy"
      decoding="async"
    />
  ) : (
    <div className="flex items-center justify-center w-22 h-22 bg-gray-300 rounded-sm sm:w-23 dark:bg-white-700">
      <svg
        className="w-10 h-10 text-gray-200 dark:text-gray-600"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 20 18"
      >
        <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z" />
      </svg>
    </div>
  );
};

export default ProtectedImage;
