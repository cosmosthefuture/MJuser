"use client";

import Image from "next/image";
import Link from "next/link";
import { skipToken } from "@reduxjs/toolkit/query";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import GuestLanding from "./GuestLanding";
import { Button } from "@/components/ui/button";
import { persistor, RootState } from "@/redux/store";
import {
  useGetGamesQuery,
  type Game,
} from "@/redux/features/game/GameApiSlice";
import { useLogout } from "@/redux/http";
import { toast } from "sonner";

type ShowcaseGame = {
  artworkAlt: string;
  artworkSrc: string;
  href?: string;
  imageClassName?: string;
  title: string;
};

function getShowcaseGames(apiGames: Game[]): ShowcaseGame[] {
  const ordered = [...apiGames].sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    const getRank = (name: string) => {
      if (name.includes("mah jong") || name.includes("mahjong")) return 1;
      if (name.includes("shan")) return 2;
      return 99;
    };

    return getRank(aName) - getRank(bName);
  });

  return ordered.slice(0, 2).map((game) => {
    const normalizedName = game.name.toLowerCase();
    const isMahjong =
      normalizedName.includes("mah jong") || normalizedName.includes("mahjong");
    const isShan = normalizedName.includes("shan");
    const isActive = game.status.toLowerCase() === "active";

    if (isMahjong) {
      return {
        artworkAlt: "Mah Jong game",
        artworkSrc: "/images/img/mjlogo.png",
        href: isActive ? `/game-rooms?game_id=${game.id}` : undefined,
        imageClassName: "-translate-x-[6%]",
        title: game.name,
      };
    }

    if (isShan) {
      return {
        artworkAlt: "Shan Koe Mee card game",
        artworkSrc: "/images/img/cardlogo.png",
        href: isActive ? `/game-rooms?game_id=${game.id}` : undefined,
        title: game.name,
      };
    }

    return {
      artworkAlt: game.name,
      artworkSrc: "/images/img/cardlogo.png",
      href: isActive ? `/game-rooms?game_id=${game.id}` : undefined,
      title: game.name,
    };
  });
}

