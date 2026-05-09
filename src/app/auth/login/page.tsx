// src/app/auth/login/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { Diamond } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Sign In — Diamond Booking" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (session?.user) {
    redirect(session.user.role === "SUPER_ADMIN" ? "/superadmin" : "/dashboard");
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 max-w-lg mx-auto w-full">
        {/* Logo */}
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Diamond className="w-5 h-5 text-accent" />
            </div>
            <span className="text-lg font-bold font-heading text-primary">Diamond Booking</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold font-heading text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Sign in to your account to continue</p>
        </div>

        <LoginForm
          callbackUrl={params.callbackUrl}
          error={params.error}
        />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create one free
          </Link>
        </p>
      </div>

      {/* Right: decorative panel */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12">
        <div className="max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-6">
            <Diamond className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-2xl font-bold font-heading text-white mb-3">
            Your clients, always booked
          </h2>
          <p className="text-primary-100 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
            Diamond Booking gives your business a beautiful online booking page so clients can schedule 24/7 — without the back-and-forth.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            {[["5 min", "Setup time"], ["24/7", "Booking window"], ["0", "Phone tag"]].map(([v, l]) => (
              <div key={l} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.08)" }}>
                <p className="text-lg font-bold text-accent font-heading">{v}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
