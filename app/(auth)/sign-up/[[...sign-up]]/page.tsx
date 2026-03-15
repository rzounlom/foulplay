import { SignUp } from "@clerk/nextjs";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = params.redirect_url || "/games";

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp
        afterSignUpUrl={redirectUrl}
        fallbackRedirectUrl={redirectUrl}
      />
    </div>
  );
}
