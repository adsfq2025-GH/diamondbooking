"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EnvironmentChooser({
  area,
  action,
}: {
  area: "staff" | "portal";
  action: "login" | "register";
}) {
  const router = useRouter();
  const [slug, setSlug] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = slug.trim().toLowerCase();
    if (!value) return;
    router.push(`/b/${encodeURIComponent(value)}/${area}/${action}`);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="businessSlug">Business slug</Label>
        <Input
          id="businessSlug"
          placeholder="janes-salon"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          autoComplete="off"
        />
      </div>
      <Button type="submit" variant="gold" size="lg" className="w-full">
        Continue
      </Button>
    </form>
  );
}

