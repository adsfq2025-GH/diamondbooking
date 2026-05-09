// src/app/auth/register/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { Diamond } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Create Account — Diamond Booking" };

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col justify-center px-8 py-12 max-w-lg mx-auto w-full">
      <div className="mb-10">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Diamond className="w-5 h-5 text-accent" />
          </div>
          <span className="text-lg font-bold font-heading text-primary">Diamond Booking</span>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold font-heading text-foreground">Create your account</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Start your 14-day free trial — no credit card required
        </p>
      </div>

      <RegisterForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
      </p>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="underline">Terms of Service</Link> and{" "}
        <Link href="/privacy" className="underline">Privacy Policy</Link>
      </p>
    </div>
  );
}
