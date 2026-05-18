"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

type FormData = z.infer<typeof schema>;

export function CustomerRegisterForm({ businessSlug }: { businessSlug: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    const res = await fetch("/api/auth/register-customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, businessSlug }),
    });

    const json = await res.json();
    if (!res.ok) {
      setServerError(json.error ?? "Something went wrong");
      return;
    }

    const result = await signIn("credentials", {
      email: data.email.toLowerCase(),
      password: data.password,
      businessSlug,
      redirect: false,
    });

    if (result?.error) {
      router.push(`/b/${businessSlug}/portal/login`);
      return;
    }

    router.push(`/post-login?callbackUrl=${encodeURIComponent(`/b/${businessSlug}/portal`)}`);
  };

  return (
    <div className="space-y-5">
      {serverError && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-xs text-destructive">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" placeholder="Jane Smith" autoComplete="name" error={errors.name?.message} {...register("name")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <p className="text-xs text-muted-foreground">Minimum 8 characters, one uppercase, one number</p>
        </div>

        <Button type="submit" variant="gold" size="lg" className="w-full" loading={isSubmitting}>
          Create client account
        </Button>
      </form>
    </div>
  );
}
