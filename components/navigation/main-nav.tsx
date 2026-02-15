"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function MainNav() {
  const { isSignedIn, isLoaded } = useUser();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on escape; lock body scroll when open
  useEffect(() => {
    if (!sidebarOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // Don't show nav on auth pages
  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) {
    return null;
  }

  const isActive = (path: string, options?: { exact?: boolean }) => {
    if (!pathname) return false;
    if (options?.exact) return pathname === path;
    if (path === "/active-games") return pathname === path || pathname.startsWith("/game/");
    return pathname === path;
  };

  const linkClass = (path: string, options?: { exact?: boolean }) =>
    `text-sm font-medium transition-colors duration-200 cursor-pointer px-3 py-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
      isActive(path, options)
        ? "text-primary bg-primary/10 dark:bg-primary/20"
        : "text-neutral-600 dark:text-neutral-400 hover:text-primary hover:bg-surface-muted"
    }`;

  const navLinks = (
    <>
      <Link href="/" className={linkClass("/")} onClick={() => setSidebarOpen(false)}>
        Home
      </Link>
      <Link href="/create" className={linkClass("/create")} onClick={() => setSidebarOpen(false)}>
        Create Room
      </Link>
      <Link href="/join" className={linkClass("/join")} onClick={() => setSidebarOpen(false)}>
        Join Room
      </Link>
      <Link href="/active-games" className={linkClass("/active-games")} onClick={() => setSidebarOpen(false)}>
        Active Games
      </Link>
      <Link href="/profile" className={linkClass("/profile")} onClick={() => setSidebarOpen(false)}>
        Profile
      </Link>
    </>
  );

  return (
    <>
      <nav className="border-b border-border bg-surface shadow-sm dark:shadow-none">
        <div className="container mx-auto px-4 py-2 md:py-4">
          <div className="flex items-center justify-between">
            {/* Logo/Brand */}
            <Link href="/" className="text-2xl font-bold text-primary hover:opacity-80 cursor-pointer shrink-0">
              FoulPlay
            </Link>

            {/* Loading skeleton for nav (desktop) */}
            {!isLoaded && (
              <div className="hidden lg:flex items-center gap-2" aria-hidden>
                <div className="h-8 w-14 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                <div className="h-8 w-20 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                <div className="h-8 w-16 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                <div className="h-8 w-24 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                <div className="h-8 w-14 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
              </div>
            )}

            {/* Loading skeleton for nav (mobile) */}
            {!isLoaded && (
              <div className="flex lg:hidden items-center gap-2" aria-hidden>
                <div className="h-10 w-10 rounded-md bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
              </div>
            )}

            {/* Desktop: full nav links (lg and up) */}
            {isLoaded && isSignedIn && (
              <div className="hidden lg:flex items-center gap-2">
                {navLinks}
                <ThemeToggle />
                <div className="cursor-pointer *:cursor-pointer inline-flex">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </div>
            )}

            {/* Mobile/Tablet: hamburger + theme + user only */}
            {isLoaded && isSignedIn && (
              <div className="flex lg:hidden items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-md text-neutral-600 dark:text-neutral-400 hover:text-primary hover:bg-surface-muted transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  aria-label="Open menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <ThemeToggle />
                <div className="cursor-pointer *:cursor-pointer inline-flex">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </div>
            )}

            {/* Sign In (desktop) */}
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

      {/* Mobile/Tablet slide-out sidebar */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9998] lg:hidden transition-opacity"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div
            className="fixed top-0 right-0 h-full w-[min(320px,85vw)] bg-surface border-l border-border shadow-xl z-[9999] lg:hidden flex flex-col animate-slide-in-right"
            role="dialog"
            aria-label="Navigation menu"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="text-lg font-bold text-primary">Menu</span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-md text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-surface-muted cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label="Close menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-1 p-4">
              {isLoaded && isSignedIn && navLinks}
              {isLoaded && !isSignedIn && (
                <Link
                  href="/sign-in"
                  className="text-sm font-medium text-primary hover:opacity-80 cursor-pointer px-3 py-2 rounded-md"
                  onClick={() => setSidebarOpen(false)}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
