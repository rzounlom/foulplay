import { prisma } from "@/lib/db/prisma";
import { isDrinkingMode } from "@/lib/game/modes";

export const DRINKING_MODE_ACCESS_ERROR =
  "Drinking game modes are only available if you confirmed you are 21 or older. You can still play in non-drinking (points) mode.";

export const LIVE_DROP_IN_ACCESS_ERROR =
  "Live drop-in games use drinking modes and are only available if you confirmed you are 21 or older.";

export async function getUserAgeGate(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { is21Plus: true, ageConfirmedAt: true },
  });
}

export function userCanAccessDrinkingMode(is21Plus: boolean | null | undefined): boolean {
  return is21Plus === true;
}

export async function assertDrinkingModeAccess(
  userId: string,
  mode: string | null | undefined,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isDrinkingMode(mode)) {
    return { ok: true };
  }

  const user = await getUserAgeGate(userId);
  if (!userCanAccessDrinkingMode(user?.is21Plus)) {
    return { ok: false, error: DRINKING_MODE_ACCESS_ERROR };
  }

  return { ok: true };
}
