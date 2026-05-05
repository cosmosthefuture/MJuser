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
  highlightDiscard: boolean;
  centerMessage?: string | null;
  showDrawPile?: boolean;
  drawPileCount?: number | null;
  lastDiscardTile?: MahjongTile | null;
  onDoubleClickTile?: (tileId: number) => void;
  // Which sides should be visible (matches avatar placement logic).
  activeSides?: Array<"bottom" | "right" | "top" | "left">;
  // Hidden-hand sizes for non-self players (used for wall block counts).
  opponentHandCounts?: Partial<Record<"right" | "top" | "left", number>>;
  // Revealed meld tiles for non-self players, keyed by side.
  opponentMelds?: Partial<
    Record<
      "right" | "top" | "left",
      Array<{ kind: "pong" | "chow" | "kong"; tiles: MahjongTile[] }>
    >
  >;
};

extend({ Container, Graphics, Sprite, Text });

const labelStyle = new TextStyle({
  fill: 0xf6e3b4,
  fontSize: 14,
  fontWeight: "600",
});

function tileSpriteFileName(t: MahjongTile): string {
  if (t.suit === "dots") return `dot${t.rank}.png`;
  return `bamboo${t.rank}.png`;
}

function drawMahjongBlock(
  g: Graphics,
  opts: {
    width: number;
    height: number;
    depthX: number;
    depthY: number;
    faceColor: number;
    borderColor: number;
  },
) {
  const { width, height, depthX, depthY, faceColor, borderColor } = opts;
  const faceW = width - depthX;
  const faceH = height - depthY;
  const splitX = Math.max(1, depthX / 2);
  const splitY = Math.max(1, depthY / 2);
  const radius = 5;

  g.clear();

  // Rounded soft shadow following the outer green layer shape.
  g.beginFill(0x000000, 0.12);
  g.drawRoundedRect(depthX + 1, depthY + 2, faceW, faceH, radius + 1);
  g.endFill();
  g.beginFill(0x000000, 0.05);
  g.drawRoundedRect(depthX + 2, depthY + 3, faceW - 2, faceH - 2, radius);
  g.endFill();

  // 2cm thickness as stacked rounded layers:
  // first 1cm (near face) = gray, second 1cm (outer) = green.
  g.beginFill(0xc4ccd8, 0.98);
  g.drawRoundedRect(splitX, splitY, faceW, faceH, radius);
  g.endFill();

  g.beginFill(0x29a74e, 0.98);
  g.drawRoundedRect(depthX, depthY, faceW, faceH, radius);
  g.endFill();

  // Tile face
  g.beginFill(faceColor);
  g.drawRoundedRect(0, 0, faceW, faceH, radius);
  g.endFill();

  // Face frame
  g.lineStyle(1, borderColor, 0.92);
  g.drawRoundedRect(0, 0, faceW, faceH, radius);
  g.lineStyle(1, 0xffffff, 0.2);
  g.drawRoundedRect(1.5, 1.5, faceW - 3, faceH - 3, radius - 1);

  // Subtle front image frame.
  g.lineStyle(1, 0xb8bec8, 0.52);
  g.drawRoundedRect(4, 6, faceW - 8, faceH - 12, Math.max(2, radius - 3));
  g.lineStyle(1, 0xffffff, 0.18);
  g.drawRoundedRect(5, 7, faceW - 10, faceH - 14, Math.max(1, radius - 4));
}

