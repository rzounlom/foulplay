"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

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
      target: '[data-tour="player-list"]',
      title: "Player List",
      content: "See all players in the game and their current points. The host can toggle whether everyone can see each other's scores.",
      position: "right",
    },
    {
      target: '[data-tour="your-cards"]',
      title: "Your Cards",
      content: "These are your cards! Click on cards to select them (you can select multiple cards), then click 'Submit Selected Cards' when you see matching events in the game.",
      position: "top",
    },
    {
      target: '[data-tour="active-card"]',
      title: "Active Card",
      content: "If someone draws a card, it appears here. You can submit it if it's your card, or wait for others to submit their cards.",
      position: "bottom",
    },
    {
      target: '[data-tour="pending-submissions"]',
      title: "Pending Submissions",
      content: "When players submit cards, they appear here. Vote to approve or reject based on whether the event actually happened in the game.",
      position: "bottom",
    },
    {
      target: '[data-tour="instructions"]',
      title: "Need Help?",
      content: "Click the 'How to Play' button anytime to see detailed instructions about the game rules and mechanics.",
      position: "left",
    },
  ], []);

  const updateSpotlight = useCallback(() => {
    if (!isActive || currentStep >= steps.length) return;

    const step = steps[currentStep];
    const targetElement = document.querySelector(step.target) as HTMLElement;

    if (!targetElement || !spotlightRef.current || !overlayRef.current) return;

    const rect = targetElement.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // Create spotlight effect
    const spotlight = spotlightRef.current;
    spotlight.style.width = `${rect.width + 20}px`;
    spotlight.style.height = `${rect.height + 20}px`;
    spotlight.style.left = `${rect.left + scrollX - 10}px`;
    spotlight.style.top = `${rect.top + scrollY - 10}px`;

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
      return () => window.removeEventListener("resize", updateSpotlight);
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
        console.error("Failed to save tour preference:", error);
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

  // Handle missing elements
  useEffect(() => {
    if (!isActive || currentStep >= steps.length) return;

    const step = steps[currentStep];
    const targetElement = document.querySelector(step.target) as HTMLElement;

    if (!targetElement) {
      // If target not found, skip to next step
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

      {/* Spotlight */}
      <div
        ref={spotlightRef}
        className="fixed z-[9999] pointer-events-none transition-all duration-300 ease-out rounded-lg"
        style={{
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)",
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
            <button
              onClick={handleSkip}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer ml-2"
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
            </button>
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
            <input
              id="dontShowAgain"
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 text-primary border-neutral-300 dark:border-neutral-700 rounded cursor-pointer"
            />
            <label htmlFor="dontShowAgain" className="text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer">
              Don&apos;t show this tour again
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors font-medium cursor-pointer"
            >
              Skip Tour
            </button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                >
                  Previous
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors cursor-pointer"
              >
                {currentStep === steps.length - 1 ? "Get Started" : "Next"}
              </button>
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
  const padding = 20;
  const tooltipWidth = 384; // max-w-sm = 384px
  const tooltipHeight = 300; // approximate height
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;

  let left: number;
  let top: number;
  let adjustedPosition = position;

  switch (position) {
    case "top": {
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      top = rect.top - tooltipHeight - padding;
      
      // If tooltip goes above viewport, try bottom instead
      if (top < scrollY + padding) {
        top = rect.bottom + padding;
        adjustedPosition = "bottom";
      }
      break;
    }
    case "bottom": {
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      top = rect.bottom + padding;
      
      // If tooltip goes below viewport, try top instead
      if (top + tooltipHeight > scrollY + viewportHeight - padding) {
        top = rect.top - tooltipHeight - padding;
        adjustedPosition = "top";
      }
      break;
    }
    case "left": {
      left = rect.left - tooltipWidth - padding;
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      
      // If tooltip goes left of viewport, try right instead
      if (left < scrollX + padding) {
        left = rect.right + padding;
        adjustedPosition = "right";
      }
      break;
    }
    case "right": {
      left = rect.right + padding;
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      
      // If tooltip goes right of viewport, try left instead
      if (left + tooltipWidth > scrollX + viewportWidth - padding) {
        left = rect.left - tooltipWidth - padding;
        adjustedPosition = "left";
      }
      break;
    }
    case "center":
    default: {
      left = viewportWidth / 2 - tooltipWidth / 2;
      top = viewportHeight / 2 - tooltipHeight / 2;
      break;
    }
  }

  // Ensure tooltip stays within horizontal bounds
  if (left < scrollX + padding) {
    left = scrollX + padding;
  } else if (left + tooltipWidth > scrollX + viewportWidth - padding) {
    left = scrollX + viewportWidth - tooltipWidth - padding;
  }

  // Ensure tooltip stays within vertical bounds
  if (top < scrollY + padding) {
    top = scrollY + padding;
  } else if (top + tooltipHeight > scrollY + viewportHeight - padding) {
    top = scrollY + viewportHeight - tooltipHeight - padding;
  }

  return { left, top, adjustedPosition };
}

function getArrowPosition(
  position: "top" | "bottom" | "left" | "right" | "center"
): React.CSSProperties {
  switch (position) {
    case "top":
      return {
        bottom: "-16px",
        left: "50%",
        transform: "translateX(-50%)",
        borderTopColor: "rgb(59, 130, 246)",
      };
    case "bottom":
      return {
        top: "-16px",
        left: "50%",
        transform: "translateX(-50%)",
        borderBottomColor: "rgb(59, 130, 246)",
      };
    case "left":
      return {
        right: "-16px",
        top: "50%",
        transform: "translateY(-50%)",
        borderLeftColor: "rgb(59, 130, 246)",
      };
    case "right":
      return {
        left: "-16px",
        top: "50%",
        transform: "translateY(-50%)",
        borderRightColor: "rgb(59, 130, 246)",
      };
    default:
      return {};
  }
}