export default function Home() {
  const { token, balance } = useSelector((state: RootState) => state.auth);
  const [isRehydrated, setIsRehydrated] = useState(
    () => persistor.getState().bootstrapped,
  );
  const [isViewportReady, setIsViewportReady] = useState(
    typeof window !== "undefined",
  );
  const [viewport, setViewport] = useState(() => ({
    width:
      typeof window !== "undefined"
        ? (window.visualViewport?.width ?? window.innerWidth)
        : 1280,
    height:
      typeof window !== "undefined"
        ? (window.visualViewport?.height ?? window.innerHeight)
        : 720,
  }));
  const logout = useLogout();

  const { data: gamesData } = useGetGamesQuery(
    token ? { page: 1, per_page: 10 } : skipToken,
  );

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

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.visualViewport?.width ?? window.innerWidth,
        height: window.visualViewport?.height ?? window.innerHeight,
      });
      setIsViewportReady(true);
    };

    const orientationApi = screen.orientation as ScreenOrientation & {
      lock?: (orientation: "landscape") => Promise<void>;
    };

    if (typeof orientationApi.lock === "function") {
      void orientationApi.lock("landscape").catch(() => undefined);
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
    };
  }, []);

  const isPortraitPhone =
    viewport.width < 900 && viewport.height > viewport.width;
  const stageStyle = isPortraitPhone
    ? {
        width: `${viewport.height}px`,
        height: `${viewport.width}px`,
        transform: "translate(-50%, -50%) rotate(90deg)",
        transformOrigin: "center center",
      }
    : {
        width: "100vw",
        height: "100dvh",
        transform: "translate(-50%, -50%)",
      };

  if (!isRehydrated) {
    return (
      <div className="fixed inset-0 overflow-hidden bg-[#1a0f0a]">
        <div
          className={`absolute left-1/2 top-1/2 overflow-hidden transition-opacity duration-150 ${
            isViewportReady ? "opacity-100" : "opacity-0"
          }`}
          style={stageStyle}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/images/home-bg.png')" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(33,12,5,0.7)_0%,rgba(53,18,10,0.38)_38%,rgba(44,15,8,0.32)_66%,rgba(26,9,4,0.72)_100%)]" />
        </div>
      </div>
    );
  }

  if (!token) {
    return <GuestLanding />;
  }

  const parsedBalance = Number(balance);
  const balanceText = Number.isFinite(parsedBalance)
    ? parsedBalance.toLocaleString()
    : balance || "0";
  const showcaseGames = getShowcaseGames(gamesData?.data || []);
  const isCompactStage = Math.min(viewport.width, viewport.height) < 520;

  async function logoutHandler() {
    try {
      await logout();
      toast.success("You have been logged out successfully.");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(`Logout failed: ${error.response.data.message}`);
      } else {
        toast.error("An unknown error occurred during logout.");
      }
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#1a0f0a]">
      <div
        className={`absolute left-1/2 top-1/2 overflow-hidden transition-opacity duration-150 ${
          isViewportReady ? "opacity-100" : "opacity-0"
        }`}
        style={stageStyle}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/home-bg.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(33,12,5,0.7)_0%,rgba(53,18,10,0.38)_38%,rgba(44,15,8,0.32)_66%,rgba(26,9,4,0.72)_100%)]" />

        <div className="relative z-10 flex h-full items-center justify-center px-4 py-6 sm:px-6">
          <div
            className={`w-full ${isCompactStage ? "max-w-[760px]" : "max-w-[1100px]"}`}
          >
            <div
              className={`${
                isCompactStage
                  ? "absolute right-14 top-3 z-20 flex items-center gap-2"
                  : "mb-4 flex items-center justify-end gap-3"
              }`}
            >
              <div
                className={`rounded-full border border-white/10 bg-black/28 font-semibold text-[#ffe9ae] backdrop-blur-sm ${
                  isCompactStage ? "px-3 py-1 text-[10px]" : "px-4 py-2 text-sm"
                }`}
              >
                {balanceText} MMK
              </div>
              <Button
                type="button"
                onClick={logoutHandler}
                className={`rounded-full border border-[#8c6a2e] bg-[#2a2418] font-bold uppercase tracking-[0.18em] text-[#f3d58b] shadow-none ${
                  isCompactStage ? "h-7 px-3 text-[10px]" : "h-10 px-5 text-sm"
                }`}
              >
                Logout
              </Button>
            </div>

            <div
              className={`grid items-center ${
                isCompactStage
                  ? "grid-cols-[1.18fr_0.82fr] gap-0"
                  : "gap-4 lg:grid-cols-[1.18fr_0.82fr]"
              }`}
            >
              <div
                className={`relative mx-auto w-full ${
                  isCompactStage
                    ? "mt-[11rem] h-[31rem] max-w-[31rem]"
                    : "mt-[7rem] h-[28rem] max-w-[28rem] self-end sm:mt-[8rem] sm:h-[36rem] sm:max-w-[36rem]"
                }`}
              >
                <Image
                  src="/images/img/carton.webp"
                  alt="Lobby sticker"
                  fill
                  sizes="(max-width: 640px) 220px, 320px"
                  className="object-contain object-bottom drop-shadow-[0_24px_34px_rgba(0,0,0,0.34)]"
                  priority
                />
              </div>

              <div
                className={`grid ${
                  isCompactStage
                    ? "grid-cols-2 items-center gap-x-6 gap-y-0"
                    : "grid-cols-2 items-center gap-2"
                }`}
              >
                {showcaseGames.map((game) => {
                  const card = (
                    <article className="relative h-full overflow-hidden">
                      <div
                        className={`relative flex h-full items-center justify-center ${
                          isCompactStage
                            ? "min-h-[24rem]"
                            : "min-h-[20rem] sm:min-h-[24rem]"
                        }`}
                      >
                        <Image
                          src={game.artworkSrc}
                          alt={game.artworkAlt}
                          fill
                          sizes="(max-width: 640px) 180px, 280px"
                          className={`object-contain drop-shadow-[0_14px_22px_rgba(0,0,0,0.28)] ${game.imageClassName || ""} ${
                            isCompactStage ? "scale-[1.12] p-0" : ""
                          }`}
                        />
                      </div>
                    </article>
                  );

                  if (!game.href) {
                    return <div key={game.title}>{card}</div>;
                  }

                  return (
                    <Link key={game.title} href={game.href} className="block">
                      {card}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
