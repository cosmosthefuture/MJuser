"use client";

import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Footer from "@/components/Footer";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { skipToken } from "@reduxjs/toolkit/query";
import { useGetWalletBalanceQuery } from "@/redux/features/game/GameRoomApiSlice";
import { useRouter, usePathname } from "next/navigation";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

const LayoutWrapper: React.FC<LayoutWrapperProps> = ({ children }) => {
  const token = useSelector((state: RootState) => state.auth.token);
  const balance = useSelector((state: RootState) => state.auth.balance);
  const router = useRouter();
  const pathname = usePathname();
  const isHomeRoute = pathname === "/";
  const isAuthRoute =
    pathname === "/login" || pathname === "/signup" || pathname === "/register";
  const isGameRoomsRoute = pathname.startsWith("/game-rooms");
  // fetch latest balance on page load/refresh; result updates auth via endpoint onQueryStarted
  useGetWalletBalanceQuery(token ? undefined : skipToken);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // For the domino game route, use a full-screen layout without the phone frame and footer
  if (pathname.startsWith("/domino") || pathname.startsWith("/mahjong")) {
    return (
      <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-[#00251b]">
        {children}
      </div>
    );
  }

  if (isHomeRoute) {
    return (
      <div className="casino-lobby-bg min-h-screen w-full overflow-hidden">
        {children}
      </div>
    );
  }

  return (
    <div className="casino-lobby-bg min-h-screen">
      <div className="mx-auto flex min-h-screen w-full items-stretch justify-center">
        <div className="casino-stage-frame relative flex min-h-screen w-full max-w-sm flex-col overflow-hidden rounded-none shadow-[0_0_60px_rgba(88,47,13,0.24)] sm:my-4 sm:min-h-[calc(100vh-2rem)] sm:rounded-[34px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.45),transparent_34%),linear-gradient(180deg,rgba(255,247,225,0.45),transparent_40%)]" />
          <div className="pointer-events-none absolute left-1/2 top-[-7rem] h-56 w-56 -translate-x-1/2 rounded-full bg-white/60 blur-3xl" />

          {!isAuthRoute && !isGameRoomsRoute && (
            <div className="relative z-10 mx-auto flex w-full flex-col px-4 pb-2 pt-5 text-[#5a3213]">
              <div className="flex items-center justify-between gap-3 rounded-[24px] border border-[#dfc390] bg-[#f9efd9]/90 px-4 py-3 shadow-[0_14px_30px_rgba(109,69,20,0.12)]">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#a06f38]">
                    Wallet Balance
                  </p>
                  <p className="mt-1 truncate text-base font-semibold text-[#5a3213]">
                    {hasMounted && balance != null ? `${balance} MMK` : "0 MMK"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/notifications")}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#dfc390] bg-[#f5e5c4] text-[#7a4b1f] transition hover:bg-[#faefd8]"
                  aria-label="Notifications"
                >
                  <Bell size={20} />
                </button>
              </div>
            </div>
          )}

          <div className="relative z-10 flex flex-1 flex-col">{children}</div>

          {!isAuthRoute && !isGameRoomsRoute && (
            <div className="sticky inset-x-0 bottom-0 z-20 mt-auto">
              <Footer />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default LayoutWrapper;
