"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface TourStep {
  target: string; // CSS selector or data attribute
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
}

interface GameTourProps {
  onComplete?: () => void;
  onSkip?: () => void;
  startTour?: boolean;
  onTourStart?: () => void;
}

export function GameTour({ onComplete, onSkip, startTour, onTourStart }: GameTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const steps: TourStep[] = useMemo(() => [
    {
      target: '[data-tour="game-info"]',
      title: "Game Room Info",
      content: "Here you see the room's Mode and Sport. Mode affects the mix of card severities (mild / moderate / severe). You'll also find the How to Play and Chat buttons here.",
      position: "top",
    },
    {
      target: '[data-tour="player-list"]',
      title: "Player List",
      content: "See all players in the game. The host can toggle whether everyone sees each other's scores. You need at least 2 players to start.",
      position: "top",
    },
    {
      target: '[data-tour="your-cards"]',
      title: "Your Cards",
      content: "Your hand! Click cards to select them (you can select multiple), then click 'Submit Selected Cards' when you see matching events in the game. Your hand size is set by the host.",
      position: "top",
    },
    {
      target: '[data-tour="pending-submissions"]',
      title: "Pending Submissions",
      content: "Cards waiting for votes appear here. You can't vote on your own submission. Vote Approve or Reject per card; a card is approved or rejected when a majority of other players have voted. Approved cards earn points; rejected cards return to the submitter's hand.",
      position: "top",
    },
    {
      target: '[data-tour="chat-button"]',
      title: "Chat",
      content: "Open the room chat to send messages to all players. The badge shows unread message count when you have new messages.",
      position: "top",
    },
    {
      target: '[data-tour="host-controls"]',
      title: "Host Controls (host only)",
      content: "If you're the host, you can show/hide points, reset everyone's points, or end the game and start a new one. For Football/Basketball rooms you may also see round controls (End Round, Reset Round, Finalize quarter) here.",
      position: "top",
    },
    {
      target: '[data-tour="instructions"]',
      title: "How to Play",
      content: "Click 'How to Play' anytime for full rules: game mode, voting, host controls, chat, and round-based clearing (if enabled).",
      position: "top",
    },
  ], []);

  const updateSpotlight = useCallback(() => {
    if (!isActive || currentStep >= steps.length) return;

    const step = steps[currentStep];
    const targetElement = document.querySelector(step.target) as HTMLElement;

    if (!targetElement || !spotlightRef.current || !overlayRef.current) return;

    const rect = targetElement.getBoundingClientRect();
    const padding = 12;

    // Spotlight uses position: fixed — use viewport coordinates (getBoundingClientRect)
    const spotlight = spotlightRef.current;
    spotlight.style.width = `${rect.width + padding * 2}px`;
    spotlight.style.height = `${rect.height + padding * 2}px`;
    spotlight.style.left = `${rect.left - padding}px`;
    spotlight.style.top = `${rect.top - padding}px`;

    // Scroll element into view if needed
    targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [isActive, currentStep, steps]);

  // Expose restart function via ref or prop
  useEffect(() => {
    if (startTour) {
      onTourStart?.();
      // Use setTimeout to defer state updates and avoid synchronous setState in effect
      setTimeout(() => {
        setIsActive(true);
        setCurrentStep(0);
        // Delay to ensure DOM is ready before updating spotlight
        setTimeout(() => {
          updateSpotlight();
        }, 100);
      }, 0);
    }
  }, [startTour, onTourStart, updateSpotlight]);

  // Removed auto-start on mount - tour will now start when game_started event is received

  useEffect(() => {
    if (isActive && currentStep < steps.length) {
      updateSpotlight();
      window.addEventListener("resize", updateSpotlight);
      window.addEventListener("scroll", updateSpotlight, true); // capture phase to catch scroll in any container
      return () => {
        window.removeEventListener("resize", updateSpotlight);
        window.removeEventListener("scroll", updateSpotlight, true);
      };
    }
  }, [isActive, currentStep, steps.length, updateSpotlight]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveTourPreference = useCallback(async (skip: boolean) => {
    if (skip && dontShowAgain) {
      try {
        await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skipTour: true }),
        });
      } catch (error) {
        if (process.env.NODE_ENV === "development") console.error("Failed to save tour preference:", error);
      }
    }
  }, [dontShowAgain]);

  const handleSkip = useCallback(async () => {
    await saveTourPreference(true);
    setIsActive(false);
    onSkip?.();
  }, [saveTourPreference, onSkip]);

  const handleComplete = useCallback(async () => {
    if (dontShowAgain) {
      await saveTourPreference(true);
    }
    setIsActive(false);
    onComplete?.();
  }, [onComplete, dontShowAgain, saveTourPreference]);

  // Handle missing or hidden elements (e.g. host-controls hidden on mobile)
  useEffect(() => {
    if (!isActive || currentStep >= steps.length) return;

    const step = steps[currentStep];
    const targetElement = document.querySelector(step.target) as HTMLElement;

    const shouldSkip =
      !targetElement ||
      targetElement.offsetParent === null ||
      targetElement.getBoundingClientRect().width === 0;

    if (shouldSkip) {
      const timer = setTimeout(() => {
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          handleComplete();
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isActive, currentStep, steps, handleComplete]);

  if (!isActive || currentStep >= steps.length) return null;

  const step = steps[currentStep];
  const targetElement = document.querySelector(step.target) as HTMLElement;

  if (!targetElement) {
    return null;
  }

  const rect = targetElement.getBoundingClientRect();
  const tooltipPosition = getTooltipPosition(step.position || "bottom", rect);
  const actualPosition = tooltipPosition.adjustedPosition || step.position || "bottom";

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/60 z-[9998] transition-opacity"
        onClick={handleSkip}
      />

      {/* Spotlight — bright highlight with primary-color border and glow */}
      <div
        ref={spotlightRef}
        className="fixed z-[9999] pointer-events-none transition-all duration-300 ease-out rounded-lg bg-white/10 dark:bg-white/5"
        style={{
          boxShadow:
            "0 0 0 9999px rgba(0, 0, 0, 0.65), 0 0 0 4px rgb(255, 102, 0), 0 0 24px 4px rgba(255, 102, 0, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.15)",
        }}
      />

      {/* Tooltip */}
      <div
        className="fixed z-[10000] bg-white dark:bg-neutral-900 rounded-lg shadow-2xl border-2 border-primary max-w-sm max-h-[calc(100vh-40px)] overflow-y-auto pointer-events-auto transition-all duration-300"
        style={{
          left: `${tooltipPosition.left}px`,
          top: `${tooltipPosition.top}px`,
        }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">
                    {currentStep + 1}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {step.title}
                </h3>
              </div>
            </div>
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              onClick={handleSkip}
              className="ml-2 !p-2 min-w-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              aria-label="Skip tour"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          </div>

          {/* Content */}
          <p className="text-neutral-700 dark:text-neutral-300 mb-6 leading-relaxed">
            {step.content}
          </p>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    index === currentStep
                      ? "bg-primary"
                      : index < currentStep
                      ? "bg-primary/50"
                      : "bg-neutral-200 dark:bg-neutral-700"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Don't Show Again Checkbox */}
          <div className="mb-4 flex items-center gap-2">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            <Label htmlFor="dontShowAgain" className="!mb-0 cursor-pointer text-neutral-600 dark:text-neutral-400">
              Don&apos;t show this tour again
            </Label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <Button variant="tertiary" size="md" onClick={handleSkip}>
              Skip Tour
            </Button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="secondary" size="md" onClick={handlePrevious}>
                  Previous
                </Button>
              )}
              <Button variant="primary" size="md" onClick={handleNext}>
                {currentStep === steps.length - 1 ? "Get Started" : "Next"}
              </Button>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div
          className="absolute w-0 h-0 border-8 border-transparent"
          style={{
            ...getArrowPosition(actualPosition),
          }}
        />
      </div>
    </>
  );
}

