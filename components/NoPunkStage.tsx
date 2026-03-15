"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { getNoPunkPixels, type PixelCell } from "@/lib/nopunks-api";

const SUPPLY = 10000;
const HEADER_OFFSET = 96;
const FOOTER_SAFE = 72;
const PIXEL_SIZE = 24;

const BASE_MS = 2200;
const BASE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const FALL_EASING = "cubic-bezier(0.12, 0.82, 0.22, 1)";

type Point = {
  x: number;
  y: number;
};

type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type LayoutMode = "colorblock" | "stardust" | "tiles" | "line" | "gravity" | "punk";

function randomInt(max: number) {
  return Math.floor(Math.random() * max);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getVisibleBounds(width: number, height: number, scale: number): Bounds {
  const safeScale = Math.max(scale, 0.0001);

  const cx = width / 2;
  const cy = height / 2;

  const left = cx - cx / safeScale;
  const top = cy - cy / safeScale;
  const right = cx + cx / safeScale;
  const bottom = cy + cy / safeScale;

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

function shuffleArray<T>(items: T[], rand: () => number): T[] {
  const arr = [...items];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M12 4v10m0 0 4-4m-4 4-4-4M5 18h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RandomIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M20 6v5h-5m5-5-6 6m-2 2-2 2m-5-10h5l2.5 2.5M20 18v-5h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function luminance(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function sortByBrightness(pixels: PixelCell[]) {
  return [...pixels].sort((a, b) => luminance(a.color) - luminance(b.color));
}

function packGrid(
  count: number,
  startX: number,
  startY: number,
  columns: number,
  tile: number
): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);

    return {
      x: startX + col * tile,
      y: startY + row * tile,
    };
  });
}

function buildColorBlockLayout(
  count: number,
  width: number,
  height: number,
  topInset: number,
  footerInset: number
): Point[] {
  const side = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / side);

  const artWidth = side * PIXEL_SIZE;
  const artHeight = rows * PIXEL_SIZE;

  const usableHeight = Math.max(0, height - topInset - footerInset);
  const offsetX = (width - artWidth) / 2;
  const offsetY = topInset + (usableHeight - artHeight) / 2;

  return packGrid(count, offsetX, offsetY, side, PIXEL_SIZE);
}

function buildStardustLayout(
  count: number,
  width: number,
  height: number,
  seed: number,
  scale: number
): Point[] {
  const rand = mulberry32(seed * 17 + 11);
  const bounds = getVisibleBounds(width, height, scale);

  const maxX = Math.max(0, bounds.width - PIXEL_SIZE);
  const maxY = Math.max(0, bounds.height - PIXEL_SIZE);

  return Array.from({ length: count }, () => ({
    x: bounds.left + rand() * maxX,
    y: bounds.top + rand() * maxY,
  }));
}

function buildTilesLayout(
  pixels: PixelCell[],
  width: number,
  height: number,
  topInset: number,
  footerInset: number,
  seed: number
): Point[] {
  const count = pixels.length;
  const usableHeight = Math.max(0, height - topInset - footerInset);
  const usableY = topInset;

  if (count === 0) return [];

  const rand = mulberry32(seed * 701 + 19);

  // 2 to 5 groups, but never more than count
  const clusterCount = Math.min(count, 2 + Math.floor(rand() * 4));

  // split sorted pixels into contiguous chunks so similar colors stay together
  const groupSizes = Array.from({ length: clusterCount }, () => 1);
  let remaining = count - clusterCount;

  while (remaining > 0) {
    groupSizes[Math.floor(rand() * clusterCount)]++;
    remaining--;
  }

  const groups: number[][] = [];
  let cursor = 0;

  for (let i = 0; i < clusterCount; i++) {
    const size = groupSizes[i];
    const group = Array.from({ length: size }, (_, j) => cursor + j);
    groups.push(group);
    cursor += size;
  }

  const clusterCenters = Array.from({ length: clusterCount }, () => ({
    x: width * (0.18 + rand() * 0.64),
    y: usableY + usableHeight * (0.18 + rand() * 0.64),
  }));

  const result = new Array<Point>(count);

  groups.forEach((indices, clusterIndex) => {
    const center = clusterCenters[clusterIndex];

    const cols = Math.max(2, Math.ceil(Math.sqrt(indices.length)));
    const rows = Math.ceil(indices.length / cols);

    const blockW = cols * PIXEL_SIZE;
    const blockH = rows * PIXEL_SIZE;

    const startX = clamp(center.x - blockW / 2, 0, Math.max(0, width - blockW));
    const startY = clamp(
      center.y - blockH / 2,
      usableY,
      Math.max(usableY, usableY + usableHeight - blockH)
    );

    // unique grid cells only, so no overlap
    const cellPositions = Array.from({ length: indices.length }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      return {
        x: startX + col * PIXEL_SIZE,
        y: startY + row * PIXEL_SIZE,
      };
    });

    // slight randomization of slot assignment inside the block,
    // but colors still stay grouped because the whole block is a color chunk
    const randomizedCells = shuffleArray(cellPositions, rand);

    indices.forEach((pixelIndex, i) => {
      result[pixelIndex] = randomizedCells[i];
    });
  });

  return result.map((point, index) => point ?? { x: (index % 10) * PIXEL_SIZE, y: usableY });
}

