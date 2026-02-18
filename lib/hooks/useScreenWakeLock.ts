"use client";

import { useEffect, useRef } from "react";

/**
 * Screen Wake Lock API hook.
 * Prevents the device screen from dimming or locking while the component is mounted.
 * Reacquires the lock when the document becomes visible again (e.g. after switching tabs).
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
 */
export function useScreenWakeLock(enabled = true) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = async () => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.debug("Screen Wake Lock request failed:", err);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Ignore release errors
      }
      wakeLockRef.current = null;
    }
  };

  useEffect(() => {
    if (!enabled) return;

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock();
    };
  }, [enabled]);
}
