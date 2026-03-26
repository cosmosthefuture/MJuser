"use client";

import Image from "next/image";
import Link from "next/link";
import { Lock, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

type ViewportState = {
  width: number;
  height: number;
};

function getViewportState(): ViewportState {
  if (typeof window === "undefined") {
    return { width: 1280, height: 720 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export default function GuestLanding() {
  const [viewport, setViewport] = useState<ViewportState>(getViewportState);

  useEffect(() => {
    const updateViewport = () => {
      setViewport(getViewportState());
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

    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
    };
  }, []);

  const isPortraitPhone =
    viewport.width < 900 && viewport.height > viewport.width;
  const isMobileStage = Math.min(viewport.width, viewport.height) < 520;

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

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#08162f] text-white">
      <div
        className="absolute left-1/2 top-1/2 overflow-hidden bg-[#0d2858] shadow-[0_0_80px_rgba(0,0,0,0.35)]"
        style={stageStyle}
      >
        <Image
          src="/images/blur-bg.jpg"
          alt="Guest landing background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,20,38,0.24)_0%,rgba(11,20,38,0.08)_26%,rgba(11,20,38,0.08)_74%,rgba(11,20,38,0.22)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,233,158,0.22),transparent_18%),linear-gradient(180deg,rgba(7,19,46,0.06)_0%,rgba(7,19,46,0.02)_44%,rgba(54,24,7,0.22)_100%)]" />

        <div className="relative z-10 flex h-full flex-col px-[3.8vw] py-[2.6vw]">
          {isMobileStage ? (
            <div className="relative flex h-full flex-1 flex-col items-center justify-start pt-[19vw]">
              <div className="w-full text-center">
                <div className="inline-flex items-end gap-[0.15vw] leading-none tracking-[-0.09em]">
                  <span className="text-[clamp(3.6rem,15vw,7.4rem)] font-black text-[#ffd257] [text-shadow:0_0.14em_0_#d1841d,0_0.24em_0_#9d4f13,0_0.34em_0.38em_rgba(85,34,9,0.34)]">
                    PLAY
                  </span>
                  <span className="ml-[0.4vw] text-[clamp(3.8rem,15.6vw,7.6rem)] font-black text-[#55d43c] [text-shadow:0_0.14em_0_#3b9f20,0_0.24em_0_#276615,0_0.34em_0.38em_rgba(20,54,11,0.34)]">
                    GO
                  </span>
                </div>

                <p className="mt-[2.2vw] text-[clamp(1.05rem,4.2vw,2rem)] font-bold text-[#ffe18a] [text-shadow:0_0.12em_0_#904510,0_0.22em_0.26em_rgba(61,24,4,0.26)]">
                  Focus on Myanmar Games 8 Years
                </p>
              </div>

              <div className="mt-[12vw] flex w-full items-center justify-center gap-[3.2vw]">
                <Link
                  href="/login"
                  aria-label="Login"
                  className="inline-flex min-w-[46vw] items-center justify-center rounded-full border border-[#92eaff] bg-[linear-gradient(180deg,#56ddfb_0%,#25b5e8_100%)] px-[5.2vw] py-[2.7vw] text-[4vw] font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.34),0_12px_28px_rgba(17,108,146,0.34)]"
                >
                  Login
                </Link>

                <Link
                  href="/signup"
                  aria-label="Sign Up"
                  className="inline-flex min-w-[46vw] items-center justify-center rounded-full border border-[#ffd18a] bg-[linear-gradient(180deg,#f2c86f_0%,#e4a446_100%)] px-[5.2vw] py-[2.7vw] text-[4vw] font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.28),0_12px_28px_rgba(129,76,20,0.34)]"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="relative flex flex-1 items-center justify-center">
                <div className="absolute left-1/2 top-[42%] w-full max-w-[58vw] -translate-x-1/2 -translate-y-1/2 text-center">
                  <div className="inline-flex items-end gap-[0.15vw] leading-none tracking-[-0.09em]">
                    <span className="text-[clamp(4rem,9.2vw,8.4rem)] font-black text-[#ffd257] [text-shadow:0_0.14em_0_#d1841d,0_0.24em_0_#9d4f13,0_0.34em_0.38em_rgba(85,34,9,0.34)]">
                      PLAY
                    </span>
                    <span className="ml-[0.4vw] text-[clamp(4.2rem,9.5vw,8.6rem)] font-black text-[#55d43c] [text-shadow:0_0.14em_0_#3b9f20,0_0.24em_0_#276615,0_0.34em_0.38em_rgba(20,54,11,0.34)]">
                      GO
                    </span>
                  </div>

                  <p className="mt-[1vw] text-[clamp(1.2rem,2.25vw,1.95rem)] font-bold text-[#ffe18a] [text-shadow:0_0.12em_0_#904510,0_0.22em_0.26em_rgba(61,24,4,0.26)]">
                    Focus on Myanmar Games 8 Years
                  </p>
                </div>

                <div className="absolute bottom-[13%] left-1/2 flex -translate-x-1/2 items-center gap-[1.5vw]">
                  <Link
                    href="/login"
                    aria-label="Login"
                    className="inline-flex min-w-[13vw] items-center justify-center gap-2 rounded-full border border-[#92eaff] bg-[linear-gradient(180deg,#56ddfb_0%,#25b5e8_100%)] px-[2.3vw] py-[1.1vw] text-[1.42vw] font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.34),0_12px_28px_rgba(17,108,146,0.34)]"
                  >
                    <UserRound className="h-[1.45vw] w-[1.45vw]" />
                    Login
                  </Link>

                  <Link
                    href="/signup"
                    aria-label="Sign Up"
                    className="inline-flex min-w-[13vw] items-center justify-center gap-2 rounded-full border border-[#ffd18a] bg-[linear-gradient(180deg,#f2c86f_0%,#e4a446_100%)] px-[2.3vw] py-[1.1vw] text-[1.42vw] font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.28),0_12px_28px_rgba(129,76,20,0.34)]"
                  >
                    <Lock className="h-[1.45vw] w-[1.45vw]" />
                    Sign Up
                  </Link>
                </div>

                <div className="absolute left-[6%] top-[24%] h-[52%] w-[18%] bg-[radial-gradient(circle,rgba(255,233,164,0.2)_0%,rgba(255,233,164,0)_68%)] blur-3xl" />
                <div className="absolute bottom-[8%] right-[7%] h-[18%] w-[20%] bg-[radial-gradient(circle,rgba(255,214,138,0.2)_0%,rgba(255,214,138,0)_72%)] blur-3xl" />
              </div>

              <div className="pointer-events-none absolute inset-y-0 left-0 w-[7%] bg-[linear-gradient(90deg,rgba(0,0,0,0.16),transparent)]" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-[7%] bg-[linear-gradient(270deg,rgba(0,0,0,0.16),transparent)]" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
