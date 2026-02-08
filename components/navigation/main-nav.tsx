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

  const isActive = (path: string) => pathname === path;

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
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className={`text-sm font-medium transition-colors cursor-pointer ${
                  isActive("/")
                    ? "text-primary"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-primary"
                }`}
              >
                Home
              </Link>
              <Link
                href="/create"
                className={`text-sm font-medium transition-colors cursor-pointer ${
                  isActive("/create")
                    ? "text-primary"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-primary"
                }`}
              >
                Create Room
              </Link>
              <Link
                href="/join"
                className={`text-sm font-medium transition-colors cursor-pointer ${
                  isActive("/join")
                    ? "text-primary"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-primary"
                }`}
              >
                Join Room
              </Link>
              <Link
                href="/active-games"
                className={`text-sm font-medium transition-colors cursor-pointer ${
                  isActive("/active-games")
                    ? "text-primary"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-primary"
                }`}
              >
                Active Games
              </Link>
              <Link
                href="/profile"
                className={`text-sm font-medium transition-colors cursor-pointer ${
                  isActive("/profile")
                    ? "text-primary"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-primary"
                }`}
              >
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
              className="text-sm font-medium text-primary hover:opacity-80 cursor-pointer"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
