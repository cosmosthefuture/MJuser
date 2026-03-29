"use client";

import Image from "next/image";
import { skipToken } from "@reduxjs/toolkit/query";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import GuestLanding from "@/app/(home)/components/GuestLanding";
import PlayerNavbar from "@/components/PlayerNavbar";
import { useGetMahJongGameRoomsQuery } from "@/redux/features/game/GameRoomApiSlice";
import { persistor, RootState } from "@/redux/store";

export default function GameRoomsClient() {
  const { token, balance } = useSelector((state: RootState) => state.auth);
  const [isRehydrated, setIsRehydrated] = useState(false);
  const [isViewportReady, setIsViewportReady] = useState(false);
  const [viewport, setViewport] = useState({
    width: 1280,
    height: 720,
  });
  const { data: roomsData } = useGetMahJongGameRoomsQuery(
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
    <div className="fixed inset-0 overflow-hidden bg-[#1a0f0a]">
      <div
        className={`absolute left-1/2 top-1/2 overflow-hidden transition-opacity duration-150 ${
          isViewportReady ? "opacity-100" : "opacity-0"
        }`}
        style={stageStyle}
      >
        <div
          className="absolute inset-0 scale-[1.02] bg-cover bg-center blur-[2px]"
          style={{ backgroundImage: "url('/images/game-room-bg.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(33,12,5,0.64)_0%,rgba(53,18,10,0.3)_38%,rgba(44,15,8,0.24)_66%,rgba(26,9,4,0.68)_100%)]" />
      </div>
    </div>
  );

  const shell = (
    <div className="fixed inset-0 overflow-hidden bg-[#1a0f0a]">
      <div
        className={`absolute left-1/2 top-1/2 overflow-hidden transition-opacity duration-150 ${
          isViewportReady ? "opacity-100" : "opacity-0"
        }`}
        style={stageStyle}
      >
        <div
          className="absolute inset-0 scale-[1.02] bg-cover bg-center blur-[2px]"
          style={{ backgroundImage: "url('/images/game-room-bg.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(33,12,5,0.64)_0%,rgba(53,18,10,0.3)_38%,rgba(44,15,8,0.24)_66%,rgba(26,9,4,0.68)_100%)]" />

        <div className="relative z-10 flex h-full items-center justify-center px-4 py-6 sm:px-6">
          <div
            className={`w-full ${isCompactStage ? "max-w-[760px]" : "max-w-[1100px]"}`}
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
              {token && (
                <div
                  className={`mx-auto flex w-fit flex-wrap items-center justify-center ${
                    isCompactStage ? "gap-x-6" : "gap-x-10"
                  }`}
                >
                  {(roomsData?.data || []).map((room) => (
                    <div
                      key={room.id}
                      className="relative block h-full"
                      aria-label={room.room_name}
                    >
                      <div
                        className={`relative ${
                          isCompactStage
                            ? "h-[22rem] w-[11rem]"
                            : "h-[24rem] w-[14rem] sm:h-[26rem] sm:w-[16rem]"
                        }`}
                      >
                        <Image
                          src="/images/mj-room.png"
                          alt={room.room_name}
                          fill
                          sizes="(max-width: 640px) 180px, 260px"
                          className="object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.32)]"
                          priority
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
