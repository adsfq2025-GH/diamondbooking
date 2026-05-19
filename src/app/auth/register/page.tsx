// src/app/auth/register/page.tsx
import { RegisterForm } from "@/components/auth/register-form";
import { AuthShell } from "@/components/auth/auth-shell";
import Link from "next/link";

export const metadata = { title: "Create Account — Diamond Booking" };

export default async function RegisterPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const authUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL;
  const googleEnabled = process.env.GOOGLE_OAUTH_ENABLED === "true";
  let configWarning: string | undefined;
  try {
    if (googleEnabled) {
      if (!authUrl) {
        configWarning = "Google sign-up needs NEXTAUTH_URL set to https://www.diamond-booking.com in Vercel env.";
      } else if (authUrl.includes("localhost")) {
        configWarning = "Google sign-up is misconfigured (NEXTAUTH_URL is set to localhost). Set NEXTAUTH_URL to https://www.diamond-booking.com in Vercel env.";
      } else if (appUrl && new URL(appUrl).origin !== new URL(authUrl).origin) {
        configWarning = "Google sign-up is misconfigured (NEXTAUTH_URL and NEXT_PUBLIC_APP_URL must match the same domain in Vercel env).";
      }
    }
  } catch {
    if (googleEnabled) {
      configWarning = "Google sign-up is misconfigured (invalid NEXTAUTH_URL/NEXT_PUBLIC_APP_URL).";
    }
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Start your 14-day free trial — no credit card required"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
          <div className="mt-3 text-xs text-primary/60">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline">
              Privacy Policy
            </Link>
            .
          </div>
        </>
      }
    >
      <RegisterForm configWarning={configWarning} />
    </AuthShell>
  );
}
