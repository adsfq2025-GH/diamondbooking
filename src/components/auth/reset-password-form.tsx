"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

const schema = z
  .object({
    password: z.string().min(8, "Must be at least 8 characters").regex(/[A-Z]/, "Add an uppercase letter").regex(/[0-9]/, "Add a number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);

    if (!token) {
      setError("Missing reset token. Please use the link from your email.");
      return;
    }

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: data.password }),
    });

    const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
    if (!res.ok || !json?.success) {
      setError(json?.error ?? "Unable to reset password. Please request a new link.");
      return;
    }

    setDone(true);
  };

  if (done) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold font-heading mb-2">Password updated</h3>
        <p className="text-sm text-muted-foreground">You can now sign in with your new password.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          {error}
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input id="password" type="password" error={errors.password?.message} {...register("password")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input id="confirmPassword" type="password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />
      </div>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Reset password
      </Button>
    </form>
  );
}

