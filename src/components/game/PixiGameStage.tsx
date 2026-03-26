"use client";

import React, { useEffect, useRef } from "react";
import type { Application as PixiApplication } from "pixi.js";
import type { Container as PixiContainer } from "pixi.js";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { GameState } from "@/game/engine";

interface ChipAnimState {
  amount: number;
  direction: "to-pot" | "from-pot";
  fromPosition:
    | "bottom"
    | "left-1"
    | "left-2"
    | "top-1"
    | "top-2"
    | "top-3"
    | "top-4"
    | "right-1"
    | "right-2";
  key: number;
}

interface PixiGameStageProps {
  game: GameState;
  playerIndex: number;
  showAllTiles: boolean;
  chipAnim: ChipAnimState | null;
}

export const PixiGameStage: React.FC<PixiGameStageProps> = ({
  game,
  playerIndex,
  showAllTiles,
  chipAnim,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<PixiApplication | null>(null);

  useEffect(() => {
    if (!canvasRef.current || typeof window === "undefined") return;

    let cancelled = false;

    const setup = async () => {
      if (!canvasRef.current) return;

      const { Application, Container, Graphics, Text } =
        await import("pixi.js");

      let app = appRef.current as PixiApplication | null;
      if (!app) {
        app = new Application();
        appRef.current = app;

        await app.init({
          view: canvasRef.current,
          backgroundAlpha: 0,
          antialias: true,
          resizeTo: canvasRef.current.parentElement ?? window,
        });
      }

      if (cancelled) return;

      const { renderer, stage } = app;
      const width = renderer.width;
      const height = renderer.height;
      const centerX = width / 2;
      const centerY = height / 2;

      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const getSeatPoint = (pos: ChipAnimState["fromPosition"]) => {
        const marginX = Math.max(50, width * 0.08);
        const topY = Math.max(60, height * 0.14);
        const bottomY = height - Math.max(70, height * 0.16);
        const leftX = marginX;
        const rightX = width - marginX;

        const topSpread = Math.min(170, width * 0.22);
        const sideSpread = Math.min(110, height * 0.18);

        switch (pos) {
          case "bottom":
            return { x: centerX, y: bottomY };
          case "top-1":
            return { x: centerX - topSpread * 1.2, y: topY };
          case "top-2":
            return { x: centerX - topSpread * 0.4, y: topY };
          case "top-3":
            return { x: centerX + topSpread * 0.4, y: topY };
          case "top-4":
            return { x: centerX + topSpread * 1.2, y: topY };
          case "left-1":
            return { x: leftX, y: centerY - sideSpread * 0.45 };
          case "left-2":
            return { x: leftX, y: centerY + sideSpread * 0.55 };
          case "right-1":
            return { x: rightX, y: centerY - sideSpread * 0.45 };
          case "right-2":
            return { x: rightX, y: centerY + sideSpread * 0.55 };
          default:
            return { x: centerX, y: bottomY };
        }
      };

      stage.removeChildren();

      const clamp = (v: number, min: number, max: number) =>
        Math.max(min, Math.min(max, v));

      const createGoldCoin = (radius: number) => {
        const c = new Container();

        // shadow
        const shadow = new Graphics();
        shadow.beginFill(0x000000, 0.22);
        shadow.drawEllipse(2, 3, radius * 1.02, radius * 0.78);
        shadow.endFill();
        c.addChild(shadow);

        // base
        const base = new Graphics();
        base.beginFill(0xd4af37, 1);
        base.drawCircle(0, 0, radius);
        base.endFill();
        c.addChild(base);

        // inner shade
        const shade = new Graphics();
        shade.beginFill(0xb98c1a, 0.55);
        shade.drawCircle(radius * 0.18, radius * 0.18, radius * 0.78);
        shade.endFill();
        c.addChild(shade);

        // highlight
        const hi = new Graphics();
        hi.beginFill(0xfff2b0, 0.85);
        hi.drawCircle(-radius * 0.28, -radius * 0.28, radius * 0.35);
        hi.endFill();
        c.addChild(hi);

        // rim
        const rim = new Graphics();
        rim.lineStyle(2, 0xffe08a, 0.9);
        rim.drawCircle(0, 0, radius - 1);
        c.addChild(rim);

        return c;
      };

      // Felt oval
      const felt = new Graphics();
      felt.beginFill(0x004225);
      felt.drawEllipse(centerX, centerY, width * 0.45, height * 0.42);
      felt.endFill();
      felt.lineStyle(4, 0xd4af37, 0.6);
      felt.drawEllipse(centerX, centerY, width * 0.45, height * 0.42);
      stage.addChild(felt);

      // Pot / coin pile
      const potContainer = new Container();
      potContainer.x = centerX;
      potContainer.y = centerY;

      const potScale = chipAnim ? 1.2 : 1;

      // Coin density scales with pot size (capped for perf)
      const safePot = Math.max(0, game.pot);
      const potFactor = Math.log10(Math.max(10, safePot + 10));
      const totalCoins = clamp(Math.floor(10 + potFactor * 18), 12, 90);

      const baseRadius = 16;
      const coinRadius = 9;

      const rings = clamp(Math.floor(1 + potFactor), 2, 6);
      for (let ring = 0; ring < rings; ring++) {
        const ringT = rings <= 1 ? 0 : ring / (rings - 1);
        const ringCoins = clamp(
          Math.floor((totalCoins / rings) * (0.9 + ringT * 0.35)),
          6,
          26,
        );

        const ringRadius = baseRadius + ring * 10;
        for (let i = 0; i < ringCoins; i++) {
          const angle = (Math.PI * 2 * i) / ringCoins + ring * 0.35;

          const coin = createGoldCoin(coinRadius);
          coin.x = Math.cos(angle) * ringRadius + (ring % 2 === 0 ? 0 : 2);
          coin.y = Math.sin(angle) * ringRadius * 0.62;
          coin.rotation = angle * 0.08;
          potContainer.addChild(coin);
        }
      }

      const potText = new Text(game.pot.toLocaleString(), {
        fill: 0xffffff,
        fontSize: 16,
        fontWeight: "bold",
      });
      potText.anchor.set(0.5);
      potText.y = baseRadius + 26;
      potContainer.addChild(potText);

      potContainer.scale.set(potScale);

      stage.addChild(potContainer);

      // Chip animation: flying coins from player area into the pot
      if (chipAnim) {
        const coinsContainer = new Container();
        stage.addChild(coinsContainer);

        const coins: PixiContainer[] = [];

        const start = getSeatPoint(chipAnim.fromPosition);
        const startXBase = start.x;
        const startY = start.y;

        for (let i = 0; i < 6; i++) {
          const coin = createGoldCoin(8);

          // small horizontal spread
          coin.x = startXBase + (i - 2.5) * 18;
          coin.y = startY;

          coins.push(coin);
          coinsContainer.addChild(coin);
        }

        const targetX = centerX;
        const targetY = centerY;

        // control point to form a nice arc (varies based on source)
        const controlX = (startXBase + targetX) / 2;
        const controlY = (startY + targetY) / 2 - Math.max(40, height * 0.12);

        let elapsed = 0;
        const duration = 42; // frames (~0.7s at 60fps)

        const ticker = app.ticker;
        const tick = () => {
          elapsed += 1;
          const t = Math.min(1, elapsed / duration);
          const te = easeOutCubic(t);

          coins.forEach((coin, index) => {
            const spread = (index - 2.5) * 18;
            const startX = startXBase + spread;

            // Quadratic Bezier: (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
            const omt = 1 - te;
            const bx =
              omt * omt * startX + 2 * omt * te * controlX + te * te * targetX;
            const by =
              omt * omt * startY + 2 * omt * te * controlY + te * te * targetY;

            coin.x = bx;
            coin.y = by;

            // tiny spin/scale for more life
            coin.rotation = te * 2.4 + index * 0.15;
            const s = 1 - te * 0.25;
            coin.scale.set(s);
          });

          if (t >= 1) {
            coinsContainer.removeChildren();
            stage.removeChild(coinsContainer);
            ticker.remove(tick);

            // impact pulse on pot
            let pulseElapsed = 0;
            const pulseDuration = 18;
            const baseScale = 1;
            const pulseTick = () => {
              pulseElapsed += 1;
              const pt = Math.min(1, pulseElapsed / pulseDuration);
              const bump = Math.sin(pt * Math.PI) * 0.18;
              potContainer.scale.set(baseScale + bump);
              if (pt >= 1) {
                potContainer.scale.set(baseScale);
                ticker.remove(pulseTick);
              }
            };
            ticker.add(pulseTick);
          }
        };

        ticker.add(tick);

        // floating +amount text near pot
        const chipTextContainer = new Container();
        chipTextContainer.x = centerX + 60;
        chipTextContainer.y = centerY - 40;

        const chipText = new Text(`+${chipAnim.amount}`, {
          fill: 0xffffff,
          fontSize: 14,
          fontWeight: "bold",
        });
        chipText.anchor.set(0.5);
        chipText.y = 0;
        chipTextContainer.addChild(chipText);

        stage.addChild(chipTextContainer);

        let floatElapsed = 0;
        const floatDuration = 40;
        const floatTick = () => {
          floatElapsed += 1;
          const t = Math.min(1, floatElapsed / floatDuration);
          chipTextContainer.y = centerY - 40 - t * 25;
          chipText.alpha = 1 - t;

          if (t >= 1) {
            stage.removeChild(chipTextContainer);
            ticker.remove(floatTick);
          }
        };

        ticker.add(floatTick);
      }

      // Current player's tiles along bottom
      const player = game.players[playerIndex];
      if (showAllTiles && player) {
        const tilesContainer = new Container();
        tilesContainer.x = centerX;
        tilesContainer.y = height - 80;

        const tileWidth = 46;
        const tileHeight = 72;
        const gap = 6;
        const totalWidth =
          player.tiles.length * tileWidth + (player.tiles.length - 1) * gap;
        const startX = -totalWidth / 2;

        // subtle "popup" effect based on round result
        const handScale =
          player.roundResult === "win"
            ? 1.06
            : player.roundResult === "lose"
              ? 0.94
              : 1;
        tilesContainer.scale.set(handScale);

        // helper to draw pips for a single half (value 0–6)
        const drawPips = (
          gfx: PixiGraphics,
          value: number,
          centerY: number,
          radius: number,
        ) => {
          const offsets = [
            [-1, -1],
            [1, 1],
            [-1, 1],
            [1, -1],
            [0, 0],
            [-1, 0],
            [1, 0],
          ];

          const patterns: Record<number, number[]> = {
            0: [],
            1: [4],
            2: [0, 1],
            3: [0, 4, 1],
            4: [0, 1, 2, 3],
            5: [0, 1, 2, 3, 4],
            6: [0, 1, 2, 3, 5, 6],
          };

          const indices = patterns[Math.max(0, Math.min(6, value))] || [];

          // match DominoTileComponent: 1 and 4 use red pips, others white
          const isRed = value === 1 || value === 4;
          const color = isRed ? 0xff4444 : 0xffffff;

          gfx.beginFill(color);
          indices.forEach((i) => {
            const [ox, oy] = offsets[i];
            const x = ox * (tileWidth * 0.15);
            const y = centerY + oy * (tileHeight * 0.12);
            gfx.drawCircle(x, y, radius);
          });
          gfx.endFill();
        };

        player.tiles.forEach((tile, index) => {
          const x = startX + index * (tileWidth + gap);

          const tileContainer = new Container();
          tileContainer.x = x;
          tileContainer.y = 0;

          // drop shadow
          const shadow = new Graphics();
          shadow.beginFill(0x000000, 0.35);
          shadow.drawRoundedRect(
            -tileWidth / 2 + 3,
            -tileHeight / 2 + 4,
            tileWidth,
            tileHeight,
            6,
          );
          shadow.endFill();
          tileContainer.addChild(shadow);

          // main domino body styled like DominoTileComponent (dark gradient look)
          const g = new Graphics();
          g.beginFill(0x101010);
          g.drawRoundedRect(
            -tileWidth / 2,
            -tileHeight / 2,
            tileWidth,
            tileHeight,
            6,
          );
          g.endFill();

          g.lineStyle(1.5, 0x505050, 1);
          g.drawRoundedRect(
            -tileWidth / 2,
            -tileHeight / 2,
            tileWidth,
            tileHeight,
            6,
          );

          // slim divider bar between halves
          g.lineStyle(1, 0x888888, 0.8);
          g.moveTo(-tileWidth / 2, 0);
          g.lineTo(tileWidth / 2, 0);

          // pips for top and bottom halves
          const pipGraphics = new Graphics();
          drawPips(pipGraphics, tile.top, -tileHeight * 0.22, 2.2);
          drawPips(pipGraphics, tile.bottom, tileHeight * 0.22, 2.2);

          tileContainer.addChild(g);
          tileContainer.addChild(pipGraphics);

          tilesContainer.addChild(tileContainer);
        });

        stage.addChild(tilesContainer);
      }
    };

    void setup();

    return () => {
      cancelled = true;
    };
  }, [game, playerIndex, showAllTiles, chipAnim]);

  useEffect(() => {
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};
