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
