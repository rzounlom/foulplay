"use client";

import { useState } from "react";

interface InstructionsModalProps {
  onStartTour?: () => void;
}

export function InstructionsModal({ onStartTour }: InstructionsModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer text-sm font-medium"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
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
        How to Play
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200 dark:border-neutral-800 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  How to Play FoulPlay
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors cursor-pointer"
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
                </button>
              </div>

              <div className="space-y-6 text-neutral-700 dark:text-neutral-300">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                    Objective
                  </h3>
                  <p>
                    Watch the game and submit cards when events happen! Earn points by getting your submissions approved by other players.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                    Your Hand
                  </h3>
                  <p>
                    You start with a set number of cards in your hand (configured by the host). Each card represents a game event (like a touchdown, foul, etc.) with a point value and penalty.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                    Submitting Cards
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>
                      <strong>Click on cards</strong> in your hand to select them (you can select multiple cards up to your hand size)
                    </li>
                    <li>
                      When you see an event happen in the game that matches your selected card(s), click the <strong>&quot;Submit Selected Cards&quot;</strong> button
                    </li>
                    <li>
                      Your submission will appear in the &quot;Pending Submissions&quot; section for other players to vote on
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                    Voting
                  </h3>
                  <p>
                    When other players submit cards, you&apos;ll see them in the &quot;Pending Submissions&quot; section. You can vote on individual cards or all cards at once.
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
                    <li>
                      <strong>Select cards</strong> you want to vote on by clicking them (or use &quot;Select All&quot;)
                    </li>
                    <li>
                      Click <strong>&quot;Approve Selected&quot;</strong> or <strong>&quot;Reject Selected&quot;</strong> to vote on your selected cards
                    </li>
                    <li>
                      Or use <strong>&quot;Approve All&quot;</strong> or <strong>&quot;Reject All&quot;</strong> to vote on all cards in the submission at once
                    </li>
                    <li>
                      Each card is resolved individually based on votes - some cards may be approved while others are rejected
                    </li>
                  </ol>
                  <p className="mt-2">
                    Approved cards earn points for the submitting player. Rejected cards are returned to the submitter&apos;s hand. You can only vote once per card.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                    Auto-Draw
                  </h3>
                  <p>
                    After your cards are approved or rejected, new cards will automatically be drawn to keep your hand at the configured size. You don&apos;t need to manually draw cards!
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                    End of Round (Football &amp; Basketball)
                  </h3>
                  <p className="mb-2">
                    When the room is set to Football or Basketball and the host has enabled round-based card clearing, the host can end a round during the game. Rounds are numbered (1, 2, 3, …) and the host can reset the round count anytime so the next round starts at 1 again.
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>
                      The <strong>host</strong> clicks <strong>&quot;End round&quot;</strong> in Host Controls.
                    </li>
                    <li>
                      A <strong>5-minute intermission</strong> starts. Everyone sees a notification and a countdown timer. <strong>Submissions and voting are paused</strong> during this time.
                    </li>
                    <li>
                      During the 5 minutes, you can <strong>select which cards</strong> (if any) to turn in. You may select up to the number of cards in your hand (e.g. up to 5 if your hand size is 5). Select cards, then click <strong>&quot;Turn in X cards at end of round&quot;</strong> to confirm. You can change your selection until the timer ends. To keep all cards, confirm with no cards selected.
                    </li>
                    <li>
                      <strong>When the intermission ends</strong> (timer reaches zero or host ends early), all confirmed selections are processed: your selected cards are turned in, you receive points for them, and you are dealt new cards to replace them. You must perform the drink penalty for each card you turned in.
                    </li>
                    <li>
                      After processing, the round number advances and normal play resumes. The host can click <strong>&quot;Reset round&quot;</strong> to set the count back so the next &quot;End round&quot; starts Round 1 again.
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                    Winning
                  </h3>
                  <p>
                    The player with the most points at the end of the game wins! Check the player list to see current scores (if the host has enabled point visibility).
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700 space-y-3">
                {onStartTour && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onStartTour();
                    }}
                    className="w-full px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors cursor-pointer"
                  >
                    Take Interactive Tour
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
