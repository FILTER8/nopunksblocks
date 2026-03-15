import type { PixelCell } from "./nopunks-api";

type BuildOptions = {
  cellSize?: number;
  gap?: number;
  padding?: number;
  background?: string;
};

export function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

export function buildPixelBlockSvgDataUrl(
  pixels: PixelCell[],
  options: BuildOptions = {}
): string {
  const {
    cellSize = 24,
    gap = 0,
    padding = 0,
    background = "#000000",
  } = options;

  const sorted = [...pixels].sort((a, b) => luminance(a.color) - luminance(b.color));

  const count = sorted.length;
  const side = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / side);
  const tile = cellSize + gap;

  const width = padding * 2 + side * tile;
  const height = padding * 2 + rows * tile;

  const body = sorted
    .map((pixel, index) => {
      const x = index % side;
      const y = Math.floor(index / side);

      return `<rect x="${padding + x * tile}" y="${padding + y * tile}" width="${cellSize}" height="${cellSize}" fill="${pixel.color}" />`;
    })
    .join("");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" shape-rendering="crispEdges">
<rect width="100%" height="100%" fill="${background}" />
${body}
</svg>
`.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function luminance(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}