import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { NextResponse } from "next/server";
import { getDomainType, getAppUrl } from "@/lib/host";

const isProtectedRoute = createRouteMatcher([
  "/game(.*)",
  "/api/game(.*)",
  "/api/rooms(.*)",
]);

const APP_ROUTES = [
  "/create",
  "/join",
  "/game",
  "/games",
  "/profile",
  "/sign-in",
  "/sign-up",
  "/active-games",
];

function isAppRoute(pathname: string): boolean {
  return APP_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export default clerkMiddleware(async (auth, req) => {
    // Host-based redirect: app routes on marketing domain → app subdomain
  const pathname = req.nextUrl.pathname;
  if (
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/") &&
    !pathname.startsWith("/favicon") &&
    !pathname.includes(".")
  ) {
    const host = req.headers.get("host") ?? "";
    const domainType = getDomainType(host);
    if (isAppRoute(pathname) && domainType !== "app") {
      const appUrl = getAppUrl();
      const url = new URL(pathname + req.nextUrl.search, appUrl);
      return NextResponse.redirect(url);
    }
  }

  if (isProtectedRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      // For API routes, return JSON error. For pages, redirect to sign-in
      if (req.nextUrl.pathname.startsWith("/api")) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      // For pages, Clerk will handle the redirect automatically
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
