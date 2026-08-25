/** Client session flags for drop-in live flow */

const LIVE_JOIN_TOAST = "foulplay-live-join-toast";
const LIVE_EXIT_PROMPT = "foulplay-live-exit-prompt";

export function setLiveJoinToast(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(LIVE_JOIN_TOAST, "1");
  } catch {
    /* ignore */
  }
}

export function consumeLiveJoinToast(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = sessionStorage.getItem(LIVE_JOIN_TOAST);
    if (v) sessionStorage.removeItem(LIVE_JOIN_TOAST);
    return v === "1";
  } catch {
    return false;
  }
}

export function setLiveExitPrompt(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(LIVE_EXIT_PROMPT, "1");
  } catch {
    /* ignore */
  }
}

export function consumeLiveExitPrompt(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = sessionStorage.getItem(LIVE_EXIT_PROMPT);
    if (v) sessionStorage.removeItem(LIVE_EXIT_PROMPT);
    return v === "1";
  } catch {
    return false;
  }
}
