"use client";

import Link from "next/link";
import { useEffect } from "react";

const LANDING_BG = "/landing-bg.png";

export default function Home() {
  useEffect(() => {
    document.body.classList.add("landing-no-scroll");
    return () => document.body.classList.remove("landing-no-scroll");
  }, []);

  return (
    <div className="relative flex h-[calc(100vh-4.5rem)] min-h-0 items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${LANDING_BG})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/65 dark:bg-black/75" aria-hidden />

      <main className="relative z-10 flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-3 md:gap-5 px-4 py-4 md:px-6 md:py-6 min-h-0">
        <div className="text-center space-y-2 md:space-y-3 shrink-0">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight drop-shadow-2xl [text-shadow:0_0_40px_rgba(255,102,0,0.5)]">
            FoulPlay
          </h1>
          <p className="text-base md:text-section-title text-neutral-200 md:text-neutral-100">
            Real-time social card games with friends
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full max-w-md shrink-0">
          <Link
            href="/create"
            className="flex-1 min-h-[48px] flex items-center justify-center py-4 px-6 bg-primary text-white rounded-lg font-semibold text-center hover:bg-primary/90 transition-colors duration-200 ease-out cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:opacity-90 shadow-lg"
          >
            Create Room
          </Link>
          <Link
            href="/join"
            className="flex-1 min-h-[48px] flex items-center justify-center py-4 px-6 border-2 border-white/80 text-white rounded-lg font-semibold text-center hover:bg-white/15 transition-colors duration-200 ease-out cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:opacity-90 backdrop-blur-sm"
          >
            Join Room
          </Link>
        </div>

        <div className="mt-2 md:mt-4 text-center px-2 shrink-0">
          <p className="text-sm md:text-base text-neutral-300">
            Create a room, share the code, and start playing—no downloads required
          </p>
        </div>
      </main>
    </div>
  );
}
