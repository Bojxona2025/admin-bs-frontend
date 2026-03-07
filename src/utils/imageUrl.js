const normalizeBase = (value) => String(value || "").replace(/\/+$/, "");
const RUNTIME_ORIGIN =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "";
const API_BASE = normalizeBase(import.meta.env.VITE_BASE_URL || `${RUNTIME_ORIGIN}/api`);

export const ASSET_BASE = API_BASE.replace(/\/api$/i, "");

const sanitizeAssetPath = (value) => {
  if (value === null || value === undefined) return "";

  const raw = String(value).trim();
  if (!raw) return "";

  const lowered = raw.toLowerCase();
  if (lowered === "null" || lowered === "undefined") return "";

  return raw.replace(/\\/g, "/");
};

export const toAssetUrl = (path) => {
  const safePath = sanitizeAssetPath(path);
  if (!safePath) return "";

  if (/^https?:\/\//i.test(safePath)) {
    return encodeURI(safePath);
  }

  const normalized = safePath
    .replace(/^\/+/, "")
    .replace(/^\/?api\/+/i, "")
    .replace(/\/{2,}/g, "/");
  if (!normalized) return "";

  if (normalized.startsWith("uploads/")) {
    const isAbsoluteApiBase = /^https?:\/\//i.test(API_BASE);
    if (isAbsoluteApiBase) {
      return encodeURI(`${ASSET_BASE}/${normalized}`);
    }
    return encodeURI(`/api/${normalized}`);
  }

  // Uploads bo'lmagan asset yo'llarda env base'dan foydalanamiz.
  const base = API_BASE || ASSET_BASE;

  return encodeURI(`${base}/${normalized}`);
};

export const toAssetUrlPair = (path) => {
  const safePath = sanitizeAssetPath(path);
  if (!safePath) return { primary: "", fallback: "" };

  if (/^https?:\/\//i.test(safePath)) {
    const absolute = encodeURI(safePath);
    return { primary: absolute, fallback: "" };
  }

  const normalized = safePath
    .replace(/^\/+/, "")
    .replace(/^\/?api\/+/i, "")
    .replace(/\/{2,}/g, "/");
  if (!normalized) return { primary: "", fallback: "" };

  if (normalized.startsWith("uploads/")) {
    return {
      primary: encodeURI(`${API_BASE}/${normalized}`),
      fallback: encodeURI(`${ASSET_BASE}/${normalized}`),
    };
  }

  return {
    primary: encodeURI(`${ASSET_BASE}/${normalized}`),
    fallback: encodeURI(`${API_BASE}/${normalized}`),
  };
};

export const toAssetCandidates = (path) => {
  const safePath = sanitizeAssetPath(path);
  if (!safePath) return [];

  if (/^https?:\/\//i.test(safePath)) {
    return [encodeURI(safePath)];
  }

  const normalized = safePath
    .replace(/^\/+/, "")
    .replace(/^\/?api\/+/i, "")
    .replace(/\/{2,}/g, "/");
  if (!normalized) return [];

  const rawCandidates = normalized.startsWith("uploads/")
    ? [
        `/api/${normalized}`,
        `${ASSET_BASE}/${normalized}`,
        `${API_BASE}/${normalized}`,
        `/${normalized}`,
      ]
    : [
        `${API_BASE}/${normalized}`,
        `${ASSET_BASE}/${normalized}`,
        `/${normalized}`,
      ];

  return [...new Set(rawCandidates.map((item) => encodeURI(item)))];
};

export const getProductImageUrl = (product) => {
  const pickPath = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") return value.url || value.path || "";
    return "";
  };

  const candidates = [
    product?.mainImage,
    product?.metaImage,
    product?.variants?.[0]?.mainImg,
    product?.variants?.[0]?.image,
    product?.variants?.[0]?.productImages?.[0],
  ];

  for (const candidate of candidates) {
    const url = toAssetUrl(pickPath(candidate));
    if (url) return url;
  }

  return "";
};
