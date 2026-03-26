"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AuthStageProps = {
  children: React.ReactNode;
  eyebrow: string;
  linkHref: string;
  linkLabel: string;
  linkPrompt: string;
  subtitle: string;
  title: string;
};

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

export default function AuthStage({
  children,
  eyebrow,
  linkHref,
  linkLabel,
  linkPrompt,
  subtitle,
  title,
}: AuthStageProps) {
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

  const isPortraitPhone = viewport.width < 900 && viewport.height > viewport.width;
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
    <div className="fixed inset-0 z-30 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.5),transparent_36%),linear-gradient(180deg,#f6e8cb_0%,#d79a59_100%)] text-[#4e290d]">
      <div
        className="absolute left-1/2 top-1/2 overflow-hidden"
        style={stageStyle}
      >
        <div className="h-full overflow-y-auto">
          <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-sm flex-1 flex-col justify-center px-4 py-8">
            <div className="relative overflow-hidden rounded-[38px] border border-[#d7b376] bg-[#f8edd7]/95 p-3 shadow-[0_30px_80px_rgba(116,72,18,0.24)]">
              <div className="pointer-events-none absolute inset-x-12 top-0 h-20 rounded-b-[36px] bg-gradient-to-b from-white/80 to-transparent" />

              <div className="relative rounded-[32px] border border-[#ecd7ab] bg-[#fff8ea]/92 p-4">
                <Link
                  href="/"
                  className="inline-flex items-center rounded-full border border-[#ddbf89] bg-[#f4e3bf] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#946632] transition hover:bg-[#f7ebd1]"
                >
                  Back To Lobby
                </Link>

                <div className="mt-4 rounded-[30px] border border-[#2d5137] felt-panel p-5 text-[#fff8e1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_40px_rgba(16,35,20,0.25)]">
                  <div className="rounded-[24px] border border-white/10 bg-black/10 p-5 backdrop-blur-[2px]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#f1d58d]">
                      {eyebrow}
                    </p>
                    <h1 className="mt-3 text-[2.1rem] font-semibold leading-none tracking-[-0.03em] text-[#fff8ea]">
                      {title}
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-[#efe1bc]">
                      {subtitle}
                    </p>

                    <div className="mt-6">{children}</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-[22px] border border-[#e7d2a8] bg-[#f4e5c3]/95 px-4 py-3 text-sm text-[#704826]">
                  <span>{linkPrompt}</span>
                  <Link
                    href={linkHref}
                    className="font-semibold text-[#9b2c35] transition hover:text-[#7b1e26]"
                  >
                    {linkLabel}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
