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
      className="relative tile-shadow"
      style={{ width: dims.tileW, height: dims.tileH }}
    >
      <div className="absolute inset-0">
        <Image
          src="/images/mj-tile-bg.webp"
          alt="tile background"
          fill
          className="object-fill"
        />
      </div>

      <div
        className="absolute overflow-hidden"
        style={{
          left: dims.offX,
          top: dims.offY,
          width: dims.tileW - dims.sW,
          height: dims.tileH - dims.sH,
          borderRadius: 4,
        }}
      >
        <Image
          src={src}
          alt={`${tile.suit}-${tile.rank}`}
          width={dims.tileW - dims.sW}
          height={dims.tileH - dims.sH}
          className="h-full w-full object-contain"
        />
      </div>
    </div>
  );
}