function getTooltipPosition(
  position: "top" | "bottom" | "left" | "right" | "center",
  rect: DOMRect
): { left: number; top: number; adjustedPosition?: "top" | "bottom" | "left" | "right" | "center" } {
  const padding = 16;
  const tooltipWidth = 384; // max-w-sm = 384px
  const tooltipHeight = 340; // approximate max height with content
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Tooltip uses position: fixed — use viewport coordinates only
  let left: number;
  let top: number;
  let adjustedPosition: "top" | "bottom" | "left" | "right" | "center" =
    position === "center" ? "center" : "top";

  // Prefer placing tooltip ABOVE the highlighted element (user requested)
  const preferTop = position === "top" || position === "bottom" || position === "left" || position === "right";
  const topSpace = rect.top;
  const bottomSpace = viewportHeight - rect.bottom;

  if (preferTop && topSpace >= tooltipHeight + padding) {
    // Place above
    left = rect.left + rect.width / 2 - tooltipWidth / 2;
    top = rect.top - tooltipHeight - padding;
    adjustedPosition = "top";
  } else if (preferTop && bottomSpace >= tooltipHeight + padding) {
    // Not enough space above, place below
    left = rect.left + rect.width / 2 - tooltipWidth / 2;
    top = rect.bottom + padding;
    adjustedPosition = "bottom";
  } else if (position === "center") {
    left = viewportWidth / 2 - tooltipWidth / 2;
    top = viewportHeight / 2 - tooltipHeight / 2;
  } else {
    // Default: above, will clamp to viewport
    left = rect.left + rect.width / 2 - tooltipWidth / 2;
    top = Math.max(padding, rect.top - tooltipHeight - padding);
    adjustedPosition = "top";
  }

  // Clamp to viewport (fixed positioning = viewport bounds)
  left = Math.max(padding, Math.min(left, viewportWidth - tooltipWidth - padding));
  top = Math.max(padding, Math.min(top, viewportHeight - tooltipHeight - padding));

  return { left, top, adjustedPosition };
}

function getArrowPosition(
  position: "top" | "bottom" | "left" | "right" | "center"
): React.CSSProperties {
  const primaryColor = "rgb(255, 102, 0)";
  switch (position) {
    case "top":
      return {
        bottom: "-16px",
        left: "50%",
        transform: "translateX(-50%)",
        borderTopColor: primaryColor,
      };
    case "bottom":
      return {
        top: "-16px",
        left: "50%",
        transform: "translateX(-50%)",
        borderBottomColor: primaryColor,
      };
    case "left":
      return {
        right: "-16px",
        top: "50%",
        transform: "translateY(-50%)",
        borderLeftColor: primaryColor,
      };
    case "right":
      return {
        left: "-16px",
        top: "50%",
        transform: "translateY(-50%)",
        borderRightColor: primaryColor,
      };
    default:
      return {};
  }
}
