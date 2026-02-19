"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAppUrl, getMarketingUrl } from "@/lib/host";

export function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Something went wrong");
        return;
      }
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  };

  const appUrl = getAppUrl();
  const marketingUrl = getMarketingUrl();

  return (
    <div className="h-screen flex flex-col text-white overflow-hidden relative bg-neutral-950">
      {/* Full-viewport background - behind navbar, content, and footer */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-70"
        style={{ backgroundImage: "url(/social-branding.png)" }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/40 to-neutral-950/90" aria-hidden />
      <header className="relative z-10 shrink-0 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={marketingUrl} className="text-xl font-bold text-primary">
            FoulPlay
          </Link>
          <Link
            href={appUrl}
            className="text-sm font-medium text-neutral-300 hover:text-white transition-colors"
          >
            Play on Web
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 flex items-center justify-center px-4 py-8 min-h-0 overflow-auto">
          <div className="w-full max-w-md">
            <h1 className="text-3xl md:text-4xl font-bold text-center mb-2">
              Join the waitlist
            </h1>
            <p className="text-neutral-300 text-center mb-8">
              Be the first to know when FoulPlay launches on mobile.
            </p>

            {status === "success" ? (
              <div className="text-center p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-emerald-400 font-medium">You&apos;re on the list!</p>
                <p className="text-sm text-neutral-400 mt-1">
                  We&apos;ll notify you when the app is ready.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "loading"}
                  className="bg-neutral-900 border-neutral-700 text-white h-12 text-base"
                  required
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={status === "loading"}
                  className="h-12 text-base"
                >
                  {status === "loading" ? "Joining..." : "Join waitlist"}
                </Button>
                {status === "error" && (
                  <p className="text-sm text-red-400 text-center">{errorMessage}</p>
                )}
              </form>
            )}

            <p className="text-center text-neutral-500 text-sm mt-6">
              <Link href={appUrl} className="text-primary hover:underline">
                Play now on the web
              </Link>
              {" · "}
              <Link href={marketingUrl} className="text-primary hover:underline">
                Back to home
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 shrink-0 border-t border-white/10 bg-black/20 backdrop-blur-sm py-3">
        <div className="container mx-auto px-4 text-center text-neutral-500 text-xs">
          <p>© {new Date().getFullYear()} FoulPlay. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
