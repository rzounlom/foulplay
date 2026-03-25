"use client";

import Link from "next/link";
import { useEffect } from "react";

const LANDING_BG = "/social-branding.png";

export function AppHome() {
  useEffect(() => {
    document.body.classList.add("landing-no-scroll");
    return () => document.body.classList.remove("landing-no-scroll");
  }, []);

  const steps = [
    "Start a room",
    "Send the code",
    "Play during the game",
  ] as const;

  const contentSection = (
    <div className="flex flex-col items-center gap-3 md:gap-5 px-4 py-4 md:px-6 md:py-6">
      <h1 className="text-base md:text-3xl lg:text-4xl xl:text-5xl md:font-extrabold md:tracking-tight text-neutral-200 md:text-neutral-100 text-center max-w-3xl">
        Start a game. Invite your friends. Let chaos happen.
      </h1>
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full max-w-md">
        <Link
          href="/create"
          className="flex-1 min-h-[48px] flex items-center justify-center py-4 px-6 bg-primary text-white rounded-lg font-semibold text-center hover:bg-primary/90 transition-colors duration-200 ease-out cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:opacity-90 shadow-lg"
        >
          Start a Game
        </Link>
        <Link
          href="/join"
          className="flex-1 min-h-[48px] flex items-center justify-center py-4 px-6 border-2 border-white/80 text-white rounded-lg font-semibold text-center hover:bg-white/15 transition-colors duration-200 ease-out cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:opacity-90 backdrop-blur-sm"
        >
          Join a Game
        </Link>
      </div>
      <p className="text-sm text-neutral-400 text-center px-2">
        No signup required to join
      </p>
      <ol className="flex flex-col gap-2 text-center text-sm text-neutral-300 list-none max-w-xs">
        {steps.map((label, i) => (
          <li key={label} className="flex justify-center items-baseline gap-2">
            <span className="font-medium text-neutral-400 tabular-nums w-4 shrink-0 text-right">
              {i + 1}.
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <>
      {/* Mobile: stacked layout - image at top, content below, 50px from top */}
      <div className="flex md:hidden flex-col flex-1 min-h-0 overflow-y-auto pt-[50px] bg-neutral-950">
        <div className="flex flex-col shrink-0 w-full">
          <div
            className="w-full aspect-video bg-neutral-950 bg-contain bg-top bg-no-repeat"
            style={{ backgroundImage: `url(${LANDING_BG})` }}
            aria-hidden
          />
          <div className="pt-[30px]">
            {contentSection}
          </div>
        </div>
      </div>

      {/* Tablet/Desktop: overlay layout - background behind content */}
      <div className="hidden md:flex relative flex-1 min-h-0 items-center justify-center overflow-hidden">
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-70"
          style={{ backgroundImage: `url(${LANDING_BG})` }}
          aria-hidden
        />
        <div
          className="fixed inset-0 z-0 bg-gradient-to-b from-neutral-950/40 to-neutral-950/90"
          aria-hidden
        />
        <main className="relative z-10 flex w-full max-w-4xl flex-1 flex-col items-center justify-center min-h-0 pt-40">
          {contentSection}
        </main>
      </div>
    </>
  );
}
