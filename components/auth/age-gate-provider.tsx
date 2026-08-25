"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useUser } from "@clerk/nextjs";
import { AgeGateModal } from "@/components/auth/age-gate-modal";

type AgeGateContextValue = {
  is21Plus: boolean | null;
  ageGateComplete: boolean;
  isLoading: boolean;
  confirmAge: (is21Plus: boolean) => Promise<void>;
  refreshAgeGate: () => Promise<void>;
};

const AgeGateContext = createContext<AgeGateContextValue | null>(null);

export function useAgeGate(): AgeGateContextValue {
  const ctx = useContext(AgeGateContext);
  if (!ctx) {
    throw new Error("useAgeGate must be used within AgeGateProvider");
  }
  return ctx;
}

export function AgeGateProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  const [is21Plus, setIs21Plus] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAgeGate = useCallback(async () => {
    if (!isSignedIn) {
      setIs21Plus(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/profile");
      if (!response.ok) {
        throw new Error("Failed to load profile");
      }
      const data = (await response.json()) as {
        profile: { is21Plus: boolean | null };
      };
      setIs21Plus(data.profile.is21Plus ?? null);
    } catch {
      setIs21Plus(null);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;
    void refreshAgeGate();
  }, [isLoaded, refreshAgeGate]);

  const confirmAge = useCallback(async (confirmed21Plus: boolean) => {
    const response = await fetch("/api/user/age-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is21Plus: confirmed21Plus }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const message =
        typeof data.error === "string"
          ? data.error
          : "Failed to save age confirmation";
      const details =
        typeof data.details === "string" ? ` (${data.details})` : "";
      throw new Error(`${message}${details}`);
    }

    const data = (await response.json()) as {
      profile: { is21Plus: boolean | null };
    };
    setIs21Plus(data.profile.is21Plus ?? null);
  }, []);

  const value = useMemo(
    () => ({
      is21Plus,
      ageGateComplete: is21Plus !== null,
      isLoading,
      confirmAge,
      refreshAgeGate,
    }),
    [is21Plus, isLoading, confirmAge, refreshAgeGate],
  );

  const showModal = isLoaded && isSignedIn && !isLoading && is21Plus === null;

  return (
    <AgeGateContext.Provider value={value}>
      {children}
      {showModal ? <AgeGateModal onConfirm={confirmAge} /> : null}
    </AgeGateContext.Provider>
  );
}
