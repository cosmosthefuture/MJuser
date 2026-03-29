"use client";

import Image from "next/image";
import Link from "next/link";
import { Lock, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

type ViewportState = {
  width: number;
  height: number;
};

const DEFAULT_VIEWPORT: ViewportState = {
  width: 1280,
  height: 720,
};

function getViewportState(): ViewportState {
  if (typeof window === "undefined") {
    return DEFAULT_VIEWPORT;
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export default function GuestLanding() {
  const [hasMounted, setHasMounted] = useState(false);
  const [viewport, setViewport] = useState<ViewportState>(DEFAULT_VIEWPORT);

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

    setHasMounted(true);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
    };
  }, []);

  const isPortraitPhone =
    hasMounted && viewport.width < 900 && viewport.height > viewport.width;
  const isMobileStage =
    hasMounted && Math.min(viewport.width, viewport.height) < 520;

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

  const loginButtonClassName =
    "group relative inline-flex items-center justify-center overflow-hidden rounded-full border text-[#e6f8ff] transition duration-300 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#88dcff]/30";
  const loginButtonSurfaceClassName =
    "absolute inset-[1px] rounded-full bg-[linear-gradient(180deg,rgba(120,244,255,0.96)_0%,rgba(39,174,226,0.98)_46%,rgba(9,107,162,0.98)_100%)]";
  const loginButtonGlowClassName =
    "pointer-events-none absolute inset-x-[14%] top-[8%] h-[46%] rounded-full bg-[linear-gradient(180deg,rgba(173,242,255,0.36)_0%,rgba(101,208,238,0.14)_76%,transparent_100%)] opacity-90";
  const signUpButtonClassName =
    "group relative inline-flex items-center justify-center overflow-hidden rounded-full border text-white transition duration-300 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd98f]/30";
  const signUpButtonSurfaceClassName =
    "absolute inset-[1px] rounded-full bg-[linear-gradient(180deg,rgba(255,225,145,0.98)_0%,rgba(237,170,75,0.98)_42%,rgba(179,79,25,0.98)_100%)]";
  const signUpButtonGlowClassName =
    "pointer-events-none absolute inset-x-[14%] top-[8%] h-[48%] rounded-full bg-[linear-gradient(180deg,rgba(255,214,133,0.42)_0%,rgba(240,164,68,0.14)_76%,transparent_100%)] opacity-95";

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#08162f] text-white">
      <div
        className="absolute left-1/2 top-1/2 overflow-hidden bg-[#0d2858] shadow-[0_0_80px_rgba(0,0,0,0.35)]"
        style={stageStyle}
      >
        <Image
          src="/images/blur-bg-2.png"
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
                  className={`${loginButtonClassName} min-w-[46vw] border-[#99f1ff] bg-[#06324d] px-[0.9vw] py-[0.9vw] shadow-[0_16px_34px_rgba(4,35,61,0.5),0_0_24px_rgba(74,219,255,0.22)] hover:-translate-y-[0.35vw] hover:shadow-[0_22px_42px_rgba(4,35,61,0.58),0_0_32px_rgba(74,219,255,0.34)]`}
                >
                  <span className={loginButtonSurfaceClassName} />
                  <span className={loginButtonGlowClassName} />
                  <span className="absolute inset-x-[8%] bottom-[12%] h-[18%] rounded-full bg-black/18 blur-[8px]" />
                  <span className="relative z-10 flex w-full items-center justify-center gap-[2.4vw] px-[5.2vw] py-[2.7vw] text-[4vw] font-black uppercase tracking-[0.2em] text-[#ddf6ff] [text-shadow:0_0.1em_0_rgba(7,75,112,0.66)]">
                    <UserRound className="h-[4.2vw] w-[4.2vw] text-[#d2f3ff] drop-shadow-[0_2px_4px_rgba(0,0,0,0.28)]" />
                    Login
                  </span>
                </Link>

                <Link
                  href="/signup"
                  aria-label="Sign Up"
                  className={`${signUpButtonClassName} min-w-[46vw] border-[#ffd58e] bg-[#6f2f10] px-[0.9vw] py-[0.9vw] shadow-[0_18px_38px_rgba(82,39,12,0.52),0_0_26px_rgba(255,210,122,0.18)] hover:-translate-y-[0.35vw] hover:shadow-[0_24px_46px_rgba(82,39,12,0.62),0_0_34px_rgba(255,210,122,0.28)]`}
                >
                  <span className={signUpButtonSurfaceClassName} />
                  <span className={signUpButtonGlowClassName} />
                  <span className="absolute inset-x-[8%] bottom-[12%] h-[18%] rounded-full bg-black/20 blur-[8px]" />
                  <span className="relative z-10 flex w-full items-center justify-center gap-[2.4vw] px-[5.2vw] py-[2.7vw] text-[4vw] font-black uppercase tracking-[0.18em] text-[#ffe5b3] [text-shadow:0_0.1em_0_rgba(112,53,14,0.62)]">
                    <Lock className="h-[4.2vw] w-[4.2vw] text-[#ffd99a] drop-shadow-[0_2px_4px_rgba(0,0,0,0.28)]" />
                    Sign Up
                  </span>
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
                    className={`${loginButtonClassName} min-w-[13vw] gap-2 border-[#99f1ff] bg-[#06324d] px-[0.22vw] py-[0.22vw] shadow-[0_14px_30px_rgba(4,35,61,0.52),0_0_22px_rgba(74,219,255,0.22)] hover:-translate-y-[0.18vw] hover:shadow-[0_20px_38px_rgba(4,35,61,0.6),0_0_28px_rgba(74,219,255,0.3)]`}
                  >
                    <span className={loginButtonSurfaceClassName} />
                    <span className={loginButtonGlowClassName} />
                    <span className="absolute inset-x-[9%] bottom-[12%] h-[20%] rounded-full bg-black/18 blur-[7px]" />
                    <span className="relative z-10 flex w-full items-center justify-center gap-[0.7vw] px-[2.3vw] py-[1.1vw] text-[1.42vw] font-black uppercase tracking-[0.18em] text-[#ddf6ff] [text-shadow:0_0.1em_0_rgba(7,75,112,0.66)]">
                      <UserRound className="h-[1.45vw] w-[1.45vw] text-[#d2f3ff] drop-shadow-[0_2px_4px_rgba(0,0,0,0.28)]" />
                      Login
                    </span>
                  </Link>

                  <Link
                    href="/signup"
                    aria-label="Sign Up"
                    className={`${signUpButtonClassName} min-w-[13vw] gap-2 border-[#ffd58e] bg-[#6f2f10] px-[0.22vw] py-[0.22vw] shadow-[0_16px_34px_rgba(82,39,12,0.54),0_0_24px_rgba(255,210,122,0.18)] hover:-translate-y-[0.18vw] hover:shadow-[0_22px_40px_rgba(82,39,12,0.62),0_0_30px_rgba(255,210,122,0.26)]`}
                  >
                    <span className={signUpButtonSurfaceClassName} />
                    <span className={signUpButtonGlowClassName} />
                    <span className="absolute inset-x-[9%] bottom-[12%] h-[20%] rounded-full bg-black/20 blur-[7px]" />
                    <span className="relative z-10 flex w-full items-center justify-center gap-[0.7vw] px-[2.3vw] py-[1.1vw] text-[1.42vw] font-black uppercase tracking-[0.16em] text-[#ffe5b3] [text-shadow:0_0.1em_0_rgba(112,53,14,0.62)]">
                      <Lock className="h-[1.45vw] w-[1.45vw] text-[#ffd99a] drop-shadow-[0_2px_4px_rgba(0,0,0,0.28)]" />
                      Sign Up
                    </span>
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
