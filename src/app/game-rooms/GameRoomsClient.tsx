"use client";

import Image from "next/image";
import { skipToken } from "@reduxjs/toolkit/query";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import GuestLanding from "@/app/(home)/components/GuestLanding";
import { Button } from "@/components/ui/button";
import { useGetMahJongGameRoomsQuery } from "@/redux/features/game/GameRoomApiSlice";
import { useLogout } from "@/redux/http";
import { persistor, RootState } from "@/redux/store";
import { toast } from "sonner";

export default function GameRoomsClient() {
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

  const parsedBalance = Number(balance);
  const balanceText = Number.isFinite(parsedBalance)
    ? parsedBalance.toLocaleString()
    : balance || "0";

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

  const shell = (
    <div className="fixed inset-0 overflow-hidden bg-[#1a0f0a]">
      <div
        className={`absolute left-1/2 top-1/2 overflow-hidden transition-opacity duration-150 ${
          isViewportReady ? "opacity-100" : "opacity-0"
        }`}
        style={stageStyle}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/game-room-bg.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(33,12,5,0.64)_0%,rgba(53,18,10,0.3)_38%,rgba(44,15,8,0.24)_66%,rgba(26,9,4,0.68)_100%)]" />

        <div className="relative z-10 flex h-full items-center justify-center px-4 py-6 sm:px-6">
          <div
            className={`w-full ${isCompactStage ? "max-w-[760px]" : "max-w-[1100px]"}`}
          >
            {token && (
              <div
                className={`${
                  isCompactStage
                    ? "absolute right-14 top-3 z-20 flex items-center gap-2"
                    : "mb-4 flex items-center justify-end gap-3"
                }`}
              >
                <div
                  className={`inline-flex items-center rounded-full border border-[#b48a3b]/70 bg-[linear-gradient(180deg,rgba(37,28,17,0.94)_0%,rgba(18,14,9,0.96)_100%)] font-semibold text-[#ffe3a1] shadow-[inset_0_1px_0_rgba(255,235,178,0.1),0_10px_18px_rgba(0,0,0,0.22)] backdrop-blur-sm ${
                    isCompactStage
                      ? "px-3.5 py-1 text-[10px]"
                      : "px-4.5 py-2 text-sm"
                  }`}
                >
                  <span
                    className={`mr-2 inline-flex items-center justify-center rounded-full bg-[#d3a54c] font-black text-[#2a1c0f] ${
                      isCompactStage
                        ? "h-4 w-4 text-[9px]"
                        : "h-5 w-5 text-[10px]"
                    }`}
                  >
                    $
                  </span>
                  <span className="tracking-[0.08em]">{balanceText} MMK</span>
                </div>
                <Button
                  type="button"
                  onClick={logoutHandler}
                  className={`rounded-full border border-[#5c4a24] bg-[linear-gradient(180deg,rgba(26,24,20,0.96)_0%,rgba(12,11,9,0.98)_100%)] font-bold uppercase tracking-[0.22em] text-[#f0cd79] shadow-[inset_0_1px_0_rgba(255,235,178,0.08),0_10px_18px_rgba(0,0,0,0.24)] ${
                    isCompactStage
                      ? "h-7 px-3.5 text-[10px]"
                      : "h-10 px-5 text-sm"
                  }`}
                >
                  Logout
                </Button>
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
    return shell;
  }

  if (!token) {
    return <GuestLanding />;
  }

  return shell;
}
