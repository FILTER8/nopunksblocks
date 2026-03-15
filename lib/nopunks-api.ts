export type NoPunkAttribute = {
  trait_type: string;
  value: string;
};

export type NoPunkMetadata = {
  tokenId: number;
  name: string;
  collection: string;
  image: string;
  attributes: NoPunkAttribute[];
};

export type PixelCell = {
  x: number;
  y: number;
  color: string;
};

const API_BASE = "https://nopunks.xyz/api/v2";
const GRID_SIZE = 24;
const BACKGROUND_COLOR = "#000000";

function assertTokenId(tokenId: number) {
  if (!Number.isInteger(tokenId) || tokenId < 0 || tokenId > 9999) {
    throw new Error("Token ID must be an integer between 0 and 9999.");
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }

  return res.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function getNoPunkMetadata(tokenId: number): Promise<NoPunkMetadata> {
  assertTokenId(tokenId);
  return fetchJson<NoPunkMetadata>(`${API_BASE}/tokens/${tokenId}`);
}

export async function getNoPunkSvg(tokenId: number): Promise<string> {
  assertTokenId(tokenId);
  return fetchText(`${API_BASE}/tokens/${tokenId}/image`);
}

export async function getNoPunkPixels(tokenId: number): Promise<PixelCell[]> {
  const svgText = await getNoPunkSvg(tokenId);

  const embeddedImagePixels = await extractPixelsFromEmbeddedImageSvg(svgText);
  if (embeddedImagePixels.length > 0) return embeddedImagePixels;

  const directPixels = extractPixelsDirectlyFromSvg(svgText);
  if (directPixels.length > 0) return directPixels;

  return extractPixelsFromRenderedSvg(svgText);
}

function normalizeSvgMarkup(svgText: string): string {
  let next = svgText.trim();

  // API may return <image .../> instead of a full <svg> root.
  if (!/<svg[\s>]/i.test(next) && /<image[\s>]/i.test(next)) {
    const widthMatch = next.match(/\bwidth="([^"]+)"/i);
    const heightMatch = next.match(/\bheight="([^"]+)"/i);

    const width = widthMatch?.[1] ?? String(GRID_SIZE);
    const height = heightMatch?.[1] ?? String(GRID_SIZE);

    next = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        width="${width}"
        height="${height}"
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="none"
      >
        ${next}
      </svg>
    `.trim();
  }

  if (!next.includes('xmlns="http://www.w3.org/2000/svg"')) {
    next = next.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  if (!next.includes('xmlns:xlink="http://www.w3.org/1999/xlink"')) {
    next = next.replace("<svg", '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }

  const hasWidth = /\swidth=/.test(next);
  const hasHeight = /\sheight=/.test(next);
  const viewBoxMatch = next.match(/viewBox="([^"]+)"/i);

  if ((!hasWidth || !hasHeight) && viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);

    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [, , width, height] = parts;
      next = next.replace(
        "<svg",
        `<svg width="${width}" height="${height}" preserveAspectRatio="none"`
      );
    }
  }

  return next;
}

function svgToBase64DataUrl(svgText: string): string {
  const utf8 = new TextEncoder().encode(svgText);
  let binary = "";

  for (let i = 0; i < utf8.length; i++) {
    binary += String.fromCharCode(utf8[i]);
  }

  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

async function loadImageFromSource(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "async";
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image source."));
    img.src = src;
  });

  if ("decode" in img) {
    try {
      await img.decode();
    } catch {
      // ignore if already loaded
    }
  }

  return img;
}

async function loadSvgImage(svgText: string): Promise<HTMLImageElement> {
  const normalized = normalizeSvgMarkup(svgText);

  const blob = new Blob([normalized], {
    type: "image/svg+xml;charset=utf-8",
  });

  const objectUrl = URL.createObjectURL(blob);

  try {
    return await loadImageFromSource(objectUrl);
  } catch {
    const fallbackUrl = svgToBase64DataUrl(normalized);
    return await loadImageFromSource(fallbackUrl);
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  }
}

async function extractPixelsFromEmbeddedImageSvg(svgText: string): Promise<PixelCell[]> {
  if (typeof window === "undefined") return [];

  const normalized = normalizeSvgMarkup(svgText);
  const parser = new DOMParser();
  const doc = parser.parseFromString(normalized, "image/svg+xml");

  if (doc.querySelector("parsererror")) return [];

  const imageEl = doc.querySelector("image");
  if (!imageEl) return [];

  const href =
    imageEl.getAttribute("href") ||
    imageEl.getAttributeNS("http://www.w3.org/1999/xlink", "href") ||
    "";

  if (!href) return [];
  if (!href.startsWith("data:image/")) return [];

  const width = parsePositiveNumber(
    imageEl.getAttribute("width") || doc.documentElement?.getAttribute("width")
  ) || GRID_SIZE;

  const height = parsePositiveNumber(
    imageEl.getAttribute("height") || doc.documentElement?.getAttribute("height")
  ) || GRID_SIZE;

  const img = await loadImageFromSource(href);

  const canvas = document.createElement("canvas");
  canvas.width = GRID_SIZE;
  canvas.height = GRID_SIZE;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas context unavailable.");
  }

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, GRID_SIZE, GRID_SIZE);
  ctx.drawImage(img, 0, 0, width, height, 0, 0, GRID_SIZE, GRID_SIZE);

  const data = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE).data;
  const pixels = extractPixelsFromImageData(data, GRID_SIZE, GRID_SIZE);

  if (pixels.length > 0) return pixels;

  return [];
}

function extractPixelsDirectlyFromSvg(svgText: string): PixelCell[] {
  if (typeof window === "undefined") return [];

  const normalized = normalizeSvgMarkup(svgText);
  const parser = new DOMParser();
  const doc = parser.parseFromString(normalized, "image/svg+xml");
  const svg = doc.querySelector("svg");

  if (!svg) return [];
  if (doc.querySelector("parsererror")) return [];

  const { vbX, vbY, vbW, vbH } = getSvgBounds(svg);
  const rects = Array.from(svg.querySelectorAll("rect"));
  if (rects.length === 0) return [];

  const cellMap = new Map<string, PixelCell>();

  for (const rect of rects) {
    const fill = normalizeColor(rect.getAttribute("fill"));
    if (!fill) continue;
    if (isBackgroundColor(fill)) continue;

    const x = parseFloat(rect.getAttribute("x") ?? "0");
    const y = parseFloat(rect.getAttribute("y") ?? "0");
    const width = parseFloat(rect.getAttribute("width") ?? "0");
    const height = parseFloat(rect.getAttribute("height") ?? "0");

    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      continue;
    }

    if (width >= vbW && height >= vbH) continue;

    const centerX = x + width / 2 - vbX;
    const centerY = y + height / 2 - vbY;

    const gx = clamp(Math.floor((centerX / vbW) * GRID_SIZE), 0, GRID_SIZE - 1);
    const gy = clamp(Math.floor((centerY / vbH) * GRID_SIZE), 0, GRID_SIZE - 1);

    cellMap.set(`${gx},${gy}`, {
      x: gx,
      y: gy,
      color: fill,
    });
  }

  return Array.from(cellMap.values()).sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });
}

function getSvgBounds(svg: SVGElement) {
  const viewBox = svg.getAttribute("viewBox");

  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [vbX, vbY, vbW, vbH] = parts;
      return {
        vbX,
        vbY,
        vbW: vbW || GRID_SIZE,
        vbH: vbH || GRID_SIZE,
      };
    }
  }

  const width = parsePositiveNumber(svg.getAttribute("width")) || GRID_SIZE;
  const height = parsePositiveNumber(svg.getAttribute("height")) || GRID_SIZE;

  return {
    vbX: 0,
    vbY: 0,
    vbW: width,
    vbH: height,
  };
}

async function extractPixelsFromRenderedSvg(svgText: string): Promise<PixelCell[]> {
  if (typeof window === "undefined") {
    throw new Error("SVG extraction must run in the browser.");
  }

  const img = await loadSvgImage(svgText);

  const size = 240;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas context unavailable.");
  }

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0, size, size);

  const data = ctx.getImageData(0, 0, size, size).data;
  const bgColor = detectBackgroundColor(data, size);

  const step = size / GRID_SIZE;
  const pixels: PixelCell[] = [];

  for (let gy = 0; gy < GRID_SIZE; gy++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const color = sampleCellColor(data, size, gx, gy, step, bgColor);
      if (!color) continue;
      if (isBackgroundColor(color)) continue;

      pixels.push({
        x: gx,
        y: gy,
        color,
      });
    }
  }

  if (pixels.length === 0) {
    throw new Error("No visible pixels extracted from SVG.");
  }

  return pixels;
}

function extractPixelsFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number
): PixelCell[] {
  const pixels: PixelCell[] = [];

  for (let y = 0; y < Math.min(height, GRID_SIZE); y++) {
    for (let x = 0; x < Math.min(width, GRID_SIZE); x++) {
      const i = (y * width + x) * 4;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 10) continue;

      const color = rgbToHex(r, g, b);
      if (isBackgroundColor(color)) continue;

      pixels.push({ x, y, color });
    }
  }

  return pixels;
}

function sampleCellColor(
  data: Uint8ClampedArray,
  canvasSize: number,
  gx: number,
  gy: number,
  step: number,
  bgColor: string | null
): string | null {
  const startX = Math.floor(gx * step);
  const startY = Math.floor(gy * step);
  const endX = Math.min(canvasSize, Math.ceil((gx + 1) * step));
  const endY = Math.min(canvasSize, Math.ceil((gy + 1) * step));

  const counts = new Map<string, number>();

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const i = (y * canvasSize + x) * 4;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 10) continue;

      const color = rgbToHex(r, g, b);
      if (bgColor && color === bgColor) continue;
      if (isBackgroundColor(color)) continue;

      counts.set(color, (counts.get(color) ?? 0) + 1);
    }
  }

  if (counts.size === 0) return null;

  let bestColor: string | null = null;
  let bestCount = -1;

  for (const [color, count] of counts.entries()) {
    if (count > bestCount) {
      bestCount = count;
      bestColor = color;
    }
  }

  return bestColor;
}

function detectBackgroundColor(data: Uint8ClampedArray, canvasSize: number): string | null {
  const coords = [
    [0, 0],
    [canvasSize - 1, 0],
    [0, canvasSize - 1],
    [canvasSize - 1, canvasSize - 1],
  ];

  const counts = new Map<string, number>();

  for (const [x, y] of coords) {
    const i = (y * canvasSize + x) * 4;
    const a = data[i + 3];
    if (a < 10) continue;

    const color = rgbToHex(data[i], data[i + 1], data[i + 2]);
    counts.set(color, (counts.get(color) ?? 0) + 1);
  }

  let bestColor: string | null = null;
  let bestCount = -1;

  for (const [color, count] of counts.entries()) {
    if (count > bestCount) {
      bestColor = color;
      bestCount = count;
    }
  }

  return bestColor;
}

function normalizeColor(value: string | null): string | null {
  if (!value) return null;

  const v = value.trim().toLowerCase();

  if (
    v === "none" ||
    v === "transparent" ||
    v === "currentcolor" ||
    v === "inherit" ||
    v === "initial"
  ) {
    return null;
  }

  if (/^#[0-9a-f]{6}$/.test(v)) return v;

  if (/^#[0-9a-f]{3}$/.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }

  let m = v.match(
    /^rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)$/
  );

  if (m) {
    return rgbToHex(
      clamp(Number(m[1]), 0, 255),
      clamp(Number(m[2]), 0, 255),
      clamp(Number(m[3]), 0, 255)
    );
  }

  m = v.match(
    /^rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9.]+)\s*\)$/
  );

  if (m) {
    const alpha = Number(m[4]);
    if (alpha <= 0) return null;

    return rgbToHex(
      clamp(Number(m[1]), 0, 255),
      clamp(Number(m[2]), 0, 255),
      clamp(Number(m[3]), 0, 255)
    );
  }

  return null;
}

function parsePositiveNumber(value: string | null): number | null {
  if (!value) return null;
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isBackgroundColor(color: string): boolean {
  return color.toLowerCase() === BACKGROUND_COLOR;
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
      .toLowerCase()
  );
}