export const metadata = { title: "Verify Email" };

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold font-heading text-foreground">Check your email</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          If we have an account for you, we sent a verification link. Open it to continue.
        </p>
      </div>
    </main>
  );
}
