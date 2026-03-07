const CYRILLIC_MAP = {
  a: "а",
  b: "б",
  d: "д",
  e: "е",
  f: "ф",
  g: "г",
  h: "х",
  i: "и",
  j: "ж",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  q: "қ",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  x: "х",
  y: "й",
  z: "з",
};

const decodeHtmlEntities = (value) => {
  const input = String(value || "");
  if (!input || !input.includes("&")) return input;

  // Browser-safe decode for entities like &#39;, &quot;, &amp;
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = input;
    return textarea.value;
  }

  return input
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
};

const normalizeText = (value) =>
  decodeHtmlEntities(String(value || "")).replace(/\s+/g, " ").trim();

const translitUzToRu = (text) => {
  const normalized = normalizeText(text).toLowerCase();
  if (!normalized) return "";
  let out = normalized;
  out = out.replace(/o['’`]?/g, "ў");
  out = out.replace(/g['’`]?/g, "ғ");
  out = out.replace(/sh/g, "ш");
  out = out.replace(/ch/g, "ч");
  out = out.replace(/yo/g, "ё");
  out = out.replace(/yu/g, "ю");
  out = out.replace(/ya/g, "я");

  return out
    .split("")
    .map((char) => CYRILLIC_MAP[char] || char)
    .join("");
};

const translitUzToEn = (text) => normalizeText(text);

async function requestMyMemory(text, targetLang) {
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=uz|${targetLang}`
  );
  if (!res.ok) throw new Error("translation request failed");
  const payload = await res.json();
  const translated = payload?.responseData?.translatedText || "";
  return normalizeText(translated);
}

export async function autoTranslateFromUzbek(text) {
  const source = normalizeText(text);
  if (!source) return { name_ru: "", name_en: "" };

  let name_ru = "";
  let name_en = "";

  try {
    [name_ru, name_en] = await Promise.all([
      requestMyMemory(source, "ru"),
      requestMyMemory(source, "en"),
    ]);
  } catch {
    name_ru = translitUzToRu(source);
    name_en = translitUzToEn(source);
  }

  return {
    name_ru: normalizeText(name_ru) || translitUzToRu(source),
    name_en: normalizeText(name_en) || translitUzToEn(source),
  };
}
