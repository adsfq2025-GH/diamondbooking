// src/app/auth/login/page.tsx
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/auth/auth-shell";
import Link from "next/link";

export const metadata = { title: "Sign In — Diamond Booking" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const authUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL;
  const googleEnabled = process.env.GOOGLE_OAUTH_ENABLED === "true";
  let configWarning: string | undefined;
  try {
    if (googleEnabled) {
      if (!authUrl) {
        configWarning = "Google sign-in needs NEXTAUTH_URL set to https://www.diamond-booking.com in Vercel env.";
      } else if (authUrl.includes("localhost")) {
        configWarning = "Google sign-in is misconfigured (NEXTAUTH_URL is set to localhost). Set NEXTAUTH_URL to https://www.diamond-booking.com in Vercel env.";
      } else if (appUrl && new URL(appUrl).origin !== new URL(authUrl).origin) {
        configWarning = "Google sign-in is misconfigured (NEXTAUTH_URL and NEXT_PUBLIC_APP_URL must match the same domain in Vercel env).";
      }
    }
  } catch {
    if (googleEnabled) {
      configWarning = "Google sign-in is misconfigured (invalid NEXTAUTH_URL/NEXT_PUBLIC_APP_URL).";
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your Diamond Booking account"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <LoginForm callbackUrl={params.callbackUrl} error={params.error} configWarning={configWarning} />
    </AuthShell>
  );
}
