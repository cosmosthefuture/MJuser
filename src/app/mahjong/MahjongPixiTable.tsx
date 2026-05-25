"use client";

import { Application, extend } from "@pixi/react";
import {
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
} from "pixi.js";
import { MahjongTile } from "@/lib/mahjong72";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  hand: Array<MahjongTile & { id?: number }>;
  melds?: Array<{
    kind: "pong" | "chow" | "kong";
    meldKey: string;
    tiles: Array<MahjongTile & { id?: number }>;
  }>;
  discards: MahjongTile[];
  selfDiscardTiles?: MahjongTile[];
  rightDiscardTiles?: MahjongTile[];
  topDiscardTiles?: MahjongTile[];
  leftDiscardTiles?: MahjongTile[];
  centerMessage?: string | null;
  showDrawPile?: boolean;
  drawPileCount?: number | null;
  lastDiscardSide?: "bottom" | "right" | "top" | "left" | null;
  activeTurnSide?: "bottom" | "right" | "top" | "left" | null;
  turnCountdownRemaining?: number | null;
  onDoubleClickTile?: (tileId: number) => void;
  // Which sides should be visible (matches avatar placement logic).
  activeSides?: Array<"bottom" | "right" | "top" | "left">;
  seatNumbersBySide?: Partial<
    Record<"bottom" | "right" | "top" | "left", number>
  >;
  // Hidden-hand sizes for non-self players (used for wall block counts).
  opponentHandCounts?: Partial<Record<"right" | "top" | "left", number>>;
  // Revealed meld tiles for non-self players, keyed by side.
  opponentMelds?: Partial<
    Record<
      "right" | "top" | "left",
      Array<{ kind: "pong" | "chow" | "kong"; tiles: MahjongTile[] }>
    >
  >;
  rotateForPortrait?: boolean;
};

extend({ Container, Graphics, Sprite, Text });

const labelStyle = new TextStyle({
  fill: 0xf6e3b4,
  fontSize: 14,
  fontWeight: "600",
});

const centerMessageBaseStyle = {
  fill: 0xffd23b,
  fontSize: 56,
  fontWeight: "900" as const,
};

function tileSpriteFileName(t: MahjongTile): string {
  if (t.suit === "dots") return `dot${t.rank}.webp`;
  return `bamboo${t.rank}.webp`;
}

