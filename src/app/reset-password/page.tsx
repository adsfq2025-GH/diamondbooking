import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Diamond } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Reset Password" };

export default function ResetPasswordPage() {
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
        <h1 className="text-2xl font-bold font-heading">Choose a new password</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Enter a new password for your account.
        </p>
      </div>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">← Back to sign in</Link>
      </p>
    </div>
  );
}

