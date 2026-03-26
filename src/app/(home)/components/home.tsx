"use client";

import Link from "next/link";
import Image from "next/image";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useEffect, useState } from "react";
import { useGetGamesQuery } from "@/redux/features/game/GameApiSlice";

type HomeModeCardProps = {
  imageSrc: string;
  alt: string;
  href?: string;
  disabled?: boolean;
};

function HomeModeCard({
  imageSrc,
  alt,
  href,
  disabled = false,
}: HomeModeCardProps) {
  const cardContent = (
    <div className="relative aspect-[16/10] w-full overflow-hidden md:aspect-[4/3]">
      <Image
        src={imageSrc}
        alt={alt}
        fill
        quality={100}
        sizes="(max-width: 767px) 88vw, (max-width: 1023px) 42vw, 28vw"
        className="object-cover object-center p-2"
      />
    </div>
  );

  if (disabled || !href) {
    return <div className="opacity-70">{cardContent}</div>;
  }

  return (
    <Link
      href={href}
      className="block transition hover:translate-y-[-2px] hover:brightness-110"
    >
      {cardContent}
    </Link>
  );
}

export default function Home() {
  const { token, balance } = useSelector((state: RootState) => state.auth);
  const [mounted, setMounted] = useState(false);
  const {
    data: gamesData,
    isLoading,
    error,
  } = useGetGamesQuery({ page: 1, per_page: 10 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const games = (gamesData?.data || []).filter((game) => game.id !== 1);
  const featuredCardGame =
    games.find((game) => game.status === "active") || games[0] || null;
  const isCardGameActive = featuredCardGame?.status === "active";
  const cardGameHref = featuredCardGame
    ? `/game-rooms?game_id=${featuredCardGame.id}`
    : "/game-rooms";
  const parsedBalance = Number(balance);
  const balanceText =
    mounted && token
      ? Number.isFinite(parsedBalance)
        ? parsedBalance.toLocaleString()
        : balance || "0"
      : "0";

  return (
    <div className="relative isolate min-h-[100dvh] w-full overflow-hidden text-white">
      <Image
        src="/images/img/bg.webp"
        alt="Neon city background"
        fill
        priority
        quality={100}
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,14,57,0.5)_0%,rgba(8,15,70,0.16)_45%,rgba(22,6,66,0.5)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#080d35]/10 via-transparent to-[#0b0f40]/50" />

      <div className="relative z-10 flex min-h-[100dvh] w-full items-stretch">
        <div className="pointer-events-none absolute -bottom-12 left-2 w-[52vw] min-w-[180px] max-w-[280px] sm:-bottom-14 sm:left-6 sm:w-[46vw] sm:max-w-[360px] md:left-8 md:w-[42vw] md:max-w-[420px] lg:left-10 lg:w-[36vw] lg:max-w-[520px]">
          <Image
            src="/images/img/carton.webp"
            alt="Mascot"
            width={380}
            height={657}
            quality={100}
            sizes="(max-width: 639px) 52vw, (max-width: 1023px) 42vw, 36vw"
            className="h-auto w-full object-contain drop-shadow-[0_25px_45px_rgba(15,5,50,0.8)]"
            priority
          />
        </div>

        <div className="ml-auto flex w-full max-w-[840px] flex-col px-3 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-6 md:px-8 md:pb-10 md:pt-8">
          <div className="flex items-start justify-end gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/35 bg-gradient-to-r from-[#5f2af7]/95 to-[#6623e7]/95 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(42,15,110,0.45)] sm:px-4 sm:py-2 sm:text-sm md:px-5 md:py-2.5 md:text-base">
              <span className="text-yellow-300">🪙</span>
              <span>{balanceText}</span>
            </div>
          </div>

          {!token && mounted && (
            <div className="mt-3 flex flex-wrap justify-end gap-2 sm:mt-4">
              <Link
                href="/login"
                className="rounded-full border border-cyan-200/35 bg-white/10 px-4 py-2 text-xs font-semibold tracking-wide text-cyan-100 transition hover:bg-white/20"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-full border border-cyan-200/35 bg-white/10 px-4 py-2 text-xs font-semibold tracking-wide text-cyan-100 transition hover:bg-white/20"
              >
                Register
              </Link>
            </div>
          )}

          <div className="my-auto w-full max-w-[330px] self-end sm:max-w-[440px] md:max-w-[620px]">
            <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2 md:gap-4">
              <HomeModeCard
                href="/mahjong"
                imageSrc="/images/img/mjlogo.png"
                alt="Mahjong Arena"
              />
              <HomeModeCard
                href={isCardGameActive ? cardGameHref : undefined}
                disabled={!isCardGameActive}
                imageSrc="/images/img/cardlogo.png"
                alt={featuredCardGame?.name || "Card Arena"}
              />
            </div>

            {isLoading && (
              <p className="mt-3 text-right text-xs text-cyan-100/75">
                Syncing game status...
              </p>
            )}

            {error && (
              <p className="mt-2 text-right text-xs text-red-200/90">
                Couldn&apos;t sync game status.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
