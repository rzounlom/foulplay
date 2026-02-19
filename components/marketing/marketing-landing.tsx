"use client";

import { useState } from "react";
import Link from "next/link";
import { getAppUrl, getWaitlistUrl } from "@/lib/host";
import { ShareModal } from "@/components/game/share-modal";

export function MarketingLanding() {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const appUrl = getAppUrl();
  const waitlistUrl = getWaitlistUrl();
  const shareUrl =
    typeof window !== "undefined" ? window.location.href : "https://foulplay.io";

  return (
    <div className="h-screen flex flex-col text-white overflow-hidden relative bg-neutral-950">
      {/* Full-viewport background - behind navbar, content, and footer */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-70"
        style={{ backgroundImage: "url(/social-branding.png)" }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/40 to-neutral-950/90" aria-hidden />
      <header className="relative z-10 shrink-0 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xl font-bold text-primary">FoulPlay</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="text-sm font-medium text-neutral-300 hover:text-white transition-colors inline-flex items-center gap-1.5"
              aria-label="Share"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Share
            </button>
            <Link
              href={appUrl}
              className="text-sm font-medium text-neutral-300 hover:text-white transition-colors"
            >
              Play on Web
            </Link>
            <Link
              href={waitlistUrl}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Join Waitlist
            </Link>
          </div>
        </div>
      </header>
      {/* Hero + Coming soon - flex to fill viewport */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col justify-center container mx-auto px-4 py-2 sm:py-4 min-h-0 overflow-hidden">
          <div className="max-w-4xl mx-auto text-center space-y-2 sm:space-y-4 md:space-y-5">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Real-time social card games with friends
            </h1>
            <p className="text-base md:text-lg text-neutral-300 max-w-2xl mx-auto">
              Create rooms, play together, and compete. No downloads required for the web app.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link
                href={appUrl}
                className="inline-flex items-center justify-center min-h-[48px] px-6 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
              >
                Play on Web
              </Link>
              <Link
                href={waitlistUrl}
                className="inline-flex items-center justify-center min-h-[48px] px-6 py-2.5 border-2 border-white/60 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
              >
                Join Waitlist
              </Link>
              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-2.5 border-2 border-white/60 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Share FoulPlay"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Share
              </button>
            </div>
          </div>
          {/* App Store badges - inline with hero */}
          <div className="mt-4 md:mt-6 text-center shrink-0">
            <h2 className="text-lg font-bold mb-3">Coming soon to mobile</h2>
            <div className="flex flex-wrap justify-center gap-3">
            <a
              href="#"
              className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-800 rounded-lg opacity-60 cursor-not-allowed"
              aria-disabled
              title="Coming soon"
            >
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <span>App Store</span>
              <span className="text-xs">(Coming soon)</span>
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-800 rounded-lg opacity-60 cursor-not-allowed"
              aria-disabled
              title="Coming soon"
            >
              <svg className="h-8 w-8" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.302 2.302-8.636-8.634z"
                />
              </svg>
              <span>Google Play</span>
              <span className="text-xs">(Coming soon)</span>
            </a>
          </div>
          </div>
        </div>
      </div>

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        url={shareUrl}
        title="Share FoulPlay"
        shareText="Check out FoulPlay — real-time social card games with friends!"
      />

      {/* Footer */}
      <footer className="relative z-10 shrink-0 border-t border-white/10 bg-black/20 backdrop-blur-sm py-3">
        <div className="container mx-auto px-4 text-center text-neutral-500 text-xs">
          <p>© {new Date().getFullYear()} FoulPlay. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
