"use client";

import { useSyncExternalStore } from "react";

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const navigatorStandalone =
    "standalone" in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return media || navigatorStandalone;
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notOther = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOS && webkit && notOther;
}

function subscribeToDisplayMode(onChange: () => void): () => void {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function shouldShowInstallHint(): boolean {
  return !isStandaloneDisplay() && isIosSafari();
}

/**
 * iPhone Safari cannot prompt install programmatically. Show how to use
 * Share → Add to Home Screen. Hidden once the app is already standalone.
 */
export function IosInstallHint() {
  const show = useSyncExternalStore(
    subscribeToDisplayMode,
    shouldShowInstallHint,
    () => false,
  );

  if (!show) return null;

  return (
    <p
      className="text-xs text-neutral-400 text-center px-3 max-w-md"
      data-testid="ios-install-hint"
    >
      On iPhone: tap Share, then Add to Home Screen for a full-screen FoulPlay
      icon. Use{" "}
      <span className="text-neutral-300">app.foulplay.io</span>, then sign in
      from the Home Screen icon.
    </p>
  );
}
