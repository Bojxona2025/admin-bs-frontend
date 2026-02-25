const fixMojibake = (value) => {
  if (!value || typeof value !== "string") return value;
  if (!/[ÐÑÂ]/.test(value)) return value;

  try {
    const bytes = Uint8Array.from(
      Array.from(value).map((char) => char.charCodeAt(0) & 0xff)
    );
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    try {
      return decodeURIComponent(escape(value));
    } catch {
      return value;
    }
  }
};

const toAbsoluteUrl = (pathValue) => {
  const baseURL =
    (process.env.NEXT_PUBLIC_API_URL || "https://bsmarket.uz/api").replace(
      /\/+$/,
      ""
    );
  const baseOrigin = baseURL.replace(/\/api$/i, "");

  const normalizedPath = pathValue
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^api\/+/i, "");

  if (!normalizedPath) return null;

  const encodedPath = encodeURI(normalizedPath);

  // Brauzerdan har doim Next /api proxy orqali yuramiz.
  // Bu backendga kerakli internal headerlarni server tomonda qo'shishga yordam beradi.
  if (normalizedPath.startsWith("uploads/")) {
    return `/api/${encodedPath}`;
  }

  return `/api/${encodedPath}`;
};

export const getImageUrls = (imagePath) => {
  if (!imagePath || typeof imagePath !== "string") {
    return [];
  }

  const originalPath = imagePath.trim();
  const repairedPath = fixMojibake(originalPath);

  const candidates = [];

  const pushCandidate = (value) => {
    if (!value) return;
    if (value.startsWith("http://") || value.startsWith("https://")) {
      candidates.push(encodeURI(value));
      return;
    }
    const absolute = toAbsoluteUrl(value);
    if (absolute) candidates.push(absolute);
  };

  // Avval original yo'lni sinab ko'ramiz (ba'zi backendlarda fayl nomi aynan shunday saqlangan bo'ladi)
  pushCandidate(originalPath);

  // Keyin tuzatilgan variantni fallback sifatida qo'shamiz
  if (repairedPath && repairedPath !== originalPath) {
    pushCandidate(repairedPath);
  }

  // Ba'zi serverlarda static fayl /uploads, boshqalarida /api/uploads orqali ochiladi.
  // Shu sabab ikkala variantni ham fallback sifatida qo'shamiz.
  const baseURL =
    (process.env.NEXT_PUBLIC_API_URL || "https://bsmarket.uz/api").replace(
      /\/+$/,
      ""
    );
  const baseOrigin = baseURL.replace(/\/api$/i, "");

  const addApiUploadsFallback = (value) => {
    const normalizedPath = value
      ?.replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/^api\/+/i, "");
    if (!normalizedPath || !normalizedPath.startsWith("uploads/")) return;
    const encodedPath = encodeURI(normalizedPath);
    candidates.push(`${baseOrigin}/${encodedPath}`);
    candidates.push(`${baseURL}/${encodedPath}`);
    candidates.push(`${baseOrigin}/api/${encodedPath}`);
  };

  addApiUploadsFallback(originalPath);
  if (repairedPath && repairedPath !== originalPath) {
    addApiUploadsFallback(repairedPath);
  }

  return Array.from(new Set(candidates));
};

export const getImageUrl = (imagePath) => {
  const urls = getImageUrls(imagePath);
  return urls[0] || null;
};
