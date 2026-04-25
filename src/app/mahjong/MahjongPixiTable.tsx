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
  hand: MahjongTile[];
  discards: MahjongTile[];
  highlightDiscard: boolean;
  onDiscard: (index: number) => void;
  centerMessage?: string | null;
};

extend({ Container, Graphics, Sprite, Text });

const labelStyle = new TextStyle({
  fill: 0xf6e3b4,
  fontSize: 14,
  fontWeight: "600",
});

function tileSpriteFileName(t: MahjongTile): string {
  if (t.suit === "dots") return `Pin${t.rank}.png`;
  return `Sou${t.rank}.png`;
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
  discards,
  highlightDiscard,
  onDiscard,
  centerMessage = null,
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
  const gap = 8;

  const rackH = 110;
  const rackY = designHeight - rackH - 18;
  const rackX = tableX - 18;
  const rackW = tableW + 36;

  // Tile images folder (under Next.js public/):
  // public/images/MahjongRegular/Pin1.png ... Pin9.png
  // public/images/MahjongRegular/Sou1.png ... Sou9.png
  const tileSpriteBasePath = "/images/MahjongRegular";

  const neededSpritePaths = useMemo(() => {
    const paths = new Set<string>();
    for (const t of hand)
      paths.add(`${tileSpriteBasePath}/${tileSpriteFileName(t)}`);
    for (const t of discards)
      paths.add(`${tileSpriteBasePath}/${tileSpriteFileName(t)}`);
    return Array.from(paths);
  }, [hand, discards, tileSpriteBasePath]);

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

  const handTotalW = hand.length * tileW + Math.max(0, hand.length - 1) * gap;
  const handStartX = Math.max(24, Math.floor((designWidth - handTotalW) / 2));

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

              g.beginFill(wall);
              g.drawRoundedRect(
                tableX + 24,
                tableY + 10,
                tableW - 48,
                wallThickness,
                8,
              );
              g.endFill();

              g.beginFill(wall);
              g.drawRoundedRect(
                tableX + 10,
                tableY + 24,
                wallThickness,
                tableH - 48,
                8,
              );
              g.endFill();

              g.beginFill(wall);
              g.drawRoundedRect(
                tableX + tableW - wallThickness - 10,
                tableY + 24,
                wallThickness,
                tableH - 48,
                8,
              );
              g.endFill();

              g.beginFill(wall);
              g.drawRoundedRect(
                tableX + 24,
                tableY + tableH - wallThickness - 10,
                tableW - 48,
                wallThickness,
                8,
              );
              g.endFill();

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

          {/* Center "Draw Pile" panel hidden for now (dice uses center space). */}

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

              const topCount = 16;
              const smallW = 26;
              const smallH = 34;
              const topStartX = Math.floor(
                designWidth / 2 - (topCount * smallW + (topCount - 1) * 2) / 2,
              );
              const topY = tableY + 18;

              g.beginFill(back);
              for (let i = 0; i < topCount; i++) {
                g.drawRoundedRect(
                  topStartX + i * (smallW + 2),
                  topY,
                  smallW,
                  smallH,
                  4,
                );
              }
              g.endFill();

              const sideCount = 14;
              const sideXLeft = tableX + 18;
              const sideXRight = tableX + tableW - 18 - smallH;
              const sideStartY = Math.floor(
                tableY +
                  tableH / 2 -
                  (sideCount * smallW + (sideCount - 1) * 2) / 2,
              );

              g.beginFill(back);
              for (let i = 0; i < sideCount; i++) {
                g.drawRoundedRect(
                  sideXLeft,
                  sideStartY + i * (smallW + 2),
                  smallH,
                  smallW,
                  4,
                );
                g.drawRoundedRect(
                  sideXRight,
                  sideStartY + i * (smallW + 2),
                  smallH,
                  smallW,
                  4,
                );
              }
              g.endFill();

              g.lineStyle(2, edge, 1);
              for (let i = 0; i < topCount; i++) {
                g.drawRoundedRect(
                  topStartX + i * (smallW + 2),
                  topY,
                  smallW,
                  smallH,
                  4,
                );
              }
              for (let i = 0; i < sideCount; i++) {
                g.drawRoundedRect(
                  sideXLeft,
                  sideStartY + i * (smallW + 2),
                  smallH,
                  smallW,
                  4,
                );
                g.drawRoundedRect(
                  sideXRight,
                  sideStartY + i * (smallW + 2),
                  smallH,
                  smallW,
                  4,
                );
              }
            }}
          />

          {hand.map((t, idx) => {
            const x = handStartX + idx * (tileW + gap);
            const y = rackY + 16;
            const handDepthX = 4;
            const handDepthY = 4;

            const spritePath = `${tileSpriteBasePath}/${tileSpriteFileName(t)}`;
            const tex = textures[spritePath];

            return (
              <pixiContainer
                key={`${t.suit}-${t.rank}-${idx}`}
                x={x}
                y={y}
                eventMode={highlightDiscard ? "static" : "none"}
                cursor={highlightDiscard ? "pointer" : "default"}
                onPointerTap={() => {
                  if (!highlightDiscard) return;
                  onDiscard(idx);
                }}
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
        </pixiContainer>
      </Application>
    </div>
  );
}
