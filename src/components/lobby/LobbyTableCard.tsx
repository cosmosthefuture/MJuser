import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLobbyTheme } from "./lobbyTheme";

type LobbyTableCardProps = {
  actionLabel?: string;
  badge: string;
  disabled?: boolean;
  eyebrow: string;
  href?: string;
  imageAlt: string;
  imageSrc: string;
  stats?: Array<{
    label: string;
    value: string;
  }>;
  subtitle: string;
  themeIndex?: number;
  title: string;
};

const seatPositions = [
  "left-4 top-1/2 -translate-y-1/2",
  "left-10 top-6",
  "left-10 bottom-6",
  "right-4 top-1/2 -translate-y-1/2",
  "right-10 top-6",
  "right-10 bottom-6",
];

export default function LobbyTableCard({
  actionLabel,
  badge,
  disabled = false,
  eyebrow,
  href,
  imageAlt,
  imageSrc,
  stats = [],
  subtitle,
  themeIndex = 0,
  title,
}: LobbyTableCardProps) {
  const theme = getLobbyTheme(themeIndex);
  const isActive = !!href && !disabled;

  const card = (
    <article
      className={cn(
        "relative overflow-hidden rounded-[34px] border border-[#d8bb83] bg-[#f8edd5]/95 p-3 shadow-[0_24px_60px_rgba(112,69,20,0.18)] transition duration-300",
        isActive && "hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(112,69,20,0.24)]",
      )}
    >
      <div className="pointer-events-none absolute inset-x-10 top-0 h-16 rounded-b-[28px] bg-gradient-to-b from-white/70 to-transparent" />

      <div className="relative rounded-[28px] border border-[#ecd8b0] bg-[#fff8e9]/88 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#b07c3e]">
              {eyebrow}
            </p>
            <h3 className="mt-2 text-[1.65rem] font-semibold leading-none tracking-[-0.02em] text-[#4d2509]">
              {title}
            </h3>
            <p className="mt-2 max-w-[22rem] text-sm leading-6 text-[#81542a]">
              {subtitle}
            </p>
          </div>

          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]",
              theme.badge,
            )}
          >
            {badge}
          </span>
        </div>

        <div className="mt-4 rounded-[30px] border border-[#eedab7] bg-[#f7ecd8] p-3">
          <div
            className={cn(
              "relative h-44 overflow-hidden rounded-[28px] border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
              theme.table,
            )}
          >
            <div
              className={cn(
                "absolute left-1/2 top-4 h-10 w-40 -translate-x-1/2 rounded-full blur-2xl",
                theme.glow,
              )}
            />
            <div
              className={cn(
                "absolute inset-x-6 top-4 h-5 rounded-full bg-gradient-to-r opacity-70",
                theme.rail,
              )}
            />
            <div className="absolute left-1/2 top-1/2 h-24 w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-black/10 shadow-[inset_0_10px_24px_rgba(255,255,255,0.08)]" />

            {seatPositions.map((position) => (
              <span
                key={position}
                className={cn(
                  "absolute h-7 w-7 rounded-full border border-black/10 shadow-[0_6px_16px_rgba(0,0,0,0.12)]",
                  position,
                  theme.seat,
                )}
              />
            ))}

            <div
              className={cn(
                "absolute bottom-4 left-5 rounded-full px-3 py-1 text-xs font-semibold shadow-[0_10px_20px_rgba(0,0,0,0.16)]",
                theme.chip,
              )}
            >
              2000
            </div>
            <div
              className={cn(
                "absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-semibold shadow-[0_10px_20px_rgba(0,0,0,0.16)]",
                theme.chip,
              )}
            >
              Live
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/12 ring-1 ring-white/25 backdrop-blur-[1px]">
                <Image
                  src={imageSrc}
                  alt={imageAlt}
                  width={84}
                  height={84}
                  className="h-16 w-16 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.28)]"
                />
              </div>
            </div>
          </div>
        </div>

        {stats.length > 0 && (
          <div
            className={cn(
              "mt-4 grid gap-2",
              stats.length === 1 && "grid-cols-1",
              stats.length === 2 && "grid-cols-2",
              stats.length >= 3 && "grid-cols-3",
            )}
          >
            {stats.map((stat) => (
              <div
                key={`${stat.label}-${stat.value}`}
                className="rounded-[20px] border border-[#ead4ac] bg-[#f4e4c0]/85 px-3 py-2"
              >
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#aa7a3f]">
                  {stat.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#553019]">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs leading-5 text-[#9b6f42]">
            {isActive
              ? "Enter the table and join the next available round."
              : "This table is not available yet."}
          </p>

          <div
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-[0_16px_30px_rgba(48,25,8,0.2)]",
              isActive ? theme.button : "bg-[#d5c3a4] text-[#7f6744]",
            )}
          >
            {isActive ? <ArrowRight size={16} /> : <Lock size={16} />}
            <span>{actionLabel || (isActive ? "Enter Table" : "Locked")}</span>
          </div>
        </div>
      </div>
    </article>
  );

  if (!isActive) {
    return <div className="block opacity-90">{card}</div>;
  }

  return (
    <Link href={href} className="block">
      {card}
    </Link>
  );
}