export default function MahjongPixiTable({
  hand,
  melds = [],
  discards,
  selfDiscardTiles = [],
  rightDiscardTiles = [],
  topDiscardTiles = [],
  leftDiscardTiles = [],
  centerMessage = null,
  showDrawPile = false,
  drawPileCount = null,
  lastDiscardSide = null,
  activeTurnSide = null,
  turnCountdownRemaining = null,
  onDoubleClickTile,
  activeSides,
  seatNumbersBySide,
  opponentHandCounts,
  opponentMelds,
  rotateForPortrait = false,
}: Props) {
  const designWidth = 1200;
  const designHeight = 720;
  const boardBackgroundPath = "/images/mj-bg.webp";
  const tileBackgroundPath = "/images/mj-tile-bg.webp";
  const tileBackPath = "/images/mj-tile-back.webp";

  const centerMessageStyle = useMemo(() => {
    const msg = centerMessage ?? "";
    const isMixed = /[A-Za-z0-9\s]/.test(msg);
    return new TextStyle({
      ...centerMessageBaseStyle,
      letterSpacing: isMixed ? 6 : 18,
      stroke: { color: 0x053325, width: isMixed ? 7 : 8 },
      dropShadow: {
        color: 0x000000,
        alpha: 0.55,
        blur: isMixed ? 9 : 10,
        distance: isMixed ? 4 : 5,
        angle: Math.PI / 6,
      },
    });
  }, [centerMessage]);

  // Centralized Tile Style Configuration
  const tileStyle = useMemo(
    () => ({
      // Main hand and meld tiles
      main: {
        w: 68,
        h: 94,
        iconOffsetX: 8,
        iconOffsetY: 20,
        iconShrinkW: 16,
        iconShrinkH: 24,
      },
      // Discarded tiles on the table
      discard: {
        w: 48,
        h: 66,
        iconOffsetX: 6,
        iconOffsetY: 11,
        iconShrinkW: 12,
        iconShrinkH: 16,
      },
      // Small tiles for opponents and side views
      mini: {
        w: 32,
        h: 44,
        iconOffsetX: 5,
        iconOffsetY: 10,
        iconShrinkW: 10,
        iconShrinkH: 14,
      },
      // Last discarded tile (highlighted)
      lastDiscard: {
        w: 52,
        h: 72,
        iconOffsetX: 10,
        iconOffsetY: 18,
        iconShrinkW: 20,
        iconShrinkH: 28,
      },
    }),
    [],
  );

  const getDevicePixelRatio = () => {
    if (typeof window === "undefined") return 1;
    return Math.min(3, Math.max(1, window.devicePixelRatio || 1));
  };

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [devicePixelRatio, setDevicePixelRatio] = useState(getDevicePixelRatio);
  const [viewport, setViewport] = useState({
    width: designWidth,
    height: designHeight,
  });

  const [textures, setTextures] = useState<Record<string, Texture>>({});
  const loadingRef = useRef<Set<string>>(new Set());
  const [hoveredHandIdx, setHoveredHandIdx] = useState<number | null>(null);
  const lastTileTapRef = useRef<{ tileId: number; ts: number } | null>(null);
  const [pulseNow, setPulseNow] = useState(0);

  useEffect(() => {
    if (!lastDiscardSide) return;
    let raf = 0;
    const tick = (ts: number) => {
      setPulseNow(ts);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [lastDiscardSide]);

  const pulse = lastDiscardSide ? (Math.sin(pulseNow / 180) + 1) / 2 : 0;

  const tryEmitDoubleTap = (tileId: number, evtDetail?: number) => {
    // Prefer native click-count when available.
    if (evtDetail === 2) {
      onDoubleClickTile?.(tileId);
      lastTileTapRef.current = null;
      return;
    }

    // Fallback: manual "double-click" detector to avoid relying on `detail`,
    // which can be inconsistent for Pixi pointer events after clicking outside
    // the canvas (focus/target changes).
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const last = lastTileTapRef.current;
    // Desktop double-click delays and mobile double-tap timing vary a lot,
    // so keep this window a bit more forgiving.
    const withinMs = 520;

    if (last && last.tileId === tileId && now - last.ts <= withinMs) {
      onDoubleClickTile?.(tileId);
      lastTileTapRef.current = null;
      return;
    }

    lastTileTapRef.current = { tileId, ts: now };
  };

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;
    const el = containerRef.current;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      setViewport({ width: w, height: h });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncDpr = () => {
      setDevicePixelRatio(getDevicePixelRatio());
    };

    syncDpr();
    window.addEventListener("resize", syncDpr);
    return () => window.removeEventListener("resize", syncDpr);
  }, []);

  const { stageScale, stageX, stageY, stageRotation } = useMemo(() => {
    const w = viewport.width;
    const h = viewport.height;

    // When the phone is portrait but we want a landscape table, we rotate the
    // Pixi scene itself. This keeps hit-testing aligned (unlike CSS-rotating the
    // <canvas>, which can desync pointer coordinates).
    const sx = rotateForPortrait ? h / designWidth : w / designWidth;
    const sy = rotateForPortrait ? w / designHeight : h / designHeight;
    const s = Math.min(sx, sy);

    return {
      stageScale: s,
      stageX: Math.floor(w / 2),
      stageY: Math.floor(h / 2),
      stageRotation: rotateForPortrait ? Math.PI / 2 : 0,
    };
  }, [
    viewport.width,
    viewport.height,
    designWidth,
    designHeight,
    rotateForPortrait,
  ]);

  const width = viewport.width;
  const height = viewport.height;
  const appKey = `${width}x${height}@${devicePixelRatio}`;

  const tableMargin = 48;
  const tableX = tableMargin;
  const tableY = 24;
  const tableW = designWidth - tableMargin * 2;
  const tableH = designHeight - 170;

  const tileW = tileStyle.main.w;
  const tileH = tileStyle.main.h;
  const gap = 0;

  const rackH = 120;
  const rackY = designHeight - rackH - 18;
  const rackX = tableX - 18;
  const rackW = tableW + 36;

  // Tile images folder (under Next.js public/):
  // public/images/MahjongRegular/dot1.png ... dot9.png
  // public/images/MahjongRegular/bamboo1.png ... bamboo9.png
  const tileSpriteBasePath = "/images/MahjongRegular";
  const sides = useMemo(() => new Set(activeSides ?? []), [activeSides]);
  const counts = useMemo(
    () => ({
      right: opponentHandCounts?.right,
      top: opponentHandCounts?.top,
      left: opponentHandCounts?.left,
    }),
    [opponentHandCounts],
  );

  const neededSpritePaths = useMemo(() => {
    const paths = new Set<string>();
    for (const t of hand)
      paths.add(`${tileSpriteBasePath}/${tileSpriteFileName(t)}`);
    for (const m of melds) {
      for (const t of m.tiles)
        paths.add(`${tileSpriteBasePath}/${tileSpriteFileName(t)}`);
    }
    for (const groups of Object.values(opponentMelds ?? {})) {
      for (const g of groups ?? []) {
        for (const t of g.tiles)
          paths.add(`${tileSpriteBasePath}/${tileSpriteFileName(t)}`);
      }
    }
    for (const t of discards)
      paths.add(`${tileSpriteBasePath}/${tileSpriteFileName(t)}`);
    for (const t of selfDiscardTiles)
      paths.add(`${tileSpriteBasePath}/${tileSpriteFileName(t)}`);
    for (const t of rightDiscardTiles)
      paths.add(`${tileSpriteBasePath}/${tileSpriteFileName(t)}`);
    for (const t of topDiscardTiles)
      paths.add(`${tileSpriteBasePath}/${tileSpriteFileName(t)}`);
    for (const t of leftDiscardTiles)
      paths.add(`${tileSpriteBasePath}/${tileSpriteFileName(t)}`);
    return Array.from(paths);
  }, [
    hand,
    melds,
    opponentMelds,
    tileSpriteBasePath,
    selfDiscardTiles,
    rightDiscardTiles,
    topDiscardTiles,
    leftDiscardTiles,
    discards,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    const missing = [
      boardBackgroundPath,
      tileBackgroundPath,
      tileBackPath,
      ...neededSpritePaths,
    ].filter((p) => !textures[p] && !loadingRef.current.has(p));
    if (missing.length === 0) return;

    (async () => {
      const loaded: Record<string, Texture> = {};
      const run = async (paths: string[]) => {
        const queue = [...paths];
        const concurrency = 6;
        const workers = Array.from({
          length: Math.min(concurrency, queue.length),
        })
          .fill(0)
          .map(async () => {
            while (queue.length > 0 && !cancelled) {
              const p = queue.shift();
              if (!p) return;
              try {
                const tex = (await Assets.load(p)) as Texture;
                tex.source.scaleMode = "linear";
                loaded[p] = tex;
              } catch {
              } finally {
                loadingRef.current.delete(p);
              }
            }
          });
        await Promise.all(workers);
      };

      for (const p of missing) loadingRef.current.add(p);
      const priority = [
        boardBackgroundPath,
        tileBackgroundPath,
        tileBackPath,
      ].filter((p) => missing.includes(p));
      const rest = missing.filter((p) => !priority.includes(p));
      await run(priority);
      await run(rest);
      if (cancelled) return;
      if (Object.keys(loaded).length === 0) return;
      setTextures((prev) => ({ ...prev, ...loaded }));
    })();
    return () => {
      cancelled = true;
    };
  }, [
    boardBackgroundPath,
    tileBackgroundPath,
    tileBackPath,
    neededSpritePaths,
    textures,
  ]);

  const boardBackground = textures[boardBackgroundPath];
  const tileBgTex = textures[tileBackgroundPath];
  const tileBackTex = textures[tileBackPath];
  const boardBackgroundPlacement = useMemo(() => {
    if (!boardBackground) return null;
    const w = Math.max(1, boardBackground.width);
    const h = Math.max(1, boardBackground.height);
    const s = Math.max(designWidth / w, designHeight / h);
    const renderW = w * s;
    const renderH = h * s;
    return {
      x: Math.floor((designWidth - renderW) / 2),
      y: Math.floor((designHeight - renderH) / 2),
      scale: s,
    };
  }, [boardBackground, designWidth, designHeight]);

  // Keep the auth user's hand left-aligned in the rack.
  const handStartX = Math.max(24, rackX + 36);

  const meldGroupGap = 10;
  const meldsWidth = useMemo(() => {
    if (!melds || melds.length === 0) return 0;
    let total = 0;
    for (let i = 0; i < melds.length; i++) {
      const m = melds[i];
      const count = Math.max(0, m?.tiles?.length ?? 0);
      if (count === 0) continue;
      total += count * tileW + (count - 1) * gap;
      if (i < melds.length - 1) total += meldGroupGap;
    }
    return total;
  }, [melds, tileW, gap]);

  const meldsStartX = Math.max(
    handStartX + 24,
    rackX + rackW - 36 - meldsWidth,
  );

  const discardCols = 15;
  const sideDiscardCols = 10;
  const discardGap = 2;
  const discardTileW = tileStyle.discard.w;
  const discardTileH = tileStyle.discard.h;
  const discardTotalW =
    discardCols * discardTileW + (discardCols - 1) * discardGap;
  const discardStartX = Math.floor(designWidth / 2 - discardTotalW / 2);
  const discardStartY = Math.floor(tableY + tableH / 2 - 140);

  const criticalReady = !!boardBackground && !!tileBgTex && !!tileBackTex;

  if (!criticalReady) {
    return (
      <div
        ref={containerRef}
        className="flex h-full w-full items-center justify-center bg-[#00251b]"
      >
        <div className="px-6 py-4 text-center text-5xl font-black tracking-[0.28em] text-[#ffd23b] [text-shadow:0_10px_22px_rgba(0,0,0,0.55),0_0_0_8px_rgba(5,51,37,1)]">
          {centerMessage ?? "加载中..."}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <Application
        key={appKey}
        width={width}
        height={height}
        resolution={devicePixelRatio}
        autoDensity
        roundPixels
        antialias
        className="w-full h-full"
      >
        <pixiContainer
          x={stageX}
          y={stageY}
          scale={stageScale}
          rotation={stageRotation}
        >
          <pixiContainer x={-designWidth / 2} y={-designHeight / 2}>
            {boardBackground && boardBackgroundPlacement ? (
              <pixiSprite
                texture={boardBackground}
                x={boardBackgroundPlacement.x}
                y={boardBackgroundPlacement.y}
                scale={boardBackgroundPlacement.scale}
              />
            ) : null}

            <pixiGraphics
              draw={(g) => {
                g.clear();
              }}
            />

            {showDrawPile ? (
              <>
                <pixiGraphics
                  draw={(g) => {
                    g.clear();
                    const cx = Math.floor(designWidth / 2);
                    const cy = Math.floor(tableY + tableH / 2);
                    g.beginFill(0xd8b27a);
                    g.drawRoundedRect(cx - 80, cy - 55, 160, 110, 10);
                    g.endFill();
                    g.lineStyle(3, 0x7a4b12, 1);
                    g.drawRoundedRect(cx - 80, cy - 55, 160, 110, 10);
                  }}
                />
                <pixiText
                  text={
                    drawPileCount != null ? `牌堆: ${drawPileCount}` : "牌堆"
                  }
                  x={Math.floor(designWidth / 2) - 60}
                  y={Math.floor(tableY + tableH / 2) - 50}
                  style={labelStyle}
                />

                {/* Center Indicator UI */}
                <pixiContainer
                  x={Math.floor(designWidth / 2) + 160}
                  y={Math.floor(tableY + tableH / 2)}
                >
                  <pixiGraphics
                    draw={(g) => {
                      g.clear();
                      const amberLight = 0xffe07a;
                      const amber = 0xffd23b;
                      const amberDark = 0xffc61a;
                      const topFaceFill =
                        activeTurnSide === "top" ? amberLight : 0xf5f5f5;
                      const bottomFaceFill =
                        activeTurnSide === "bottom" ? amberDark : 0xdcdcdc;
                      const leftFaceFill =
                        activeTurnSide === "left" ? amber : 0xe5e5e5;
                      const rightFaceFill =
                        activeTurnSide === "right" ? amber : 0xe5e5e5;

                      g.beginFill(0x0b6e62);
                      g.drawRoundedRect(-64, -64, 128, 128, 20);
                      g.endFill();

                      g.lineStyle(3, 0x6ee7d8, 0.32);
                      g.drawRoundedRect(-63, -63, 126, 126, 19);

                      g.lineStyle(3, 0x012a23, 0.55);
                      g.drawRoundedRect(-64, -64, 128, 128, 20);

                      g.lineStyle(0);
                      g.beginFill(0x043a2d);
                      g.drawRoundedRect(-58, -58, 116, 116, 16);
                      g.endFill();

                      g.lineStyle(2, 0x064e3b, 0.7);
                      g.drawRoundedRect(-57, -57, 114, 114, 15);

                      g.lineStyle(0);
                      g.beginFill(0x064e3b);
                      g.drawRoundedRect(-56, -56, 112, 112, 14);
                      g.endFill();

                      // 3D Sunken Center Face (the beveled trapezoids)
                      // Top face (lighter)
                      g.lineStyle(0);
                      g.beginFill(topFaceFill);
                      g.drawPolygon([-50, -50, 50, -50, 24, -24, -24, -24]);
                      g.endFill();

                      // Bottom face (slightly darker)
                      g.beginFill(bottomFaceFill);
                      g.drawPolygon([-50, 50, 50, 50, 24, 24, -24, 24]);
                      g.endFill();

                      // Left face (medium)
                      g.beginFill(leftFaceFill);
                      g.drawPolygon([-50, -50, -50, 50, -24, 24, -24, -24]);
                      g.endFill();

                      // Right face (medium)
                      g.beginFill(rightFaceFill);
                      g.drawPolygon([50, -50, 50, 50, 24, 24, 24, -24]);
                      g.endFill();

                      // Diagonal lines for depth
                      g.lineStyle(1, 0x999999, 0.5);
                      g.moveTo(-50, -50);
                      g.lineTo(-24, -24);
                      g.moveTo(50, -50);
                      g.lineTo(24, -24);
                      g.moveTo(-50, 50);
                      g.lineTo(-24, 24);
                      g.moveTo(50, 50);
                      g.lineTo(24, 24);

                      // Recessed Green Display Area
                      // Shadow for recess
                      g.lineStyle(0);
                      g.beginFill(0x022c22);
                      g.drawRoundedRect(-26, -26, 52, 52, 6);
                      g.endFill();

                      // Green display
                      g.beginFill(0x064e3b);
                      g.drawRoundedRect(-24, -24, 48, 48, 4);
                      g.endFill();
                    }}
                  />
                  {/* Digital Timer */}
                  <pixiText
                    text={(() => {
                      if (turnCountdownRemaining == null) return "00";
                      const v = Math.max(0, Math.ceil(turnCountdownRemaining));
                      return String(v);
                    })()}
                    anchor={0.5}
                    style={
                      new TextStyle({
                        fill: 0x4ade80,
                        fontSize: 28,
                        fontFamily: "monospace",
                        fontWeight: "900",
                        dropShadow: {
                          color: 0x4ade80,
                          alpha: 0.8,
                          blur: 6,
                          distance: 0,
                        },
                      })
                    }
                  />
                  {seatNumbersBySide?.top != null ? (
                    <pixiText
                      text={String(seatNumbersBySide.top)}
                      x={0}
                      y={-38}
                      anchor={0.5}
                      style={
                        new TextStyle({
                          fill: activeTurnSide === "top" ? 0xffd23b : 0x333333,
                          fontSize: 18,
                          fontWeight: "bold",
                        })
                      }
                    />
                  ) : null}
                  {seatNumbersBySide?.left != null ? (
                    <pixiText
                      text={String(seatNumbersBySide.left)}
                      x={-38}
                      y={0}
                      anchor={0.5}
                      style={
                        new TextStyle({
                          fill: activeTurnSide === "left" ? 0xffd23b : 0x333333,
                          fontSize: 18,
                          fontWeight: "bold",
                        })
                      }
                    />
                  ) : null}
                  {seatNumbersBySide?.right != null ? (
                    <pixiText
                      text={String(seatNumbersBySide.right)}
                      x={38}
                      y={0}
                      anchor={0.5}
                      style={
                        new TextStyle({
                          fill:
                            activeTurnSide === "right" ? 0xffd23b : 0x333333,
                          fontSize: 18,
                          fontWeight: "bold",
                        })
                      }
                    />
                  ) : null}
                  {seatNumbersBySide?.bottom != null ? (
                    <pixiText
                      text={String(seatNumbersBySide.bottom)}
                      x={0}
                      y={38}
                      anchor={0.5}
                      style={
                        new TextStyle({
                          fill:
                            activeTurnSide === "bottom" ? 0xffd23b : 0x333333,
                          fontSize: 18,
                          fontWeight: "bold",
                        })
                      }
                    />
                  ) : null}
                </pixiContainer>

                {rightDiscardTiles.length > 0
                  ? (() => {
                      const rowsPerCol = sideDiscardCols;
                      const {
                        w,
                        h,
                        iconOffsetX,
                        iconOffsetY,
                        iconShrinkW,
                        iconShrinkH,
                      } = tileStyle.mini;
                      const tileW = w;
                      const tileH = h;
                      const tileGapX = 10;
                      const tileGapY = -8;

                      const cx = Math.floor(designWidth / 2);
                      const cy = Math.floor(tableY + tableH / 2);

                      const gridHeight =
                        rowsPerCol * tileH + (rowsPerCol - 1) * tileGapY;
                      const startX = cx + 300;
                      const startY = cy - Math.floor(gridHeight / 2);

                      return (
                        <pixiContainer x={startX} y={startY}>
                          {rightDiscardTiles.map((t, i) => {
                            const row = i % rowsPerCol;
                            const col = Math.floor(i / rowsPerCol);
                            const x = col * (tileW + tileGapX);
                            const y = row * (tileH + tileGapY);
                            const spritePath = `${tileSpriteBasePath}/${tileSpriteFileName(t)}`;
                            const tex = textures[spritePath];
                            const isLast =
                              lastDiscardSide === "right" &&
                              i === rightDiscardTiles.length - 1;

                            return (
                              <pixiContainer
                                key={`rd-${t.suit}-${t.rank}-${i}`}
                                x={x + tileW / 2}
                                y={y + tileH / 2}
                                rotation={-Math.PI / 2}
                                scale={isLast ? 1 + pulse * 0.08 : 1}
                              >
                                {tileBgTex && (
                                  <pixiSprite
                                    texture={tileBgTex}
                                    x={-tileW / 2}
                                    y={-tileH / 2}
                                    width={tileW}
                                    height={tileH}
                                  />
                                )}
                                {isLast ? (
                                  <pixiGraphics
                                    draw={(g) => {
                                      g.clear();
                                      const a = 0.35 + pulse * 0.65;
                                      const w = 2 + pulse * 2;
                                      g.beginFill(
                                        0xffd23b,
                                        0.06 + pulse * 0.09,
                                      );
                                      g.drawRoundedRect(
                                        -tileW / 2,
                                        -tileH / 2,
                                        tileW,
                                        tileH,
                                        6,
                                      );
                                      g.endFill();
                                      g.lineStyle(w, 0xffd23b, a);
                                      g.drawRoundedRect(
                                        -tileW / 2,
                                        -tileH / 2,
                                        tileW,
                                        tileH,
                                        6,
                                      );
                                    }}
                                  />
                                ) : null}
                                {tex ? (
                                  <pixiSprite
                                    texture={tex}
                                    x={-tileW / 2 + iconOffsetX}
                                    y={-tileH / 2 + iconOffsetY}
                                    width={tileW - iconShrinkW}
                                    height={tileH - iconShrinkH}
                                  />
                                ) : null}
                              </pixiContainer>
                            );
                          })}
                        </pixiContainer>
                      );
                    })()
                  : null}

                {topDiscardTiles.length > 0
                  ? (() => {
                      const cols = discardCols;
                      const {
                        w,
                        h,
                        iconOffsetX,
                        iconOffsetY,
                        iconShrinkW,
                        iconShrinkH,
                      } = tileStyle.mini;
                      const tileW = w;
                      const tileH = h;
                      const tileGap = 2;
                      const orderedTopDiscards = [...topDiscardTiles].reverse();

                      const totalW = cols * tileW + (cols - 1) * tileGap;
                      const rows = Math.ceil(orderedTopDiscards.length / cols);
                      const gridHeight = rows * tileH + (rows - 1) * tileGap;

                      const cx = Math.floor(designWidth / 2);
                      const cy = Math.floor(tableY + tableH / 2);
                      const startX = Math.floor(cx - totalW / 2);
                      const startY = cy - 100 - gridHeight;

                      return (
                        <pixiContainer x={startX} y={startY}>
                          {orderedTopDiscards.map((t, i) => {
                            const col = i % cols;
                            const rowFromTop = Math.floor(i / cols);
                            const row = rows - 1 - rowFromTop;
                            const x = col * (tileW + tileGap);
                            const y = row * (tileH + tileGap);
                            const spritePath = `${tileSpriteBasePath}/${tileSpriteFileName(t)}`;
                            const tex = textures[spritePath];
                            const isLast = lastDiscardSide === "top" && i === 0;

                            return (
                              <pixiContainer
                                key={`td-${t.suit}-${t.rank}-${i}`}
                                x={x}
                                y={y}
                              >
                                {tileBgTex && (
                                  <pixiSprite
                                    texture={tileBgTex}
                                    x={0}
                                    y={0}
                                    width={tileW}
                                    height={tileH}
                                  />
                                )}
                                {isLast ? (
                                  <pixiGraphics
                                    draw={(g) => {
                                      g.clear();
                                      const a = 0.35 + pulse * 0.65;
                                      const w = 2 + pulse * 2;
                                      g.beginFill(
                                        0xffd23b,
                                        0.06 + pulse * 0.09,
                                      );
                                      g.drawRoundedRect(0, 0, tileW, tileH, 6);
                                      g.endFill();
                                      g.lineStyle(w, 0xffd23b, a);
                                      g.drawRoundedRect(0, 0, tileW, tileH, 6);
                                    }}
                                  />
                                ) : null}
                                {tex ? (
                                  <pixiSprite
                                    texture={tex}
                                    x={iconOffsetX}
                                    y={iconOffsetY}
                                    width={tileW - iconShrinkW}
                                    height={tileH - iconShrinkH}
                                  />
                                ) : null}
                              </pixiContainer>
                            );
                          })}
                        </pixiContainer>
                      );
                    })()
                  : null}

                {leftDiscardTiles.length > 0
                  ? (() => {
                      const rowsPerCol = sideDiscardCols;
                      const {
                        w,
                        h,
                        iconOffsetX,
                        iconOffsetY,
                        iconShrinkW,
                        iconShrinkH,
                      } = tileStyle.mini;
                      const tileW = w;
                      const tileH = h;
                      const tileGapX = 10;
                      const tileGapY = -12;

                      const cx = Math.floor(designWidth / 2);
                      const cy = Math.floor(tableY + tableH / 2);

                      const gridHeight =
                        rowsPerCol * tileH + (rowsPerCol - 1) * tileGapY;
                      const startX = cx - 300;
                      const startY = cy - Math.floor(gridHeight / 2);

                      return (
                        <pixiContainer x={startX} y={startY}>
                          {leftDiscardTiles.map((t, i) => {
                            const row = i % rowsPerCol;
                            const col = Math.floor(i / rowsPerCol);
                            const x = col * (tileW + tileGapX);
                            const y = row * (tileH + tileGapY);
                            const spritePath = `${tileSpriteBasePath}/${tileSpriteFileName(t)}`;
                            const tex = textures[spritePath];
                            const isLast =
                              lastDiscardSide === "left" &&
                              i === leftDiscardTiles.length - 1;

                            return (
                              <pixiContainer
                                key={`ld-${t.suit}-${t.rank}-${i}`}
                                x={-(x + tileW / 2)}
                                y={y + tileH / 2}
                                rotation={Math.PI / 2}
                                scale={isLast ? 1 + pulse * 0.08 : 1}
                              >
                                {tileBgTex && (
                                  <pixiSprite
                                    texture={tileBgTex}
                                    x={-tileW / 2}
                                    y={-tileH / 2}
                                    width={tileW}
                                    height={tileH}
                                  />
                                )}
                                {isLast ? (
                                  <pixiGraphics
                                    draw={(g) => {
                                      g.clear();
                                      const a = 0.35 + pulse * 0.65;
                                      const w = 2 + pulse * 2;
                                      g.beginFill(
                                        0xffd23b,
                                        0.06 + pulse * 0.09,
                                      );
                                      g.drawRoundedRect(
                                        -tileW / 2,
                                        -tileH / 2,
                                        tileW,
                                        tileH,
                                        6,
                                      );
                                      g.endFill();
                                      g.lineStyle(w, 0xffd23b, a);
                                      g.drawRoundedRect(
                                        -tileW / 2,
                                        -tileH / 2,
                                        tileW,
                                        tileH,
                                        6,
                                      );
                                    }}
                                  />
                                ) : null}
                                {tex ? (
                                  <pixiSprite
                                    texture={tex}
                                    x={-tileW / 2 + iconOffsetX}
                                    y={-tileH / 2 + iconOffsetY}
                                    width={tileW - iconShrinkW}
                                    height={tileH - iconShrinkH}
                                  />
                                ) : null}
                              </pixiContainer>
                            );
                          })}
                        </pixiContainer>
                      );
                    })()
                  : null}

                {selfDiscardTiles.length > 0
                  ? (() => {
                      const cols = discardCols;
                      const {
                        w,
                        h,
                        iconOffsetX,
                        iconOffsetY,
                        iconShrinkW,
                        iconShrinkH,
                      } = tileStyle.mini;
                      const tileW = w;
                      const tileH = h;
                      const tileGap = 2;
                      const totalW = cols * tileW + (cols - 1) * tileGap;

                      const cx = Math.floor(designWidth / 2);
                      const cy = Math.floor(tableY + tableH / 2);
                      const startX = Math.floor(cx - totalW / 2);
                      // Move auth user's discarded tiles into the center table area
                      // (blue rectangle target), away from the bottom rack.
                      const startY = cy + 200;

                      return (
                        <pixiContainer x={startX} y={startY}>
                          {selfDiscardTiles.map((t, i) => {
                            const col = i % cols;
                            const row = Math.floor(i / cols);
                            const x = col * (tileW + tileGap);
                            const y = row * (tileH + tileGap);
                            const spritePath = `${tileSpriteBasePath}/${tileSpriteFileName(t)}`;
                            const tex = textures[spritePath];
                            const isLast =
                              lastDiscardSide === "bottom" &&
                              i === selfDiscardTiles.length - 1;

                            return (
                              <pixiContainer
                                key={`sd-${t.suit}-${t.rank}-${i}`}
                                x={x}
                                y={y}
                              >
                                {tileBgTex && (
                                  <pixiSprite
                                    texture={tileBgTex}
                                    x={0}
                                    y={0}
                                    width={tileW}
                                    height={tileH}
                                  />
                                )}
                                {isLast ? (
                                  <pixiGraphics
                                    draw={(g) => {
                                      g.clear();
                                      const a = 0.35 + pulse * 0.65;
                                      const w = 2 + pulse * 2;
                                      g.beginFill(
                                        0xffd23b,
                                        0.06 + pulse * 0.09,
                                      );
                                      g.drawRoundedRect(0, 0, tileW, tileH, 6);
                                      g.endFill();
                                      g.lineStyle(w, 0xffd23b, a);
                                      g.drawRoundedRect(0, 0, tileW, tileH, 6);
                                    }}
                                  />
                                ) : null}
                                {tex ? (
                                  <pixiSprite
                                    texture={tex}
                                    x={iconOffsetX}
                                    y={iconOffsetY}
                                    width={tileW - iconShrinkW}
                                    height={tileH - iconShrinkH}
                                  />
                                ) : null}
                              </pixiContainer>
                            );
                          })}
                        </pixiContainer>
                      );
                    })()
                  : null}
              </>
            ) : null}

            {centerMessage ? (
              <pixiContainer
                x={Math.floor(designWidth / 2)}
                y={Math.floor(tableY + tableH / 2)}
              >
                <pixiText
                  text={centerMessage}
                  anchor={0.5}
                  x={0}
                  y={0}
                  style={centerMessageStyle}
                />
              </pixiContainer>
            ) : null}

            {discards.map((t, i) => {
              const col = i % discardCols;
              const row = Math.floor(i / discardCols);
              const x = discardStartX + col * (discardTileW + discardGap);
              const y = discardStartY + row * (discardTileH + discardGap);
              const spritePath = `${tileSpriteBasePath}/${tileSpriteFileName(t)}`;
              const tex = textures[spritePath];

              return (
                <pixiContainer key={`d-${t.suit}-${t.rank}-${i}`} x={x} y={y}>
                  {tileBgTex && (
                    <pixiSprite
                      texture={tileBgTex}
                      x={0}
                      y={0}
                      width={discardTileW}
                      height={discardTileH}
                    />
                  )}
                  {tex ? (
                    <pixiSprite
                      texture={tex}
                      x={tileStyle.discard.iconOffsetX}
                      y={tileStyle.discard.iconOffsetY}
                      width={discardTileW - tileStyle.discard.iconShrinkW}
                      height={discardTileH - tileStyle.discard.iconShrinkH}
                    />
                  ) : null}
                </pixiContainer>
              );
            })}

            {(() => {
              const orderedMeldGroups = (side: "right" | "top" | "left") => {
                const raw = opponentMelds?.[side] ?? [];
                return [
                  ...raw.filter((m) => m.kind === "chow"),
                  ...raw.filter((m) => m.kind === "pong"),
                  ...raw.filter((m) => m.kind === "kong"),
                ].filter((g) => Array.isArray(g.tiles) && g.tiles.length > 0);
              };

              const showTop = sides.size === 0 || sides.has("top");
              const showLeft = sides.size === 0 || sides.has("left");
              const showRight = sides.size === 0 || sides.has("right");

              const topGroups = orderedMeldGroups("top");
              const leftGroups = orderedMeldGroups("left");
              const rightGroups = orderedMeldGroups("right");

              const smallW = 30;
              const smallH = 40;
              const topY = tableY + 18;

              const topCount = counts.top ?? 7;
              const topStartX = Math.floor(
                designWidth / 2 - (topCount * smallW + (topCount - 1) * 1) / 2,
              );

              const sideCountLeft = counts.left ?? 7;
              const sideCountRight = counts.right ?? 7;
              const sideCount = Math.max(sideCountLeft, sideCountRight);
              const sideXLeft = tableX + 18;
              const sideXRight = tableX + tableW - 18 - smallH;
              const sideStartY = Math.floor(
                tableY +
                  tableH / 2 -
                  (sideCount * smallW + (sideCount - 1) * 1) / 2,
              );

              const renderMiniTile = (
                key: string,
                tile: MahjongTile,
                x: number,
                y: number,
                rotation = 0,
              ) => {
                const spritePath = `${tileSpriteBasePath}/${tileSpriteFileName(tile)}`;
                const tex = textures[spritePath];
                const {
                  w,
                  h,
                  iconOffsetX,
                  iconOffsetY,
                  iconShrinkW,
                  iconShrinkH,
                } = tileStyle.mini;

                return (
                  <pixiContainer key={key} x={x} y={y} rotation={rotation}>
                    {tileBgTex && (
                      <pixiSprite
                        texture={tileBgTex}
                        x={-w / 2}
                        y={-h / 2}
                        width={w}
                        height={h}
                      />
                    )}
                    {tex ? (
                      <pixiSprite
                        texture={tex}
                        x={-w / 2 + iconOffsetX}
                        y={-h / 2 + iconOffsetY}
                        width={w - iconShrinkW}
                        height={h - iconShrinkH}
                      />
                    ) : null}
                  </pixiContainer>
                );
              };

              const out: Array<React.ReactNode> = [];

              // 1. Add Face-down (Back) Tiles
              if (tileBackTex) {
                if (showTop) {
                  for (let i = 0; i < topCount; i++) {
                    out.push(
                      <pixiSprite
                        key={`back-top-${i}`}
                        texture={tileBackTex}
                        x={topStartX + i * (smallW + 1)}
                        y={topY}
                        width={smallW}
                        height={smallH}
                      />,
                    );
                  }
                }
                for (let i = 0; i < sideCount; i++) {
                  if (showLeft && i < sideCountLeft) {
                    out.push(
                      <pixiSprite
                        key={`back-left-${i}`}
                        texture={tileBackTex}
                        x={sideXLeft}
                        y={sideStartY + i * (smallW + 1)}
                        width={smallH} // Landscape
                        height={smallW} // Landscape
                      />,
                    );
                  }
                  if (showRight && i < sideCountRight) {
                    out.push(
                      <pixiSprite
                        key={`back-right-${i}`}
                        texture={tileBackTex}
                        x={sideXRight}
                        y={sideStartY + i * (smallW + 1)}
                        width={smallH} // Landscape
                        height={smallW} // Landscape
                      />,
                    );
                  }
                }
              }

              // 2. Add Inline Melds
              const groupGap = 1;
              const opponentSmallGap = 1;

              if (showTop && topGroups.length > 0) {
                const startX =
                  topStartX + topCount * (smallW + 1) + Math.max(10, gap);
                const y = topY + smallH / 2;

                let cursor = startX;
                topGroups.forEach((g, gi) => {
                  (g.tiles ?? []).forEach((t, ti) => {
                    const cx =
                      cursor + ti * (tileStyle.mini.w + opponentSmallGap);
                    out.push(
                      renderMiniTile(`op-top-inline-${gi}-${ti}`, t, cx, y, 0),
                    );
                  });
                  cursor +=
                    (g.tiles?.length ?? 0) *
                    (tileStyle.mini.w + opponentSmallGap);
                  if (gi < topGroups.length - 1) cursor += groupGap;
                });
              }

              if (showLeft && leftGroups.length > 0) {
                const startY =
                  sideStartY + sideCountLeft * (smallW + 1) + Math.max(10, gap);
                const x = sideXLeft + smallH / 2;

                let cursor = startY;
                leftGroups.forEach((g, gi) => {
                  (g.tiles ?? []).forEach((t, ti) => {
                    const cy =
                      cursor + ti * (tileStyle.mini.w + opponentSmallGap);
                    out.push(
                      renderMiniTile(
                        `op-left-inline-${gi}-${ti}`,
                        t,
                        x,
                        cy,
                        Math.PI / 2,
                      ),
                    );
                  });
                  cursor +=
                    (g.tiles?.length ?? 0) *
                    (tileStyle.mini.w + opponentSmallGap);
                  if (gi < leftGroups.length - 1) cursor += groupGap;
                });
              }

              if (showRight && rightGroups.length > 0) {
                const startY =
                  sideStartY +
                  sideCountRight * (smallW + 1) +
                  Math.max(10, gap);
                const x = sideXRight + smallH / 2;

                let cursor = startY;
                rightGroups.forEach((g, gi) => {
                  (g.tiles ?? []).forEach((t, ti) => {
                    const cy =
                      cursor + ti * (tileStyle.mini.w + opponentSmallGap);
                    out.push(
                      renderMiniTile(
                        `op-right-inline-${gi}-${ti}`,
                        t,
                        x,
                        cy,
                        -Math.PI / 2,
                      ),
                    );
                  });
                  cursor +=
                    (g.tiles?.length ?? 0) *
                    (tileStyle.mini.w + opponentSmallGap);
                  if (gi < rightGroups.length - 1) cursor += groupGap;
                });
              }

              return <>{out}</>;
            })()}

            {hand.map((t, idx) => {
              const x = handStartX + idx * (tileW + gap);
              const baseY = rackY + 16;
              const isHovered = hoveredHandIdx === idx;
              const y = baseY + (isHovered ? -10 : 0);

              const spritePath = `${tileSpriteBasePath}/${tileSpriteFileName(t)}`;
              const tex = textures[spritePath];

              return (
                <pixiContainer
                  key={`${t.suit}-${t.rank}-${idx}`}
                  x={x}
                  y={y}
                  scale={isHovered ? 1.06 : 1}
                  eventMode="static"
                  cursor="default"
                  onPointerTap={(e: unknown) => {
                    const tileId = (t as { id?: number }).id;
                    if (typeof tileId !== "number") return;
                    const detail = (e as unknown as { detail?: number }).detail;
                    tryEmitDoubleTap(tileId, detail);
                  }}
                  onPointerOver={() => setHoveredHandIdx(idx)}
                  onPointerOut={() =>
                    setHoveredHandIdx((prev) => (prev === idx ? null : prev))
                  }
                >
                  {tileBgTex && (
                    <pixiSprite
                      texture={tileBgTex}
                      x={0}
                      y={0}
                      width={tileW}
                      height={tileH}
                    />
                  )}

                  {tex ? (
                    <pixiSprite
                      texture={tex}
                      x={tileStyle.main.iconOffsetX}
                      y={tileStyle.main.iconOffsetY}
                      width={tileW - tileStyle.main.iconShrinkW}
                      height={tileH - tileStyle.main.iconShrinkH}
                    />
                  ) : null}
                </pixiContainer>
              );
            })}

            {(() => {
              if (!melds || melds.length === 0) return null;
              let cursorX = meldsStartX;
              const baseY = rackY + 16;

              return melds
                .filter((m) => Array.isArray(m.tiles) && m.tiles.length > 0)
                .map((m, mi) => {
                  const groupX = cursorX;
                  const tiles = m.tiles;
                  const containers = tiles.map((t, ti) => {
                    const x = groupX + ti * (tileW + gap);
                    const spritePath = `${tileSpriteBasePath}/${tileSpriteFileName(t)}`;
                    const tex = textures[spritePath];

                    return (
                      <pixiContainer
                        key={`meld-${m.kind}-${m.meldKey}-${mi}-${ti}`}
                        x={x}
                        y={baseY}
                        eventMode="none"
                      >
                        {tileBgTex && (
                          <pixiSprite
                            texture={tileBgTex}
                            x={0}
                            y={0}
                            width={tileW}
                            height={tileH}
                          />
                        )}

                        {tex ? (
                          <pixiSprite
                            texture={tex}
                            x={tileStyle.main.iconOffsetX}
                            y={tileStyle.main.iconOffsetY}
                            width={tileW - tileStyle.main.iconShrinkW}
                            height={tileH - tileStyle.main.iconShrinkH}
                          />
                        ) : null}
                      </pixiContainer>
                    );
                  });

                  const groupWidth =
                    tiles.length * tileW + Math.max(0, tiles.length - 1) * gap;
                  cursorX = groupX + groupWidth + meldGroupGap;
                  return containers;
                });
            })()}
          </pixiContainer>
        </pixiContainer>
      </Application>
    </div>
  );
}
