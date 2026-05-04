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
      ? { tileW: 40, tileH: 56, depthX: 3, depthY: 3, radius: 10 }
      : size === "sm"
      ? { tileW: 46, tileH: 64, depthX: 3, depthY: 3, radius: 10 }
      : { tileW: 58, tileH: 80, depthX: 4, depthY: 4, radius: 12 };

  const faceW = dims.tileW - dims.depthX;
  const faceH = dims.tileH - dims.depthY;
  const splitX = Math.max(1, dims.depthX / 2);
  const splitY = Math.max(1, dims.depthY / 2);

  const src = tileImageSrc(tile);

  // CSS tile frame intended to match Pixi's drawMahjongBlock (shadow + 2-layer thickness).
  return (
    <div
      className="relative"
      style={{ width: dims.tileW, height: dims.tileH }}
    >
      <div
        className="absolute rounded-[12px] bg-black/10"
        style={{
          left: dims.depthX + 1,
          top: dims.depthY + 2,
          width: faceW,
          height: faceH,
          borderRadius: dims.radius + 1,
        }}
      />
      <div
        className="absolute rounded-[12px] bg-black/5"
        style={{
          left: dims.depthX + 2,
          top: dims.depthY + 3,
          width: faceW - 2,
          height: faceH - 2,
          borderRadius: dims.radius,
        }}
      />

      <div
        className="absolute bg-[#c4ccd8]"
        style={{
          left: splitX,
          top: splitY,
          width: faceW,
          height: faceH,
          borderRadius: dims.radius,
          opacity: 0.98,
        }}
      />
      <div
        className="absolute bg-[#29a74e]"
        style={{
          left: dims.depthX,
          top: dims.depthY,
          width: faceW,
          height: faceH,
          borderRadius: dims.radius,
          opacity: 0.98,
        }}
      />

      <div
        className="absolute bg-[#e7e8eb]"
        style={{
          left: 0,
          top: 0,
          width: faceW,
          height: faceH,
          borderRadius: dims.radius,
        }}
      />
      <div
        className="absolute rounded-[12px] ring-1 ring-[#b8bec8]/80"
        style={{
          left: 0,
          top: 0,
          width: faceW,
          height: faceH,
          borderRadius: dims.radius,
        }}
      />

      <div
        className="absolute overflow-hidden bg-white"
        style={{
          left: 4,
          top: 5,
          width: faceW - 8,
          height: faceH - 10,
          borderRadius: Math.max(2, dims.radius - 3),
        }}
      >
        <Image
          src={src}
          alt={`${tile.suit}-${tile.rank}`}
          width={faceW - 8}
          height={faceH - 10}
          className="h-full w-full object-contain"
        />
      </div>
    </div>
  );
}
