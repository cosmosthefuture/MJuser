import MahjongTileCard from "./MahjongTileCard";

export default function FlowerTilesPanel({ isMobile }: { isMobile?: boolean }) {
  return (
    <div
      className={`flex items-center rounded-[8px] border border-[#0d9276] bg-[#022c22]/95 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all hover:border-[#0d9276] ${
        isMobile ? "gap-3 px-3 py-2" : "gap-6 px-5 py-4"
      }`}
    >
      <div
        className={`flex flex-col items-center justify-center font-black text-white tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${
          isMobile ? "text-[20px] leading-[1]" : "text-[32px] leading-[1]"
        }`}
      >
        <span>花</span>
        <span>牌</span>
      </div>
      <div className="flex items-center gap-3">
        <MahjongTileCard tile={{ suit: "dots", rank: 7 }} size={isMobile ? "xs" : "sm"} />
        <MahjongTileCard tile={{ suit: "dots", rank: 5 }} size={isMobile ? "xs" : "sm"} />
      </div>
    </div>
  );
}