function buildLineLayout(
  count: number,
  width: number,
  height: number,
  topInset: number,
  footerInset: number
): Point[] {
  const usableHeight = Math.max(0, height - topInset - footerInset);
  const y = topInset + usableHeight / 2 - PIXEL_SIZE / 2;

  const maxCols = Math.max(1, Math.floor(width / PIXEL_SIZE));

  if (count <= maxCols) {
    const totalWidth = count * PIXEL_SIZE;
    const startX = (width - totalWidth) / 2;

    return Array.from({ length: count }, (_, index) => ({
      x: startX + index * PIXEL_SIZE,
      y,
    }));
  }

  const cols = maxCols;
  const rows = Math.ceil(count / cols);
  const artWidth = cols * PIXEL_SIZE;
  const artHeight = rows * PIXEL_SIZE;

  const startX = (width - artWidth) / 2;
  const startY = topInset + (usableHeight - artHeight) / 2;

  return packGrid(count, startX, startY, cols, PIXEL_SIZE);
}

function buildGravityLayout(
  count: number,
  width: number,
  height: number,
  seed: number,
  scale: number
): Point[] {
  const rand = mulberry32(seed * 31 + 5);
  const bounds = getVisibleBounds(width, height, scale);

  const maxCols = Math.max(1, Math.floor(bounds.width / PIXEL_SIZE));
  const cols = Math.min(count, maxCols);
  const rows = Math.ceil(count / cols);

  const totalWidth = cols * PIXEL_SIZE;
  const totalHeight = rows * PIXEL_SIZE;

  const startX = bounds.left + (bounds.width - totalWidth) / 2;
  const startY = bounds.bottom - totalHeight;

  const slots = Array.from({ length: count }, (_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    return {
      x: startX + col * PIXEL_SIZE,
      y: startY + row * PIXEL_SIZE,
    };
  });

  return shuffleArray(slots, rand);
}

function buildPunkLayoutFromStableOrder(
  originalPixels: PixelCell[],
  stablePixels: PixelCell[],
  width: number,
  height: number,
  topInset: number,
  footerInset: number
): Point[] {
  const maxX = Math.max(...originalPixels.map((p) => p.x), 0);
  const maxY = Math.max(...originalPixels.map((p) => p.y), 0);

  const artWidth = (maxX + 1) * PIXEL_SIZE;
  const artHeight = (maxY + 1) * PIXEL_SIZE;

  const usableHeight = Math.max(0, height - topInset - footerInset);
  const offsetX = (width - artWidth) / 2;
  const offsetY = topInset + (usableHeight - artHeight) / 2;

  const byColor = new Map<string, Point[]>();

  for (const p of originalPixels) {
    const arr = byColor.get(p.color) ?? [];
    arr.push({
      x: offsetX + p.x * PIXEL_SIZE,
      y: offsetY + p.y * PIXEL_SIZE,
    });
    byColor.set(p.color, arr);
  }

  return stablePixels.map((pixel) => {
    const arr = byColor.get(pixel.color);
    if (arr && arr.length > 0) return arr.shift()!;
    return { x: offsetX, y: offsetY };
  });
}

