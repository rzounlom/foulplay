import Link from "next/link";

// Skip static generation to avoid Clerk key validation during build
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-black">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-8 px-6 py-16">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-black dark:text-white">
            FoulPlay
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400">
            Real-time social card games with friends
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Link
            href="/create"
            className="flex-1 py-4 px-6 bg-primary text-white rounded-lg font-semibold text-center hover:bg-primary/90 transition-colors duration-200 ease-out cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Create Room
          </Link>
          <Link
            href="/join"
            className="flex-1 py-4 px-6 border-2 border-primary text-primary rounded-lg font-semibold text-center hover:bg-primary/10 transition-colors duration-200 ease-out cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Join Room
          </Link>
        </div>

        <div className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
          <p>Play interactive card-based games with friends in real-time</p>
        </div>
      </main>
    </div>
  );
}
