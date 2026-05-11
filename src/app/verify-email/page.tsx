export const metadata = { title: "Verify Email" };

export default function VerifyEmailPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/20 via-primary/5 to-white" />
      <div className="relative flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-2xl border border-primary/20 bg-white p-8 text-center shadow-xl shadow-primary/10">
          <h1 className="text-2xl font-extrabold tracking-tight text-primary">
            Check your email
          </h1>
          <p className="mt-3 text-sm text-primary/70">
            If we have an account for you, we sent a verification link. Open it to
            continue.
          </p>
        </div>
      </div>
    </div>
  );
}
