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

const normalizePath = (value) =>
  value
    ?.replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^api\/+/i, "") || "";

const extractUploadsPath = (value) => {
  if (!value || typeof value !== "string") return "";

  const raw = value.trim();
  if (!raw) return "";

  const tryFromUrl = (() => {
    try {
      const parsed = new URL(raw);
      return normalizePath(parsed.pathname);
    } catch {
      return "";
    }
  })();

  const normalized = tryFromUrl || normalizePath(raw);
  return normalized.startsWith("uploads/") ? normalized : "";
};

const toAbsoluteUrl = (pathValue) => {
  const normalizedPath = normalizePath(pathValue);

  if (!normalizedPath) return null;

  const encodedPath = encodeURI(normalizedPath);

  // Brauzerdan har doim Next /api proxy orqali yuramiz.
  return `/api/${encodedPath}`;
};

const API_BASE_URL =
  process.env.VITE_BASE_URL ||
  "https://bsmarket.uz/api";

export const getImageUrls = (imagePath) => {
  if (!imagePath || typeof imagePath !== "string") {
    return [];
  }

  const originalPath = imagePath.trim();
  const repairedPath = fixMojibake(originalPath);

  const candidates = [];
  const pushUnique = (value) => {
    if (!value) return;
    if (!candidates.includes(value)) candidates.push(value);
  };

  const addUploadsVariants = (path) => {
    if (!path) return;
    const encodedPath = encodeURI(path);
    pushUnique(`/api/${encodedPath}`);
    pushUnique(`${baseOrigin}/${encodedPath}`);
    pushUnique(`${baseURL}/${encodedPath}`);
    pushUnique(`${baseOrigin}/api/${encodedPath}`);
  };

  const pushCandidate = (value) => {
    if (!value) return;
    if (value.startsWith("http://") || value.startsWith("https://")) {
      const uploadPath = extractUploadsPath(value);
      if (uploadPath) {
        addUploadsVariants(uploadPath);
      }
      pushUnique(encodeURI(value));
      return;
    }
    const absolute = toAbsoluteUrl(value);
    if (absolute) pushUnique(absolute);
  };

  const baseURL =
    API_BASE_URL.replace(/\/+$/, "");
  const baseOrigin = baseURL.replace(/\/api$/i, "");

  // Avval original yo'lni sinab ko'ramiz (ba'zi backendlarda fayl nomi aynan shunday saqlangan bo'ladi)
  pushCandidate(originalPath);

  // Keyin tuzatilgan variantni fallback sifatida qo'shamiz
  if (repairedPath && repairedPath !== originalPath) {
    pushCandidate(repairedPath);
  }

  const addApiUploadsFallback = (value) => {
    const normalizedPath = extractUploadsPath(value);
    addUploadsVariants(normalizedPath);
  };

  addApiUploadsFallback(originalPath);
  if (repairedPath && repairedPath !== originalPath) {
    addApiUploadsFallback(repairedPath);
  }

  return candidates;
};

export const getImageUrl = (imagePath) => {
  const urls = getImageUrls(imagePath);
  return urls[0] || null;
};
