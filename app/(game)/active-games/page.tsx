"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GamesPageSkeleton } from "@/components/games/games-page-skeleton";

/**
 * Redirect /active-games to /games for backward compatibility
 */
export default function ActiveGamesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/games");
  }, [router]);

  return <GamesPageSkeleton />;
}
