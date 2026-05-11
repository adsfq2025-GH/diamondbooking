// src/app/auth/login/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/auth/auth-shell";
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
      <LoginForm callbackUrl={params.callbackUrl} error={params.error} />
    </AuthShell>
  );
}
