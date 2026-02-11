import { auth, currentUser } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";

function clerkUserName(clerkUser: { firstName: string | null; lastName: string | null; username: string | null; emailAddresses: { emailAddress: string }[] }): string {
  return clerkUser.firstName && clerkUser.lastName
    ? `${clerkUser.firstName} ${clerkUser.lastName}`
    : clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress || "User";
}

/**
 * Get the current authenticated user from Clerk and sync with database
 * Returns the database user record. Uses cookie-based auth (for web).
 */
export async function getCurrentUser() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return null;
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return null;
  }

  return syncUserToDb(clerkId, clerkUserName(clerkUser));
}

/**
 * Get the current user from an incoming request. Supports both:
 * - Web: cookie-based auth (__session)
 * - Mobile: Authorization: Bearer <Clerk session token>
 * Use this in API route handlers and pass the request.
 */
export async function getCurrentUserFromRequest(request: NextRequest) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey) {
    return null;
  }

  const client = createClerkClient({ secretKey, publishableKey });

  // Normalize URLs (no trailing slash) so Clerk matches the request origin
  const normalize = (url: string) => url.replace(/\/$/, "");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ? normalize(process.env.NEXT_PUBLIC_APP_URL)
    : process.env.VERCEL_URL
      ? normalize(`https://${process.env.VERCEL_URL}`)
      : "http://localhost:3000";
  const vercelUrl = process.env.VERCEL_URL
    ? normalize(`https://${process.env.VERCEL_URL}`)
    : null;
  const parties: string[] = [
    appUrl,
    ...(vercelUrl && vercelUrl !== appUrl ? [vercelUrl] : []),
    "http://localhost:3000",
    "https://localhost:3000",
    "http://localhost:8081", // Expo dev
  ];
  // Include the request's origin so cookie auth works when it matches our app (e.g. production)
  try {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const requestOrigin = origin ?? (referer ? new URL(referer).origin : null);
    if (requestOrigin) {
      const o = normalize(requestOrigin);
      if (o && !parties.includes(o)) parties.push(o);
    }
  } catch {
    // ignore
  }
  const authorizedParties = [...new Set(parties)];

  const state = await client.authenticateRequest(request, {
    authorizedParties,
  });

  if (!state.isAuthenticated) {
    return null;
  }

  const auth = await state.toAuth();
  const clerkId = auth?.userId;
  if (!clerkId) {
    return null;
  }

  const clerkUser = await client.users.getUser(clerkId);
  const name = clerkUserName({
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    username: clerkUser.username,
    emailAddresses: clerkUser.emailAddresses.map((e) => ({ emailAddress: e.emailAddress })),
  });

  return syncUserToDb(clerkId, name);
}

async function syncUserToDb(clerkId: string, name: string) {
  let user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { clerkId, name },
    });
  } else if (user.name !== name) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { name },
    });
  }

  return user;
}