export default function MahjongPixiTable({
  hand,
  melds = [],
  discards,
  highlightDiscard,
  centerMessage = null,
  showDrawPile = false,
  drawPileCount = null,
  lastDiscardTile = null,
  onDoubleClickTile,
  activeSides,
  opponentHandCounts,
  opponentMelds,
}: Props) {
  const designWidth = 1200;
  const designHeight = 720;
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
  const [hoveredHandIdx, setHoveredHandIdx] = useState<number | null>(null);

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

  const scale = useMemo(() => {
    const sx = viewport.width / designWidth;
    const sy = viewport.height / designHeight;
    return Math.min(sx, sy);
  }, [viewport.width, viewport.height, designWidth, designHeight]);

  const offsetX = useMemo(() => {
    return Math.floor((viewport.width - designWidth * scale) / 2);
  }, [viewport.width, designWidth, scale]);

  const offsetY = useMemo(() => {
    return Math.floor((viewport.height - designHeight * scale) / 2);
  }, [viewport.height, designHeight, scale]);

  const width = viewport.width;
  const height = viewport.height;
  const appKey = `${width}x${height}@${devicePixelRatio}`;

  const tableMargin = 48;
  const tableX = tableMargin;
  const tableY = 24;
  const tableW = designWidth - tableMargin * 2;
  const tableH = designHeight - 170;

  const wallThickness = 44;

  const tileW = 58;
  const tileH = 80;
  const gap = 6;

  const rackH = 110;
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
    return Array.from(paths);
  }, [hand, melds, discards, opponentMelds, tileSpriteBasePath]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    const missing = neededSpritePaths.filter((p) => !textures[p]);
    if (missing.length === 0) return;

    (async () => {
      const loaded: Record<string, Texture> = {};
      for (const p of missing) {
        try {
          const tex = (await Assets.load(p)) as Texture;
          tex.source.scaleMode = "linear";
          loaded[p] = tex;
        } catch {
          // ignore missing/failed assets; we keep placeholder graphics
        }
      }
      if (cancelled) return;
      if (Object.keys(loaded).length === 0) return;
      setTextures((prev) => ({ ...prev, ...loaded }));
    })();

    return () => {
      cancelled = true;
    };
  }, [neededSpritePaths, textures]);

  // Keep the auth user's hand left-aligned in the rack.
  const handStartX = Math.max(24, rackX + 36);

  const meldGroupGap = 18;
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

  const discardCols = 10;
  const discardGap = 6;
  const discardTileW = 44;
  const discardTileH = 60;
  const discardDepthX = 3;
  const discardDepthY = 3;
  const discardTotalW =
    discardCols * discardTileW + (discardCols - 1) * discardGap;
  const discardStartX = Math.floor(designWidth / 2 - discardTotalW / 2);
  const discardStartY = Math.floor(tableY + tableH / 2 - 140);

  const opponentSmallTileW = 28;
  const opponentSmallTileH = 40;
  const opponentSmallGap = 6;

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
        <pixiContainer x={offsetX} y={offsetY} scale={scale}>
          <pixiGraphics
            draw={(g) => {
              g.clear();
              g.beginFill(0x3a2a16);
              g.drawRect(tableX - 18, tableY - 18, tableW + 36, tableH + 36);
              g.endFill();

              g.beginFill(0x1f6a41);
              g.drawRect(tableX, tableY, tableW, tableH);
              g.endFill();

              g.lineStyle(4, 0x0b3a24, 1);
              g.drawRect(tableX, tableY, tableW, tableH);
            }}
          />

          <pixiGraphics
            draw={(g) => {
              g.clear();
              const felt = 0x1d7b49;
              const wall = 0x0a6a3a;
              const back = 0x1a120c;

              const showTop = sides.size === 0 || sides.has("top");
              const showLeft = sides.size === 0 || sides.has("left");
              const showRight = sides.size === 0 || sides.has("right");
              const showBottom = sides.size === 0 || sides.has("bottom");

              if (showTop) {
                g.beginFill(wall);
                g.drawRoundedRect(
                  tableX + 24,
                  tableY + 10,
                  tableW - 48,
                  wallThickness,
                  8,
                );
                g.endFill();
              }

              if (showLeft) {
                g.beginFill(wall);
                g.drawRoundedRect(
                  tableX + 10,
                  tableY + 24,
                  wallThickness,
                  tableH - 48,
                  8,
                );
                g.endFill();
              }

              if (showRight) {
                g.beginFill(wall);
                g.drawRoundedRect(
                  tableX + tableW - wallThickness - 10,
                  tableY + 24,
                  wallThickness,
                  tableH - 48,
                  8,
                );
                g.endFill();
              }

              if (showBottom) {
                g.beginFill(wall);
                g.drawRoundedRect(
                  tableX + 24,
                  tableY + tableH - wallThickness - 10,
                  tableW - 48,
                  wallThickness,
                  8,
                );
                g.endFill();
              }

              g.beginFill(felt);
              g.drawRoundedRect(
                tableX + 110,
                tableY + 110,
                tableW - 220,
                tableH - 220,
                14,
              );
              g.endFill();

              g.beginFill(back);
              g.drawRect(rackX, rackY, rackW, rackH);
              g.endFill();

              g.beginFill(0xd0b07a);
              g.drawRect(rackX + 6, rackY + 6, rackW - 12, rackH - 12);
              g.endFill();

              g.lineStyle(4, 0x7a4b12, 1);
              g.drawRect(rackX, rackY, rackW, rackH);
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
                  drawPileCount != null
                    ? `Draw Pile: ${drawPileCount}`
                    : "Draw Pile"
                }
                x={Math.floor(designWidth / 2) - 60}
                y={Math.floor(tableY + tableH / 2) - 50}
                style={labelStyle}
              />
              {lastDiscardTile
                ? (() => {
                    const spritePath = `${tileSpriteBasePath}/${tileSpriteFileName(
                      lastDiscardTile,
                    )}`;
                    const tex = textures[spritePath];
                    if (!tex) return null;
                    const cx = Math.floor(designWidth / 2);
                    const cy = Math.floor(tableY + tableH / 2);
                    return (
                      <pixiContainer x={cx - 23} y={cy - 10}>
                        <pixiGraphics
                          draw={(g) => {
                            drawMahjongBlock(g, {
                              width: 46,
                              height: 64,
                              depthX: 4,
                              depthY: 4,
                              faceColor: 0xe7e8eb,
                              borderColor: 0xb8bcc3,
                            });
                          }}
                        />
                        <pixiSprite
                          texture={tex}
                          x={4}
                          y={5}
                          width={46 - 4 - 8}
                          height={64 - 4 - 10}
                        />
                      </pixiContainer>
                    );
                  })()
                : null}
            </>
          ) : null}

          <pixiText
            text={highlightDiscard ? "Click a tile to discard" : ""}
            x={24}
            y={rackY - 22}
            style={labelStyle}
          />

          {centerMessage ? (
            <pixiContainer
              x={Math.floor(designWidth / 2)}
              y={Math.floor(tableY + tableH / 2)}
            >
              <pixiGraphics
                draw={(g) => {
                  g.clear();
                  g.beginFill(0x000000, 0.55);
                  g.drawRoundedRect(-220, -34, 440, 68, 18);
                  g.endFill();
                  g.lineStyle(2, 0xf6e3b4, 0.22);
                  g.drawRoundedRect(-220, -34, 440, 68, 18);
                }}
              />
              <pixiText
                text={centerMessage}
                anchor={0.5}
                x={0}
                y={0}
                style={
                  new TextStyle({
                    fill: 0xf6e3b4,
                    fontSize: 22,
                    fontWeight: "700",
                    letterSpacing: 1,
                  })
                }
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
                <pixiGraphics
                  draw={(g) => {
                    drawMahjongBlock(g, {
                      width: discardTileW,
                      height: discardTileH,
                      depthX: discardDepthX,
                      depthY: discardDepthY,
                      faceColor: 0xe7e8eb,
                      borderColor: 0xb8bcc3,
                    });
                  }}
                />
                {tex ? (
                  <pixiSprite
                    texture={tex}
                    x={3}
                    y={4}
                    width={discardTileW - discardDepthX - 6}
                    height={discardTileH - discardDepthY - 8}
                  />
                ) : null}
              </pixiContainer>
            );
          })}

          <pixiGraphics
            draw={(g) => {
              g.clear();
              const back = 0x0e5a35;
              const edge = 0x06311e;
              const showTop = sides.size === 0 || sides.has("top");
              const showLeft = sides.size === 0 || sides.has("left");
              const showRight = sides.size === 0 || sides.has("right");
              // No small wall blocks for the auth user's side (bottom).
              const showBottom = false;

              const topCount = counts.top ?? 16;
              const smallW = 26;
              const smallH = 34;
              const topStartX = Math.floor(
                designWidth / 2 - (topCount * smallW + (topCount - 1) * 2) / 2,
              );
              const topY = tableY + 18;
              const bottomY = tableY + tableH - 18 - smallH;

              g.beginFill(back);
              if (showTop) {
                for (let i = 0; i < topCount; i++) {
                  g.drawRoundedRect(
                    topStartX + i * (smallW + 2),
                    topY,
                    smallW,
                    smallH,
                    4,
                  );
                }
              }
              if (showBottom) {
                for (let i = 0; i < topCount; i++) {
                  g.drawRoundedRect(
                    topStartX + i * (smallW + 2),
                    bottomY,
                    smallW,
                    smallH,
                    4,
                  );
                }
              }
              g.endFill();

              const sideCountLeft = counts.left ?? 14;
              const sideCountRight = counts.right ?? 14;
              const sideCount = Math.max(sideCountLeft, sideCountRight);
              const sideXLeft = tableX + 18;
              const sideXRight = tableX + tableW - 18 - smallH;
              const sideStartY = Math.floor(
                tableY +
                  tableH / 2 -
                  (sideCount * smallW + (sideCount - 1) * 2) / 2,
              );

              g.beginFill(back);
              for (let i = 0; i < sideCount; i++) {
                if (showLeft) {
                  if (i >= sideCountLeft) {
                    // no-op
                  } else {
                    g.drawRoundedRect(
                      sideXLeft,
                      sideStartY + i * (smallW + 2),
                      smallH,
                      smallW,
                      4,
                    );
                  }
                }
                if (showRight) {
                  if (i >= sideCountRight) {
                    // no-op
                  } else {
                    g.drawRoundedRect(
                      sideXRight,
                      sideStartY + i * (smallW + 2),
                      smallH,
                      smallW,
                      4,
                    );
                  }
                }
              }
              g.endFill();

              g.lineStyle(2, edge, 1);
              if (showTop) {
                for (let i = 0; i < topCount; i++) {
                  g.drawRoundedRect(
                    topStartX + i * (smallW + 2),
                    topY,
                    smallW,
                    smallH,
                    4,
                  );
                }
              }
              if (showBottom) {
                for (let i = 0; i < topCount; i++) {
                  g.drawRoundedRect(
                    topStartX + i * (smallW + 2),
                    bottomY,
                    smallW,
                    smallH,
                    4,
                  );
                }
              }
              for (let i = 0; i < sideCount; i++) {
                if (showLeft) {
                  if (i < sideCountLeft) {
                    g.drawRoundedRect(
                      sideXLeft,
                      sideStartY + i * (smallW + 2),
                      smallH,
                      smallW,
                      4,
                    );
                  }
                }
                if (showRight) {
                  if (i < sideCountRight) {
                    g.drawRoundedRect(
                      sideXRight,
                      sideStartY + i * (smallW + 2),
                      smallH,
                      smallW,
                      4,
                    );
                  }
                }
              }
            }}
          />

          {(() => {
            const groupsFor = (side: "right" | "top" | "left") => {
              const raw = opponentMelds?.[side] ?? [];
              const ordered = [
                ...raw.filter((m) => m.kind === "chow"),
                ...raw.filter((m) => m.kind === "pong"),
                ...raw.filter((m) => m.kind === "kong"),
              ];
              return ordered;
            };

            const showTop = sides.size === 0 || sides.has("top");
            const showLeft = sides.size === 0 || sides.has("left");
            const showRight = sides.size === 0 || sides.has("right");

            const topGroups = groupsFor("top");
            const leftGroups = groupsFor("left");
            const rightGroups = groupsFor("right");

            const smallW = 26;
            const smallH = 34;
            const topY = tableY + 18;

            const sideCountLeft = counts.left ?? 14;
            const sideCountRight = counts.right ?? 14;
            const sideCount = Math.max(sideCountLeft, sideCountRight);
            const sideXLeft = tableX + 18;
            const sideXRight = tableX + tableW - 18 - smallH;
            const sideStartY = Math.floor(
              tableY +
                tableH / 2 -
                (sideCount * smallW + (sideCount - 1) * 2) / 2,
            );

            const alignToHiddenRowY = (count: number) => {
              const safeCount = Math.max(1, Math.floor(count));
              const midIdx = Math.floor((safeCount - 1) / 2);
              const hiddenCenterY =
                sideStartY + midIdx * (smallW + 2) + smallW / 2;
              return Math.floor(hiddenCenterY);
            };

            const renderRow = (
              key: string,
              x: number,
              y: number,
              groups: Array<{ tiles: MahjongTile[] }>,
              anchor: "left" | "right" | "center" = "left",
            ) => {
              if (!groups || groups.length === 0) return null;

              const flat: Array<{ groupIndex: number; tile: MahjongTile }> = [];
              groups.forEach((g, gi) => {
                (g.tiles ?? []).forEach((t) =>
                  flat.push({ groupIndex: gi, tile: t }),
                );
              });
              if (flat.length === 0) return null;

              let totalW = 0;
              let prevGroup = flat[0]?.groupIndex ?? 0;
              for (let i = 0; i < flat.length; i++) {
                const item = flat[i];
                if (i > 0) {
                  totalW += opponentSmallGap;
                  if (item.groupIndex !== prevGroup)
                    totalW += opponentSmallGap * 2;
                }
                totalW += opponentSmallTileW;
                prevGroup = item.groupIndex;
              }

              const startX =
                anchor === "right"
                  ? x - totalW
                  : anchor === "center"
                    ? x - totalW / 2
                    : x;

              let cursorX = startX;
              prevGroup = flat[0]?.groupIndex ?? 0;
              return (
                <pixiContainer key={key} x={cursorX} y={y}>
                  {flat.map((item, i) => {
                    if (i > 0) {
                      cursorX += opponentSmallGap;
                      if (item.groupIndex !== prevGroup)
                        cursorX += opponentSmallGap * 2;
                    }
                    const spritePath = `${tileSpriteBasePath}/${tileSpriteFileName(
                      item.tile,
                    )}`;
                    const tex = textures[spritePath];
                    const xLocal = cursorX - startX;
                    const out = (
                      <pixiContainer key={`${key}-${i}`} x={xLocal} y={0}>
                        <pixiGraphics
                          draw={(g) => {
                            drawMahjongBlock(g, {
                              width: opponentSmallTileW,
                              height: opponentSmallTileH,
                              depthX: 4,
                              depthY: 4,
                              faceColor: 0xe7e8eb,
                              borderColor: 0xb8bcc3,
                            });
                          }}
                        />
                        {tex ? (
                          <pixiSprite
                            texture={tex}
                            x={4}
                            y={5}
                            width={opponentSmallTileW - 4 - 8}
                            height={opponentSmallTileH - 4 - 10}
                          />
                        ) : null}
                      </pixiContainer>
                    );
                    cursorX += opponentSmallTileW;
                    prevGroup = item.groupIndex;
                    return out;
                  })}
                </pixiContainer>
              );
            };

            const out: Array<unknown> = [];
            if (showRight && rightGroups.length > 0) {
              const y =
                alignToHiddenRowY(counts.right ?? 14) - opponentSmallTileH / 2;
              const x = sideXRight - 10;
              out.push(renderRow("op-right", x, y, rightGroups, "right"));
            }
            if (showLeft && leftGroups.length > 0) {
              const y =
                alignToHiddenRowY(counts.left ?? 14) - opponentSmallTileH / 2;
              const x = sideXLeft + smallH + 10;
              out.push(renderRow("op-left", x, y, leftGroups, "left"));
            }
            if (showTop && topGroups.length > 0) {
              const y = topY + smallH + 10;
              const x = Math.floor(designWidth / 2);
              out.push(renderRow("op-top", x, y, topGroups, "center"));
            }

            return <>{out}</>;
          })()}

          {hand.map((t, idx) => {
            const x = handStartX + idx * (tileW + gap);
            const baseY = rackY + 16;
            const isHovered = hoveredHandIdx === idx;
            const y = baseY + (isHovered ? -10 : 0);
            const handDepthX = 4;
            const handDepthY = 4;

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
                  const detail = (e as unknown as { detail?: number }).detail;
                  if (detail !== 2) return;
                  const tileId = (t as { id?: number }).id;
                  if (typeof tileId !== "number") return;
                  onDoubleClickTile?.(tileId);
                }}
                onPointerOver={() => setHoveredHandIdx(idx)}
                onPointerOut={() =>
                  setHoveredHandIdx((prev) => (prev === idx ? null : prev))
                }
              >
                <pixiGraphics
                  draw={(g) => {
                    drawMahjongBlock(g, {
                      width: tileW,
                      height: tileH,
                      depthX: handDepthX,
                      depthY: handDepthY,
                      faceColor: 0xe7e8eb,
                      borderColor: highlightDiscard ? 0xea2121 : 0xb8bcc3,
                    });
                  }}
                />

                {tex ? (
                  <pixiSprite
                    texture={tex}
                    x={4}
                    y={5}
                    width={tileW - handDepthX - 8}
                    height={tileH - handDepthY - 10}
                  />
                ) : null}
              </pixiContainer>
            );
          })}

          {(() => {
            if (!melds || melds.length === 0) return null;
            let cursorX = meldsStartX;
            const baseY = rackY + 16;
            const meldDepthX = 4;
            const meldDepthY = 4;

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
                      <pixiGraphics
                        draw={(g) => {
                          drawMahjongBlock(g, {
                            width: tileW,
                            height: tileH,
                            depthX: meldDepthX,
                            depthY: meldDepthY,
                            faceColor: 0xe7e8eb,
                            borderColor: 0xb8bcc3,
                          });
                        }}
                      />

                      {tex ? (
                        <pixiSprite
                          texture={tex}
                          x={4}
                          y={5}
                          width={tileW - meldDepthX - 8}
                          height={tileH - meldDepthY - 10}
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
      </Application>
    </div>
  );
}
