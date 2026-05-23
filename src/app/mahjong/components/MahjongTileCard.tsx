"use client";

import Image from "next/image";
import type { MahjongTile } from "@/lib/mahjong72";

function tileImageSrc(tile: MahjongTile): string {
  return tile.suit === "bamboo"
    ? `/images/MahjongRegular/bamboo${tile.rank}.png`
    : `/images/MahjongRegular/dot${tile.rank}.png`;
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
      ? { tileW: 40, tileH: 56 }
      : size === "sm"
        ? { tileW: 46, tileH: 64 }
        : { tileW: 58, tileH: 80 };

  const src = tileImageSrc(tile);

  // CSS tile frame using mj-tile-bg.webp
  return (
    <div className="relative" style={{ width: dims.tileW, height: dims.tileH }}>
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
          left: 4,
          top: 5,
          width: dims.tileW - 8,
          height: dims.tileH - 10,
          borderRadius: 4,
        }}
      >
        <Image
          src={src}
          alt={`${tile.suit}-${tile.rank}`}
          width={dims.tileW - 8}
          height={dims.tileH - 10}
          className="h-full w-full object-contain"
        />
      </div>
    </div>
  );
}
