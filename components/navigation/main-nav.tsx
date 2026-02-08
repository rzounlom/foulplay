"use client";

import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

export function MainNav() {
  const { isSignedIn, isLoaded } = useUser();
  const pathname = usePathname();

  // Don't show nav on auth pages
  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) {
    return null;
  }

  const isActive = (path: string, options?: { exact?: boolean }) => {
    if (!pathname) return false;
    if (options?.exact) return pathname === path;
    // For /active-games, also treat /game/* as active (in-game or end-game)
    if (path === "/active-games") return pathname === path || pathname.startsWith("/game/");
    return pathname === path;
  };

  const linkClass = (path: string, options?: { exact?: boolean }) =>
    `text-sm font-medium transition-colors duration-200 cursor-pointer px-3 py-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
      isActive(path, options)
        ? "text-primary bg-primary/10 dark:bg-primary/20"
        : "text-neutral-600 dark:text-neutral-400 hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800"
    }`;

  return (
    <nav className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <Link href="/" className="text-2xl font-bold text-primary hover:opacity-80 cursor-pointer">
            FoulPlay
          </Link>

          {/* Navigation Links */}
          {isLoaded && isSignedIn && (
            <div className="flex items-center gap-2">
              <Link href="/" className={linkClass("/")}>
                Home
              </Link>
              <Link href="/create" className={linkClass("/create")}>
                Create Room
              </Link>
              <Link href="/join" className={linkClass("/join")}>
                Join Room
              </Link>
              <Link href="/active-games" className={linkClass("/active-games")}>
                Active Games
              </Link>
              <Link href="/profile" className={linkClass("/profile")}>
                Profile
              </Link>

              {/* Clerk UserButton */}
              <UserButton afterSignOutUrl="/" />
            </div>
          )}

          {/* Sign In Link (if not signed in) */}
          {isLoaded && !isSignedIn && (
            <Link
              href="/sign-in"
              className="text-sm font-medium text-primary hover:opacity-80 cursor-pointer px-3 py-2 rounded-md transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
