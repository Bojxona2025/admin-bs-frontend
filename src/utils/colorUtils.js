const colorMap = {
  "#efc701": "Sariq",
  "#ffff00": "Sariq",
  "#ffd700": "Oltin sariq",
  "#ffeb3b": "Yorqin sariq",

  "#0dc94f": "Yashil",
  "#22fb13": "Yorqin yashil",
  "#008000": "Yashil",
  "#4caf50": "Yashil",
  "#00ff00": "Lime yashil",
  "#2e7d32": "To'q yashil",

  "#2196f3": "Ko'k",
  "#0000ff": "Ko'k",
  "#1976d2": "To'q ko'k",
  "#03a9f4": "Osmon ko'k",
  "#00bcd4": "Cyan",

  "#f44336": "Qizil",
  "#ff0000": "Qizil",
  "#d32f2f": "To'q qizil",
  "#ff5722": "Qizil-to'q sariq",
  "#e91e63": "Pushti-qizil",

  "#9c27b0": "Binafsha",
  "#673ab7": "To'q binafsha",
  "#3f51b5": "Indigo",

  "#ff9800": "To'q sariq",
  "#ff5722": "Qizil-to'q sariq",
  "#ffc107": "Amber",

  "#9e9e9e": "Kulrang",
  "#607d8b": "Kulrang-ko'k",
  "#795548": "Jigarrang",
  "#000000": "Qora",
  "#ffffff": "Oq",

  "#e91e63": "Pushti",
  "#f06292": "Yorqin pushti",

  "#795548": "Jigarrang",
  "#8d6e63": "Yorqin jigarrang",
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function colorDistance(rgb1, rgb2) {
  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
  );
}

function findClosestColor(targetHex) {
  const targetRgb = hexToRgb(targetHex);
  if (!targetRgb) return null;

  let closestColor = null;
  let minDistance = Infinity;

  for (const [hex, name] of Object.entries(colorMap)) {
    const rgb = hexToRgb(hex);
    if (rgb) {
      const distance = colorDistance(targetRgb, rgb);
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = name;
      }
    }
  }

  return closestColor;
}

/**
 * Convert hex color code to readable color name
 * @param {string} colorCode - Hex color code (e.g., "#efc701")
 * @returns {string} - Color name in Uzbek
 */
export function getColorName(colorCode) {
  if (!colorCode) return "Noma'lum rang";

  const cleanColor = colorCode.toLowerCase().replace("#", "");
  const fullColorCode = "#" + cleanColor;

  if (colorMap[fullColorCode]) {
    return colorMap[fullColorCode];
  }

  const closestColor = findClosestColor(fullColorCode);
  if (closestColor) {
    return closestColor;
  }

  const rgb = hexToRgb(fullColorCode);
  if (rgb) {
    const { r, g, b } = rgb;

    if (r > g && r > b) {
      if (g > 100 && b < 100) return "To'q sariq"; 
      return "Qizil";
    } else if (g > r && g > b) {
      return "Yashil";
    } else if (b > r && b > g) {
      return "Ko'k";
    } else if (r > 200 && g > 200 && b < 100) {
      return "Sariq";
    } else if (r > 150 && g < 100 && b > 150) {
      return "Binafsha";
    } else if (r > 200 && g > 200 && b > 200) {
      return "Oq";
    } else if (r < 50 && g < 50 && b < 50) {
      return "Qora";
    } else if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
      return "Kulrang";
    }
  }

  return "Noma'lum rang";
}

/**
 * Add new color to the color map
 * @param {string} hexCode - Hex color code
 * @param {string} colorName - Color name in Uzbek
 */
export function addColorToMap(hexCode, colorName) {
  const cleanColor = hexCode.toLowerCase().replace("#", "");
  colorMap["#" + cleanColor] = colorName;
}

/**
 * Get all available colors
 * @returns {Object} - Object with hex codes as keys and color names as values
 */
export function getAllColors() {
  return { ...colorMap };
}
