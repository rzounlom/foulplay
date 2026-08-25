"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface AgeGateModalProps {
  onConfirm: (is21Plus: boolean) => Promise<void>;
}

export function AgeGateModal({ onConfirm }: AgeGateModalProps) {
  const [checked, setChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm21Plus = async () => {
    if (!checked) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnder21 = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9200] flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-gate-title"
      >
        <h2
          id="age-gate-title"
          className="text-xl font-bold text-foreground mb-2"
        >
          Age confirmation
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          Some FoulPlay game modes include drinking-related suggestions. This
          platform does not involve gambling. We ask that you confirm your age
          before playing.
        </p>

        <label className="flex items-start gap-3 cursor-pointer mb-6">
          <Checkbox
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            disabled={isSubmitting}
          />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            I confirm I am 21 years of age or older.
          </span>
        </label>

        {error ? (
          <div className="mb-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm px-3 py-2">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!checked}
            isLoading={isSubmitting && checked}
            onClick={() => void handleConfirm21Plus()}
          >
            Continue
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            disabled={isSubmitting}
            onClick={() => void handleUnder21()}
          >
            I am under 21
          </Button>
        </div>

        <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-500">
          If you are under 21, you can still play in non-drinking (points) mode
          only. Your choice is saved to your account.
        </p>
      </div>
    </div>
  );
}
