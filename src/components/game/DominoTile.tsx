import React from "react";

interface DominoTileProps {
  top: number;
  bottom: number;
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
  animationDelay?: number;
}

const DOT_POSITIONS: Record<number, [number, number][]> = {
  0: [],
  1: [[50, 50]],
  2: [
    [25, 25],
    [75, 75],
  ],
  3: [
    [25, 25],
    [50, 50],
    [75, 75],
  ],
  4: [
    [25, 25],
    [75, 25],
    [25, 75],
    [75, 75],
  ],
  5: [
    [25, 25],
    [75, 25],
    [50, 50],
    [25, 75],
    [75, 75],
  ],
  6: [
    [25, 20],
    [75, 20],
    [25, 50],
    [75, 50],
    [25, 80],
    [75, 80],
  ],
};

function isRedDot(value: number): boolean {
  if (value === 1) return true;
  if (value === 4) return true;
  return false;
}

const SIZES = {
  sm: { w: 28, h: 52, dot: 4, gap: 1 },
  md: { w: 36, h: 66, dot: 5, gap: 2 },
  lg: { w: 48, h: 88, dot: 6, gap: 2 },
};

export const DominoTileComponent: React.FC<DominoTileProps> = ({
  top,
  bottom,
  size = "md",
  faceDown = false,
  animationDelay = 0,
}) => {
  const s = SIZES[size];

  if (faceDown) {
    return (
      <div
        className="rounded-sm tile-shadow animate-deal"
        style={{
          width: s.w,
          height: s.h,
          background: "linear-gradient(135deg, hsl(var(--tile-bg)), #1a1a1a)",
          border: "1px solid hsl(var(--tile-border))",
          animationDelay: `${animationDelay}ms`,
        }}
      >
        <div className="w-full h-full flex items-center justify-center opacity-30">
          <div className="w-3/4 h-3/4 border border-[hsl(var(--gold))]/30 rounded-sm" />
        </div>
      </div>
    );
  }

  const halfH = (s.h - s.gap) / 2;

  return (
    <div
      className="rounded-sm tile-shadow animate-deal flex flex-col overflow-hidden"
      style={{
        width: s.w,
        height: s.h,
        background: "linear-gradient(180deg, #111, #0a0a0a)",
        border: "1px solid hsl(var(--tile-border))",
        animationDelay: `${animationDelay}ms`,
        gap: s.gap,
      }}
    >
      <DominoHalf value={top} width={s.w} height={halfH} dotSize={s.dot} />
      <div
        className="w-full"
        style={{ height: s.gap, background: "hsl(var(--tile-border))" }}
      />
      <DominoHalf value={bottom} width={s.w} height={halfH} dotSize={s.dot} />
    </div>
  );
};

const DominoHalf: React.FC<{
  value: number;
  width: number;
  height: number;
  dotSize: number;
}> = ({ value, width, height, dotSize }) => {
  const positions = DOT_POSITIONS[value] || [];
  const red = isRedDot(value);

  return (
    <div className="relative" style={{ width, height }}>
      {positions.map(([x, y], i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            left: `${x}%`,
            top: `${y}%`,
            transform: "translate(-50%, -50%)",
            background: red
              ? "radial-gradient(circle, #ff4444, #cc0000)"
              : "radial-gradient(circle, #ffffff, #cccccc)",
            boxShadow: red ? "0 0 2px #ff0000" : "0 0 2px rgba(255,255,255,0.3)",
          }}
        />
      ))}
    </div>
  );
};
