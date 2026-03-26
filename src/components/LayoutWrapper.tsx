"use client";

import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Footer from "@/components/Footer";
import Image from "next/image";
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
  // fetch latest balance on page load/refresh; result updates auth via endpoint onQueryStarted
  useGetWalletBalanceQuery(token ? undefined : skipToken);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // For the domino game route, use a full-screen layout without the phone frame and footer
  if (pathname.startsWith("/domino") || pathname.startsWith("/mahjong")) {
    return (
      <div className="w-screen h-screen bg-[#00251b] flex items-center justify-center overflow-hidden">
        {children}
      </div>
    );
  }

  if (isHomeRoute) {
    return (
      <div className="min-h-screen w-full overflow-hidden bg-[#070e3b]">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className=" bg-black flex items-center justify-center">
        <div className="relative flex min-h-screen w-full max-w-sm flex-col overflow-hidden rounded-none shadow-[0_0_60px_rgba(0,0,0,0.6)]">
          <Image
            src="/images/bg-one.png"
            alt="Golden glow"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#260400]/70 via-[#2a0500]/80 to-[#3c0505] opacity-95" />

          <div className="relative z-10 mx-auto flex w-full flex-1 flex-col items-center px-5 py-5 text-amber-100">
            <div className="flex w-full items-center justify-between text-amber-200/80">
              <div className="flex text-sm font-medium">
                <span className="pt-1 text-xs uppercase tracking-[0.2em] text-amber-200/70">
                  Balance
                </span>
                <div className="text-base pl-2 font-semibold text-amber-100">
                  {hasMounted && balance != null ? `${balance} MMK` : ""}
                </div>
              </div>
              {/* <div className="text-center text-sm uppercase tracking-[0.3em] text-amber-200/80">
              Spin Wheel
            </div> */}
              <button
                type="button"
                onClick={() => router.push("/notifications")}
                className="rounded-full p-1 text-amber-200/80 transition hover:bg-white/5 hover:text-amber-200"
                aria-label="Notifications"
              >
                <Bell size={22} />
              </button>
            </div>
          </div>
          {children}
          <div className="fixed inset-x-0 bottom-0 z-50">
            <div className="mx-auto w-full max-w-sm">
              <Footer />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LayoutWrapper;
