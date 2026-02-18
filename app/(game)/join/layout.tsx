import type { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  title: "Join FoulPlay - Real-time Social Card Games",
  description:
    "Join a FoulPlay game room. Play interactive card-based games with friends in real-time.",
  openGraph: {
    title: "Join FoulPlay - Real-time Social Card Games",
    description:
      "Join a FoulPlay game room. Play interactive card-based games with friends in real-time.",
    images: [
      {
        url: `${baseUrl}/social-branding.png`,
        width: 1200,
        height: 630,
        alt: "FoulPlay - Real-time Social Card Games",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Join FoulPlay - Real-time Social Card Games",
    description:
      "Join a FoulPlay game room. Play interactive card-based games with friends in real-time.",
    images: [`${baseUrl}/social-branding.png`],
  },
};

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
