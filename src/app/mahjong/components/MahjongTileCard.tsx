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
      ? { tileW: 44, tileH: 60 }
      : size === "sm"
        ? { tileW: 56, tileH: 76 }
        : { tileW: 68, tileH: 94 };

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
          left: 8,
          top: 12,
          width: dims.tileW - 16,
          height: dims.tileH - 24,
          borderRadius: 4,
        }}
      >
        <Image
          src={src}
          alt={`${tile.suit}-${tile.rank}`}
          width={dims.tileW - 16}
          height={dims.tileH - 24}
          className="h-full w-full object-contain"
        />
      </div>
    </div>
  );
}
