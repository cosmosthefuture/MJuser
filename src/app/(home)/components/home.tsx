"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import LobbyTableCard from "@/components/lobby/LobbyTableCard";
import GuestLanding from "./GuestLanding";
import {
  getGamePresentation,
  getStatusLabel,
} from "@/components/lobby/lobbyTheme";
import { persistor, RootState } from "@/redux/store";
import { useGetGamesQuery, type Game } from "@/redux/features/game/GameApiSlice";

function getLobbyGames(apiGames: Game[]) {
  const gameMap = new Map<number, Game>();

  gameMap.set(1, {
    created_at: "",
    deleted_at: null,
    id: 1,
    name: "Mahjong",
    status: "active",
    updated_at: "",
  });

  apiGames.forEach((game) => {
    gameMap.set(game.id, game);
  });

  return Array.from(gameMap.values()).slice(0, 4);
}

export default function Home() {
  const { token, balance } = useSelector((state: RootState) => state.auth);
  const [mounted, setMounted] = useState(false);
  const [isRehydrated, setIsRehydrated] = useState(() =>
    persistor.getState().bootstrapped,
  );
  const {
    data: gamesData,
    isLoading,
    error,
  } = useGetGamesQuery(token ? { page: 1, per_page: 10 } : skipToken);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (persistor.getState().bootstrapped) {
      setIsRehydrated(true);
      return;
    }

    const unsubscribe = persistor.subscribe(() => {
      if (persistor.getState().bootstrapped) {
        setIsRehydrated(true);
        unsubscribe();
      }
    });

    return unsubscribe;
  }, []);

  const parsedBalance = Number(balance);
  const balanceText =
    mounted && token
      ? Number.isFinite(parsedBalance)
        ? parsedBalance.toLocaleString()
        : balance || "0"
      : "0";

  const lobbyGames = getLobbyGames(gamesData?.data || []);

  if (!isRehydrated) {
    return null;
  }

  if (!token) {
    return <GuestLanding />;
  }

  return (
    <div className="relative isolate min-h-[100dvh] overflow-hidden text-[#4f2809]">
      <div className="casino-lobby-bg absolute inset-0" />
      <div className="absolute left-[-5rem] top-28 h-52 w-52 rounded-full bg-white/55 blur-3xl" />
      <div className="absolute right-[-3rem] top-10 h-44 w-44 rounded-full bg-[#fff4d5]/70 blur-3xl" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-[linear-gradient(180deg,rgba(255,246,227,0)_0%,rgba(157,97,40,0.18)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 pb-10 pt-5 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-3">
          <div className="rounded-full border border-[#dcc08a] bg-[#fff4dc]/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#a47034] shadow-[0_12px_28px_rgba(120,74,20,0.08)]">
            Royal Lobby
          </div>

          <div className="rounded-full border border-[#dcc08a] bg-[#f8ebcc]/92 px-4 py-2 text-sm font-semibold text-[#6a3d17] shadow-[0_12px_28px_rgba(120,74,20,0.08)]">
            {balanceText} MMK
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.94fr_1.06fr] lg:items-center">
          <section className="relative">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-[#ae7737]">
                Table Selection
              </p>
              <h1 className="mt-4 text-[3rem] font-semibold leading-[0.95] tracking-[-0.05em] text-[#4d2509] sm:text-[4rem]">
                Choose a table
                <br />
                built to feel live.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-[#80522a]">
                The lobby now follows the reference direction: warm cream
                surfaces, bold felt tables, and clear table-first actions for
                every mode.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {!token && mounted ? (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-full bg-[#9b2c35] px-5 py-3 text-sm font-semibold text-[#fff7e4] shadow-[0_18px_36px_rgba(100,33,21,0.22)] transition hover:brightness-105"
                  >
                    <LogIn size={16} />
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 rounded-full border border-[#d8b57d] bg-[#fff3db]/95 px-5 py-3 text-sm font-semibold text-[#704220] transition hover:bg-[#fff7e8]"
                  >
                    Register
                    <ArrowRight size={16} />
                  </Link>
                </>
              ) : (
                <Link
                  href="/wallet"
                  className="inline-flex items-center gap-2 rounded-full bg-[#9b2c35] px-5 py-3 text-sm font-semibold text-[#fff7e4] shadow-[0_18px_36px_rgba(100,33,21,0.22)] transition hover:brightness-105"
                >
                  Wallet
                  <ArrowRight size={16} />
                </Link>
              )}

              <div className="rounded-[22px] border border-[#dcc08a] bg-[#fff4dc]/90 px-4 py-3 text-sm text-[#7a4c22] shadow-[0_14px_32px_rgba(112,69,20,0.08)]">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-[#ab7437]">
                  Visible Tables
                </span>
                <span className="mt-1 block text-lg font-semibold text-[#51290b]">
                  {lobbyGames.length}
                </span>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:max-w-md">
              <div className="rounded-[24px] border border-[#dcc08a] bg-[#f9edd5]/92 px-4 py-4 shadow-[0_12px_30px_rgba(112,69,20,0.08)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#ad7538]">
                  Mood
                </p>
                <p className="mt-2 text-sm leading-6 text-[#684120]">
                  Cream lobby outside, rich felt tables inside.
                </p>
              </div>
              <div className="rounded-[24px] border border-[#dcc08a] bg-[#f9edd5]/92 px-4 py-4 shadow-[0_12px_30px_rgba(112,69,20,0.08)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#ad7538]">
                  Entry
                </p>
                <p className="mt-2 text-sm leading-6 text-[#684120]">
                  Clear status, direct access, and room-first navigation.
                </p>
              </div>
            </div>

            <div className="pointer-events-none relative mt-10 hidden h-52 w-full max-w-[20rem] lg:block">
              <Image
                src="/images/img/carton.webp"
                alt="Lobby mascot"
                fill
                sizes="320px"
                className="object-contain object-left-bottom drop-shadow-[0_18px_30px_rgba(84,49,15,0.22)]"
                priority
              />
            </div>
          </section>

          <section className="relative">
            <div className="grid gap-4 sm:grid-cols-2">
              {lobbyGames.map((game, index) => {
                const presentation = getGamePresentation(game.id, game.name);
                const statusLabel = getStatusLabel(game.status);
                const disabled = game.id !== 1 && statusLabel !== "Open";

                return (
                  <LobbyTableCard
                    key={`${game.id}-${game.name}`}
                    actionLabel={
                      disabled
                        ? "Coming Soon"
                        : game.id === 1
                          ? "Open Mahjong"
                          : "View Tables"
                    }
                    badge={statusLabel}
                    disabled={disabled}
                    eyebrow={presentation.eyebrow}
                    href={disabled ? undefined : presentation.href}
                    imageAlt={presentation.imageAlt}
                    imageSrc={presentation.imageSrc}
                    stats={[
                      {
                        label: "Format",
                        value: presentation.eyebrow,
                      },
                      {
                        label: "Access",
                        value: statusLabel,
                      },
                    ]}
                    subtitle={presentation.subtitle}
                    themeIndex={index}
                    title={game.name}
                  />
                );
              })}
            </div>

            {isLoading && (
              <p className="mt-4 text-right text-sm text-[#8b6031]">
                Refreshing live tables...
              </p>
            )}

            {error && (
              <p className="mt-4 text-right text-sm text-[#9b2c35]">
                Couldn&apos;t refresh the lobby right now.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
