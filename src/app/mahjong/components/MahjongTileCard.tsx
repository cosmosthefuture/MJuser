"use client";

import Image from "next/image";
import type { MahjongTile } from "@/lib/mahjong72";

function tileImageSrc(tile: MahjongTile): string {
  return tile.suit === "bamboo"
    ? `/images/MahjongRegular/bamboo${tile.rank}.webp`
    : `/images/MahjongRegular/dot${tile.rank}.webp`;
}

export default function MahjongTileCard({
  tile,
  size = "md",
}: {
  tile: MahjongTile;
  size?: "xs" | "sm" | "md";
}) {
  const dims =
    size === "xs"
      ? { tileW: 44, tileH: 60, offX: 6, offY: 12, sW: 12, sH: 18 }
      : size === "sm"
        ? { tileW: 56, tileH: 76, offX: 8, offY: 16, sW: 16, sH: 24 }
        : { tileW: 68, tileH: 94, offX: 10, offY: 20, sW: 20, sH: 32 };

  const src = tileImageSrc(tile);

  // CSS tile frame using mj-tile-bg.webp
  return (
    <div
      className="relative tile-shadow rounded-md"
      style={{ width: dims.tileW, height: dims.tileH }}
    >
      <div className="absolute inset-0">
        <Image
          src="/images/mj-tile-bg.webp"
          alt="tile background"
          fill
          className="object-fill rounded-md"
        />
      </div>

      <div
        className="absolute flex items-center justify-center"
        style={{
          left: dims.offX,
          top: dims.offY,
          width: dims.tileW - dims.sW,
          height: dims.tileH - dims.sH,
        }}
      >
        <Image
          src={src}
          alt={`${tile.suit}-${tile.rank}`}
          width={dims.tileW - dims.sW}
          height={dims.tileH - dims.sH}
          className="h-[82%] w-[82%] object-contain"
          style={{
            opacity: 0.85,
            filter:
              "drop-shadow(0px 1px 0.5px rgba(255, 255, 255, 1)) drop-shadow(0px -1px 1px rgba(0, 0, 0, 0.6))",
          }}
        />
      </div>

      {/* 3D lighting overlay on the tile face */}
      <div
        className="absolute pointer-events-none rounded-sm shadow-[inset_0_1px_4px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.1)]"
        style={{
          left: dims.offX - 1,
          top: dims.offY - 1,
          width: dims.tileW - dims.sW + 2,
          height: dims.tileH - dims.sH + 2,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0,0.05) 100%)",
        }}
      />
    </div>
  );
}
