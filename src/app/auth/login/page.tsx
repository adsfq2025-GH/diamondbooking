// src/app/auth/login/page.tsx
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/auth/auth-shell";
import Link from "next/link";
import { headers } from "next/headers";

export const metadata = { title: "Sign In — Diamond Booking" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const hdrs = await headers();
  const requestHost = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const requestProto = hdrs.get("x-forwarded-proto") ?? "http";
  const requestOrigin = requestHost ? `${requestProto}://${requestHost}` : undefined;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const authUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL;
  const googleEnabled = process.env.GOOGLE_OAUTH_ENABLED === "true";
  const isProduction = process.env.NODE_ENV === "production";
  let configWarning: string | undefined;
  try {
    if (googleEnabled) {
      if (!authUrl) {
        configWarning = isProduction
          ? "Google sign-in needs NEXTAUTH_URL set to https://www.diamond-booking.com in Vercel env."
          : undefined;
      } else if (authUrl.includes("localhost") && isProduction) {
        configWarning = "Google sign-in is misconfigured (NEXTAUTH_URL is set to localhost). Set NEXTAUTH_URL to https://www.diamond-booking.com in Vercel env.";
      } else if (appUrl && new URL(appUrl).origin !== new URL(authUrl).origin) {
        configWarning = isProduction
          ? "Google sign-in is misconfigured (NEXTAUTH_URL and NEXT_PUBLIC_APP_URL must match the same domain in Vercel env)."
          : undefined;
      }
    }

    if (!isProduction && !configWarning && authUrl && requestOrigin && new URL(authUrl).origin !== requestOrigin) {
      configWarning = `Sign-in base URL mismatch (NEXTAUTH_URL=${new URL(authUrl).origin}, opened=${requestOrigin}). Use the same URL you set in NEXTAUTH_URL, or set AUTH_TRUST_HOST=true for local network access.`;
    }
  } catch {
    if (googleEnabled) {
      configWarning = isProduction ? "Google sign-in is misconfigured (invalid NEXTAUTH_URL/NEXT_PUBLIC_APP_URL)." : undefined;
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
