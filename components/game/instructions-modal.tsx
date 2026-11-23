"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface InstructionsModalProps {
  onStartTour?: () => void;
}

export function InstructionsModal({ onStartTour }: InstructionsModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(true)}
        aria-label="How to Play"
        className="inline-flex items-center gap-1.5 border-2 border-primary text-primary bg-primary/5 dark:shadow-[0_0_14px_rgba(255,102,0,0.5)] hover:bg-primary/10 dark:hover:shadow-[0_0_18px_rgba(255,102,0,0.6)] dark:[text-shadow:0_0_8px_rgba(255,102,0,0.6)] shadow-sm hover:shadow-md whitespace-nowrap"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 shrink-0 [filter:drop-shadow(0_0_4px_rgba(255,102,0,0.8))]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="hidden sm:inline">How to Play</span>
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-surface rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto border border-border shadow-xl dark:shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  How to Play FoulPlay
                </h2>
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="!p-2 min-w-0 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                  aria-label="Close"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </Button>
              </div>

              <div className="space-y-4 text-neutral-700 dark:text-neutral-300">
                <ol className="list-decimal list-inside space-y-2">
                  <li>You get cards describing sports moments.</li>
                  <li>Watch the game on TV.</li>
                  <li>When something on a card happens, tap it and submit.</li>
                  <li>Your friends confirm it happened.</li>
                  <li>
                    You earn points. In Party mode, drinks are honor-system only.
                  </li>
                  <li>Keep playing until the host ends the game.</li>
                </ol>
                <p className="text-sm">
                  If nobody votes, a card auto-accepts after 30 seconds. Highest
                  score wins. Then you can Run It Back with the same crew. If
                  your cards go cold for 5 minutes, tap Refresh Hand.
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700 space-y-3">
                {onStartTour && (
                  <Button
                    variant="outline-info"
                    fullWidth
                    onClick={() => {
                      setIsOpen(false);
                      onStartTour();
                    }}
                  >
                    Take Interactive Tour
                  </Button>
                )}
                <Button
                  variant="outline-primary"
                  fullWidth
                  onClick={() => setIsOpen(false)}
                >
                  Got it!
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
