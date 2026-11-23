import type { MetadataRoute } from "next";

/**
 * Installable web app metadata for iPhone Add to Home Screen.
 * Intentionally no service worker — gameplay and Clerk sessions must not be cached.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FoulPlay",
    short_name: "FoulPlay",
    description:
      "Real-time sports watch-party card game. Create a private room, invite friends, play.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A0A0A",
    theme_color: "#0A0A0A",
    categories: ["games", "entertainment", "sports"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
