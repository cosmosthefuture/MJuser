"use client";

import Image from "next/image";
import Link from "next/link";
import { skipToken } from "@reduxjs/toolkit/query";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import GuestLanding from "@/app/(home)/components/GuestLanding";
import PlayerNavbar from "@/components/PlayerNavbar";
import { useGetMahJongGameRulesQuery } from "@/redux/features/game/GameRoomApiSlice";
import { persistor, RootState } from "@/redux/store";

export default function GameRulesClient() {
  const { token, balance } = useSelector((state: RootState) => state.auth);
  const [isRehydrated, setIsRehydrated] = useState(false);
  const [isViewportReady, setIsViewportReady] = useState(false);
  const [viewport, setViewport] = useState({
    width: 1280,
    height: 720,
  });
  const { data: rulesData } = useGetMahJongGameRulesQuery(token ? undefined : skipToken);

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
  const isCompactStage = Math.min(viewport.width, viewport.height) < 520;
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

  const loadingShell = (
    <div className="fixed inset-0 overflow-hidden bg-[#2e140d]">
      <div
        className={`absolute left-1/2 top-1/2 overflow-hidden transition-opacity duration-150 ${
          isViewportReady ? "opacity-100" : "opacity-0"
        }`}
        style={stageStyle}
      >
        <div
          className="absolute inset-0 scale-[1.02] bg-cover bg-center blur-[1px]"
          style={{ backgroundImage: "url('/images/room-bg.webp')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(73,21,10,0.14)_0%,rgba(73,21,10,0.2)_100%)]" />
      </div>
    </div>
  );

  const shell = (
    <div className="fixed inset-0 overflow-hidden bg-[#2e140d]">
      <div
        className={`absolute left-1/2 top-1/2 overflow-hidden transition-opacity duration-150 ${
          isViewportReady ? "opacity-100" : "opacity-0"
        }`}
        style={stageStyle}
      >
        <div
          className="absolute inset-0 scale-[1.02] bg-cover bg-center blur-[1px]"
          style={{ backgroundImage: "url('/images/room-bg.webp')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(73,21,10,0.14)_0%,rgba(73,21,10,0.24)_100%)]" />

        <div className="relative z-10 flex h-full items-center justify-center px-4 py-6 sm:px-6">
          <div
            className={`w-full ${isCompactStage ? "max-w-[760px]" : "max-w-[1080px]"}`}
          >
            {token && (
              <div
                className={`absolute z-20 ${
                  isCompactStage
                    ? "right-14 top-3 flex items-center gap-2"
                    : "right-6 top-5 flex items-center gap-3"
                }`}
              >
                <PlayerNavbar balance={balance} compact={isCompactStage} />
              </div>
            )}

            <div className="flex h-full items-center justify-center">
              <div
                className={`mx-auto grid place-items-center ${
                  isCompactStage ? "grid-cols-2 gap-x-6" : "grid-cols-2 gap-x-10"
                }`}
              >
                {(rulesData?.data || []).map((rule) => (
                  <Link
                    key={rule.id}
                    href={`/game-rooms?rule_id=${rule.id}`}
                    className="group block"
                    aria-label={rule.rule_name}
                  >
                    <article
                      className={`relative overflow-hidden border border-[#ffb07a]/55 bg-[linear-gradient(180deg,#ff5131_0%,#ff4a29_34%,#f7341e_62%,#f3b55d_100%)] ${
                        isCompactStage
                          ? "h-[15.2rem] w-[7.4rem] rounded-[1.6rem]"
                          : "h-[18.5rem] w-[8.9rem] rounded-[2rem]"
                      } shadow-[0_20px_26px_rgba(88,15,5,0.22)]`}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,236,171,0.22),transparent_24%),radial-gradient(circle_at_82%_82%,rgba(255,186,88,0.18),transparent_28%)]" />
                      <Image
                        src="/images/game-room.webp"
                        alt={rule.rule_name}
                        fill
                        sizes="(max-width: 640px) 130px, 180px"
                        className={`object-contain object-center transition duration-300 group-hover:scale-[1.02] ${
                          isCompactStage ? "scale-[0.86]" : "scale-[0.88]"
                        }`}
                        priority
                      />
                      <div className="absolute inset-x-0 bottom-0 top-[44%] bg-[linear-gradient(180deg,rgba(255,81,44,0)_0%,rgba(205,53,23,0.14)_26%,rgba(172,25,11,0.52)_100%)]" />
                      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-2.5 pb-3 text-center text-[#ffe2b8]">
                        <p
                          className={`font-black uppercase tracking-[0.14em] text-[#fff0d0] ${
                            isCompactStage ? "text-[0.82rem]" : "text-[0.95rem]"
                          }`}
                        >
                          {rule.rule_name}
                        </p>
                        <p
                          className={`mt-1 font-semibold text-[#ffd7ad]/95 ${
                            isCompactStage ? "text-[0.62rem]" : "text-[0.72rem]"
                          }`}
                        >
                          {rule.max_player} Players
                        </p>
                        <p
                          className={`font-semibold text-[#ffd7ad]/95 ${
                            isCompactStage ? "text-[0.62rem]" : "text-[0.72rem]"
                          }`}
                        >
                          Bet {rule.bet_amount.toLocaleString()} MMK
                        </p>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isRehydrated) {
    return loadingShell;
  }

  if (!token) {
    return <GuestLanding />;
  }

  return shell;
}
