"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useState } from "react";

type AuthStageProps = {
  children: React.ReactNode;
  compactMobile?: boolean;
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

const DEFAULT_VIEWPORT: ViewportState = {
  width: 1280,
  height: 720,
};

function getViewportState(): ViewportState {
  if (typeof window === "undefined") {
    return DEFAULT_VIEWPORT;
  }

  const visualViewport = window.visualViewport;

  return {
    width: visualViewport?.width ?? window.innerWidth,
    height: visualViewport?.height ?? window.innerHeight,
  };
}

export default function AuthStage({
  children,
  compactMobile = false,
  eyebrow,
  linkHref,
  linkLabel,
  linkPrompt,
  title,
}: AuthStageProps) {
  const [isViewportReady, setIsViewportReady] = useState(
    typeof window !== "undefined",
  );
  const [viewport, setViewport] = useState<ViewportState>(() =>
    getViewportState(),
  );

  useLayoutEffect(() => {
    const updateViewport = () => {
      setViewport(getViewportState());
      setIsViewportReady(true);
    };

    updateViewport();
  }, []);

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

  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-[#08162f] text-[#4e290d]">
      <div
        className={`absolute left-1/2 top-1/2 overflow-hidden transition-opacity duration-150 ${
          isViewportReady ? "opacity-100" : "opacity-0"
        }`}
        style={stageStyle}
      >
        <Image
          src="/images/blur-bg-2.png"
          alt="Auth background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,14,6,0.4)_0%,rgba(18,14,6,0.28)_42%,rgba(18,14,6,0.48)_100%)]" />

        <div className="h-full overflow-y-auto">
          <div
            className={`relative z-10 mx-auto flex min-h-full w-full max-w-[25rem] flex-1 flex-col justify-center px-4 ${
              compactMobile ? "py-3 sm:py-6" : "py-6"
            }`}
          >
            <div className="relative p-0">
              <div className="relative p-0">
                <div className="rounded-[28px] border border-[#3f3624] bg-[rgba(25,24,21,0.94)] p-[7px] shadow-[0_22px_48px_rgba(7,8,6,0.46)]">
                  <div className="rounded-[22px] border border-[#d6c29a] bg-[#f8f3e8] px-4 py-4 text-[#5f4017] shadow-[0_8px_18px_rgba(86,63,25,0.06)]">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        {eyebrow ? (
                          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#9d7740]">
                            {eyebrow}
                          </p>
                        ) : null}
                        <h1 className="text-[2rem] font-semibold leading-none tracking-[-0.04em] text-[#5a3e19]">
                          {title}
                        </h1>
                      </div>
                      <div className="rounded-b-[15px] border-x border-b border-[#e0c98e] bg-[#efd694] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7c5720]">
                        ID / Account
                      </div>
                    </div>

                    <div className="mt-2">
                      {children}
                    </div>

                    <div className="mt-4 flex items-center justify-between px-1 py-1 text-[13px] text-[#6f5227]">
                      <span className="font-medium">{linkPrompt}</span>
                      <Link
                        href={linkHref}
                        className="font-semibold text-[#9f3640] transition hover:text-[#7f232d]"
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
      </div>
    </div>
  );
}
