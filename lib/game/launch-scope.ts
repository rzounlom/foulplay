/**
 * Launch-facing product surface for Wednesday web.
 * Underlying Public Chaos and round APIs stay in the repo; they are hidden here.
 */
export const LAUNCH_PUBLIC_CHAOS_VISIBLE = false;
export const LAUNCH_ROUND_CONTROLS_VISIBLE = false;
export const LAUNCH_REFRESH_HAND_ENABLED = true;

export const REFRESH_HAND_COOLDOWN_MS = 5 * 60 * 1000;

export const LAUNCH_MODES = ["non-drinking", "party"] as const;
export type LaunchMode = (typeof LAUNCH_MODES)[number];

export function isLaunchSelectableMode(mode: string): mode is LaunchMode {
  return (LAUNCH_MODES as readonly string[]).includes(mode);
}

/**
 * Round-clearing APIs remain, but launch rooms cannot turn the setting on.
 * When round controls are visible again, the requested value is honored.
 */
export function resolveLaunchQuarterClearing(requested?: boolean): boolean {
  if (!LAUNCH_ROUND_CONTROLS_VISIBLE) return false;
  return requested === true;
}
