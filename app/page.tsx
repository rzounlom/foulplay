import Link from "next/link";

// Skip static generation to avoid Clerk key validation during build
export const dynamic = "force-dynamic";

const LANDING_BG = "/landing-bg.png";

export default function Home() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${LANDING_BG})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/65 dark:bg-black/75" aria-hidden />

      <main className="relative z-10 flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-6 md:gap-8 px-4 py-12 md:px-6 md:py-16">
        <div className="text-center space-y-3 md:space-y-4">
          <h1 className="text-2xl md:text-page-title font-bold text-white drop-shadow-md">
            FoulPlay
          </h1>
          <p className="text-base md:text-section-title text-neutral-200 md:text-neutral-100">
            Real-time social card games with friends
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full max-w-md">
          <Link
            href="/create"
            className="flex-1 min-h-[48px] flex items-center justify-center py-4 px-6 bg-primary text-white rounded-lg font-semibold text-center hover:bg-primary/90 transition-colors duration-200 ease-out cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:opacity-90 shadow-lg"
          >
            Create Room
          </Link>
          <Link
            href="/join"
            className="flex-1 min-h-[48px] flex items-center justify-center py-4 px-6 border-2 border-white/80 text-white rounded-lg font-semibold text-center hover:bg-white/15 transition-colors duration-200 ease-out cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:opacity-90 backdrop-blur-sm"
          >
            Join Room
          </Link>
        </div>

        <div className="mt-6 md:mt-8 text-center px-2">
          <p className="text-sm md:text-base text-neutral-300">
            Play interactive card-based games with friends in real-time
          </p>
        </div>
      </main>
    </div>
  );
}
