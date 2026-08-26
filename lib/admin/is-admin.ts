import { NextRequest } from "next/server";
import { getCurrentUser, getCurrentUserFromRequest } from "@/lib/auth/clerk";

function parseAdminClerkIds(): string[] {
  return (
    process.env.ADMIN_CLERK_IDS?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) ?? []
  );
}

export function isAdminClerkId(clerkId: string | null | undefined): boolean {
  if (!clerkId) return false;
  const allowlist = parseAdminClerkIds();
  if (allowlist.length === 0) return false;
  return allowlist.includes(clerkId);
}

export async function getAdminUser() {
  const user = await getCurrentUser();
  if (!user || !isAdminClerkId(user.clerkId)) return null;
  return user;
}

export async function getAdminUserFromRequest(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user || !isAdminClerkId(user.clerkId)) return null;
  return user;
}
