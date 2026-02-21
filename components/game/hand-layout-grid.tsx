"use client";

/**
 * Grid layout options for card hand display.
 * Nv = N columns, scroll vertically (down)
 * Nh = N rows, scroll horizontally (right)
 */
export type HandLayout =
  | "1v"
  | "1h"
  | "2v"
  | "2h"
  | "3v"
  | "3h";

export const ALL_LAYOUTS: HandLayout[] = [
  "1v",
  "1h",
  "2v",
  "2h",
  "3v",
  "3h",
];

/** Minimum card count for each layout to make sense (cols for Nv, rows for Nh) */
const LAYOUT_MIN_CARDS: Record<HandLayout, number> = {
  "1v": 1,
  "1h": 1,
  "2v": 2,
  "2h": 2,
  "3v": 3,
  "3h": 3,
};

/** Get layouts that make sense for the given card count */
export function getLayoutsForCardCount(cardCount: number): HandLayout[] {
  return ALL_LAYOUTS.filter(
    (layout) => cardCount >= LAYOUT_MIN_CARDS[layout]
  );
}

/** SVG icon showing a mini grid preview for each layout */
function GridLayoutIcon({
  layout,
  className = "w-6 h-6",
}: {
  layout: HandLayout;
  className?: string;
}) {
  const size = 24;
  const pad = 1;
  const gap = 1.5;

  // Each layout renders a small grid of rectangles
  const renderCells = (cols: number, rows: number) => {
    const cellW = (size - pad * 2 - gap * (cols - 1)) / cols;
    const cellH = (size - pad * 2 - gap * (rows - 1)) / rows;
    const cells: React.ReactNode[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = pad + c * (cellW + gap);
        const y = pad + r * (cellH + gap);
        cells.push(
          <rect
            key={`${r}-${c}`}
            x={x}
            y={y}
            width={cellW}
            height={cellH}
            rx={1.5}
            className="fill-current opacity-70"
          />
        );
      }
    }
    return cells;
  };

  const configs: Record<HandLayout, { cols: number; rows: number }> = {
    "1v": { cols: 1, rows: 3 },
    "1h": { cols: 3, rows: 1 },
    "2v": { cols: 2, rows: 2 },
    "2h": { cols: 2, rows: 2 },
    "3v": { cols: 3, rows: 2 },
    "3h": { cols: 2, rows: 3 },
  };

  const { cols, rows } = configs[layout];

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden
    >
      {renderCells(cols, rows)}
    </svg>
  );
}

interface HandLayoutGridProps {
  cardCount: number;
  currentLayout: HandLayout;
  onLayoutChange: (layout: HandLayout) => void;
}

export function HandLayoutGrid({
  cardCount,
  currentLayout,
  onLayoutChange,
}: HandLayoutGridProps) {
  const layouts = getLayoutsForCardCount(cardCount);

  return (
    <div
      className="flex items-center gap-1 flex-wrap"
      role="group"
      aria-label="Card grid layout"
    >
      {layouts.map((layout) => (
        <button
          key={layout}
          type="button"
          onClick={() => onLayoutChange(layout)}
          title={getLayoutLabel(layout)}
          aria-pressed={currentLayout === layout}
          aria-label={getLayoutLabel(layout)}
          className={`p-1.5 rounded transition-colors ${
            currentLayout === layout
              ? "bg-primary text-white"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          }`}
        >
          <GridLayoutIcon layout={layout} className="w-5 h-5" />
        </button>
      ))}
    </div>
  );
}

export function getGridContainerClasses(layout: HandLayout): string {
  const GRID_BASE =
    "min-h-0 min-w-0 w-full flex-1 max-h-[calc(100vh-12rem)] p-1";
  switch (layout) {
    case "1v":
      return `flex flex-col gap-2 overflow-y-auto ${GRID_BASE}`;
    case "1h":
      return `flex overflow-x-auto overflow-y-hidden gap-2 pb-2 snap-x snap-mandatory ${GRID_BASE}`;
    case "2v":
      return `grid grid-cols-2 gap-2 overflow-y-auto ${GRID_BASE}`;
    case "2h":
      return `grid grid-flow-col gap-2 overflow-x-auto overflow-y-auto pb-2 auto-cols-[minmax(160px,min(45vw,300px))] [grid-template-rows:repeat(2,auto)] ${GRID_BASE}`;
    case "3v":
      return `grid grid-cols-3 gap-2 overflow-y-auto ${GRID_BASE}`;
    case "3h":
      return `grid grid-flow-col gap-2 overflow-x-auto overflow-y-auto pb-2 auto-cols-[minmax(140px,min(40vw,260px))] [grid-template-rows:repeat(3,auto)] ${GRID_BASE}`;
    default:
      return `grid grid-cols-2 gap-2 overflow-y-auto ${GRID_BASE}`;
  }
}

export function getCardClasses(
  layout: HandLayout,
  isSmallViewport: boolean,
  isClickable = true
): string {
  const base =
    "p-4 rounded-lg border-2 transition-all duration-200 ease-out min-h-[200px] hover:scale-[1.01] hover:shadow-md active:scale-[0.99] animate-fade-in-up" +
    (isClickable ? " cursor-pointer" : "");
  if (!isSmallViewport) {
    return `${base} min-h-[150px] md:min-h-[120px] lg:min-h-[220px]`;
  }
  switch (layout) {
    case "1v":
      return `${base} min-h-[280px] flex-shrink-0 w-full`;
    case "1h":
      return `${base} min-h-[280px] flex-shrink-0 w-[min(85vw,320px)] snap-center`;
    case "2v":
      return `${base} min-h-[220px]`;
    case "2h":
    case "3v":
    case "3h":
      return `${base} min-h-[200px]`;
    default:
      return `${base} min-h-[220px]`;
  }
}

function getLayoutLabel(layout: HandLayout): string {
  const labels: Record<HandLayout, string> = {
    "1v": "1 column, scroll down",
    "1h": "1 row, scroll right",
    "2v": "2 columns, scroll down",
    "2h": "2 rows, scroll right",
    "3v": "3 columns, scroll down",
    "3h": "3 rows, scroll right",
  };
  return labels[layout];
}