function getPixelTransition(mode: LayoutMode, index: number, cycleSeed: number, point: Point) {
  const rand = mulberry32(cycleSeed * 1009 + index * 97 + 13);
  const n1 = rand();
  const n2 = rand();

  if (mode === "gravity") {
    const delay = Math.round(n1 * 700);
    const leftMs = 900 + Math.round(n2 * 700);
    const topMs = 1800 + Math.round(n1 * 1800);

    return {
      transitionProperty: "left, top",
      transitionDuration: `${leftMs}ms, ${topMs}ms`,
      transitionTimingFunction: `${BASE_EASING}, ${FALL_EASING}`,
      transitionDelay: `${delay}ms, ${delay}ms`,
    };
  }

  if (mode === "punk") {
    const chaos = ((point.x + point.y) % 120) + Math.round(n1 * 500);
    const leftMs = 1200 + Math.round(n2 * 1300);
    const topMs = 1200 + Math.round(n1 * 1500);

    return {
      transitionProperty: "left, top",
      transitionDuration: `${leftMs}ms, ${topMs}ms`,
      transitionTimingFunction: `${BASE_EASING}, ${BASE_EASING}`,
      transitionDelay: `${chaos}ms, ${chaos}ms`,
    };
  }

  if (mode === "stardust") {
    const delay = Math.round(n1 * 220);
    const ms = 1700 + Math.round(n2 * 900);

    return {
      transitionProperty: "left, top",
      transitionDuration: `${ms}ms, ${ms}ms`,
      transitionTimingFunction: `${BASE_EASING}, ${BASE_EASING}`,
      transitionDelay: `${delay}ms, ${delay}ms`,
    };
  }

  if (mode === "tiles" || mode === "line") {
    const delay = Math.round(n1 * 180);
    const ms = BASE_MS + Math.round(n2 * 500);

    return {
      transitionProperty: "left, top",
      transitionDuration: `${ms}ms, ${ms}ms`,
      transitionTimingFunction: `${BASE_EASING}, ${BASE_EASING}`,
      transitionDelay: `${delay}ms, ${delay}ms`,
    };
  }

  return {
    transitionProperty: "left, top",
    transitionDuration: `${BASE_MS}ms, ${BASE_MS}ms`,
    transitionTimingFunction: `${BASE_EASING}, ${BASE_EASING}`,
    transitionDelay: `0ms, 0ms`,
  };
}

