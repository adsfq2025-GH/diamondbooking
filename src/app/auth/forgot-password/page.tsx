// src/app/auth/forgot-password/page.tsx
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Diamond } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Forgot Password — Diamond Booking" };

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center px-8 py-12 max-w-md mx-auto w-full">
      <div className="mb-10">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Diamond className="w-5 h-5 text-accent" />
          </div>
          <span className="text-lg font-bold font-heading text-primary">Diamond Booking</span>
        </Link>
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-heading">Reset your password</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">← Back to sign in</Link>
      </p>
    </div>
  );
}