export default function NoPunkStage() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const pinchStartRef = useRef<number | null>(null);
  const pinchScaleRef = useRef<number>(1);

  const [tokenId, setTokenId] = useState<number | null>(null);
  const [manualId, setManualId] = useState("");
  const [pixels, setPixels] = useState<PixelCell[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<LayoutMode>("colorblock");
  const [scale, setScale] = useState(1);
  const [cycleSeed, setCycleSeed] = useState(1);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setTokenId(randomInt(SUPPLY));
  }, []);

  useEffect(() => {
    if (tokenId === null) return;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");

      try {
        const nextPixels = await getNoPunkPixels(tokenId!);

        if (cancelled) return;

        setPixels(nextPixels);
        setManualId(String(tokenId));
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load No-Punk.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [tokenId]);

  useEffect(() => {
    function updateStageSize() {
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      setStageSize({
        width: rect.width,
        height: rect.height,
      });
    }

    updateStageSize();
    window.addEventListener("resize", updateStageSize);

    return () => window.removeEventListener("resize", updateStageSize);
  }, []);

  function loadRandom() {
    setTokenId(randomInt(SUPPLY));
  }

  function loadManual() {
    const parsed = Number(manualId);

    if (!Number.isInteger(parsed) || parsed < 0 || parsed >= SUPPLY) {
      setError("Enter a valid token ID from 0 to 9999.");
      return;
    }

    setTokenId(parsed);
  }

  function cycleMode() {
    setCycleSeed((prev) => prev + 1);

    setMode((prev) => {
      if (prev === "colorblock") return "stardust";
      if (prev === "stardust") return "tiles";
      if (prev === "tiles") return "line";
      if (prev === "line") return "gravity";
      if (prev === "gravity") return "punk";
      return "colorblock";
    });
  }

  async function onDownloadFullBrowser() {
    if (!rootRef.current || tokenId === null) return;

    const sourceCanvas = await html2canvas(rootRef.current, {
      backgroundColor: "#000000",
      useCORS: true,
      scale: 2,
      logging: false,
    });

    const url = sourceCanvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `nopunk-${tokenId}.png`;
    a.click();
  }

  const renderPixels = useMemo(() => sortByBrightness(pixels), [pixels]);

  const positions = useMemo(() => {
    const width = stageSize.width;
    const height = stageSize.height;
    const count = renderPixels.length;

    if (!width || !height || count === 0) return [];

    if (mode === "stardust") {
      return buildStardustLayout(count, width, height, cycleSeed, scale);
    }

    if (mode === "tiles") {
      return buildTilesLayout(
        renderPixels,
        width,
        height,
        HEADER_OFFSET,
        FOOTER_SAFE,
        cycleSeed
      );
    }

    if (mode === "line") {
      return buildLineLayout(count, width, height, HEADER_OFFSET, FOOTER_SAFE);
    }

    if (mode === "gravity") {
      return buildGravityLayout(count, width, height, cycleSeed, scale);
    }

    if (mode === "punk") {
      return buildPunkLayoutFromStableOrder(
        pixels,
        renderPixels,
        width,
        height,
        HEADER_OFFSET,
        FOOTER_SAFE
      );
    }

    return buildColorBlockLayout(count, width, height, HEADER_OFFSET, FOOTER_SAFE);
  }, [pixels, renderPixels, stageSize, mode, cycleSeed, scale]);

  function onWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    setScale((prev) => clamp(prev / factor, 0.35, 12));
  }

  function getDistance(touches: React.TouchList) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2) {
      pinchStartRef.current = getDistance(e.touches);
      pinchScaleRef.current = scale;
    }
  }

  function onTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length !== 2 || pinchStartRef.current === null) return;

    const dist = getDistance(e.touches);
    const factor = dist / pinchStartRef.current;
    const next = pinchScaleRef.current * factor;

    setScale(clamp(next, 0.35, 12));
  }

  function onTouchEnd() {
    pinchStartRef.current = null;
  }

  return (
    <section
      ref={rootRef}
      className="relative h-screen w-full overflow-hidden bg-black text-[#9a9a9a] font-body"
    >
      <aside className="absolute left-0 top-0 z-20 flex w-[180px] flex-col gap-3 px-4 pt-20 sm:w-[220px] sm:px-6 sm:pt-24">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-[#6f6f6f]">
            Token
          </div>
          <div className="mt-1 text-[24px] leading-none tracking-[-0.03em] text-[#d6d6d6] sm:text-[28px]">
            {tokenId !== null ? `#${tokenId}` : "—"}
          </div>
          <div className="mt-2 text-xs text-[#8d8d8d]">{pixels.length} Pixels</div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[#5d5d5d]">
            {mode}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="number"
            min={0}
            max={9999}
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                loadManual();
              }
            }}
            placeholder="Enter ID"
            className="h-10 w-full border border-[#2a2a2a] bg-transparent px-3 text-sm text-[#d0d0d0] outline-none placeholder:text-[#5f5f5f] focus:border-[#5a5a5a]"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadRandom}
              disabled={loading}
              aria-label="Random"
              title="Random"
              className="flex h-10 w-10 items-center justify-center border border-[#2f2f2f] bg-transparent text-[#d2d2d2] transition hover:border-[#454545] hover:bg-white/[0.02] disabled:opacity-40"
            >
              <RandomIcon />
            </button>

            <button
              type="button"
              onClick={onDownloadFullBrowser}
              disabled={loading || tokenId === null}
              aria-label="Download"
              title="Download"
              className="flex h-10 w-10 items-center justify-center border border-[#2f2f2f] bg-transparent text-[#d2d2d2] transition hover:border-[#454545] hover:bg-white/[0.02] disabled:opacity-40"
            >
              <DownloadIcon />
            </button>
          </div>
        </div>

        {error && (
          <div className="border border-[#2a2a2a] p-3 text-xs leading-5 text-[#9e9e9e]">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-[10px] uppercase tracking-[0.12em] text-[#6f6f6f]">
            Loading
          </div>
        )}
      </aside>

      <div
        ref={stageRef}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative h-screen w-full overflow-hidden"
        style={{ touchAction: "none" }}
      >
        {positions.length > 0 ? (
          <button
            type="button"
            onClick={cycleMode}
            className="absolute inset-0 block cursor-pointer bg-transparent p-0"
            aria-label="Change pixel layout"
          >
            <div
              className="absolute inset-0"
              style={{
                transform: `translateZ(0) scale(${scale})`,
                transformOrigin: "center center",
                willChange: "transform",
              }}
            >
              {renderPixels.map((pixel, index) => {
                const point = positions[index] ?? { x: 0, y: 0 };
                const transition = getPixelTransition(mode, index, cycleSeed, point);

                return (
                  <span
                    key={`${index}-${pixel.color}-${pixel.x}-${pixel.y}`}
                    className="absolute block"
                    style={{
                      left: Math.round(point.x),
                      top: Math.round(point.y),
                      width: `${PIXEL_SIZE}px`,
                      height: `${PIXEL_SIZE}px`,
                      backgroundColor: pixel.color,
                      imageRendering: "pixelated",
                      transform: "translateZ(0)",
                      backfaceVisibility: "hidden",
                      willChange: "left, top",
                      ...transition,
                    }}
                  />
                );
              })}
            </div>
          </button>
        ) : (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs uppercase tracking-[0.12em] text-[#6a6a6a]">
            Loading
          </div>
        )}
      </div>
    </section>
  );
}