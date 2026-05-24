// src/components/dashboard/business-settings-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TIMEZONE_OPTIONS, INDUSTRY_OPTIONS, generateSlug } from "@/lib/utils";
import type { Business } from "@prisma/client";
import { toast } from "@/lib/use-toast";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

const schema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  slug: z.string().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().max(500).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  timezone: z.string(),
  primaryColor: z.string(),
  welcomeMessage: z.string().max(300).optional(),
});

type FormData = z.infer<typeof schema>;

export function BusinessSettingsForm({ business }: { business: Business }) {
  const router = useRouter();

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        name: business.name,
        slug: business.slug,
        description: business.description ?? "",
        phone: business.phone ?? "",
        email: business.email ?? "",
        website: business.website ?? "",
        address: business.address ?? "",
        city: business.city ?? "",
        state: business.state ?? "",
        zipCode: business.zipCode ?? "",
        timezone: business.timezone,
        primaryColor: business.primaryColor,
        welcomeMessage: business.welcomeMessage ?? "",
      },
    });

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/business", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast({ title: "Settings saved", variant: "success" });
      router.refresh();
    } else {
      const json = await res.json();
      toast({ title: "Error", description: json.error ?? "Failed to save", variant: "destructive" });
    }
  };

  const F = ({ label, name, type = "text", placeholder = "" }: { label: string; name: keyof FormData; type?: string; placeholder?: string }) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type={type} placeholder={placeholder} error={errors[name]?.message as string} {...register(name)} />
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <F label="Business Name" name="name" />
        <div className="space-y-1.5">
          <Label htmlFor="slug">Booking URL slug</Label>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground shrink-0">/book/</span>
            <Input id="slug" error={errors.slug?.message} {...register("slug")} />
          </div>
        </div>
        <F label="Phone" name="phone" type="tel" placeholder="+1 (555) 000-0000" />
        <F label="Contact Email" name="email" type="email" placeholder="hello@yourbiz.com" />
        <F label="Website" name="website" type="url" placeholder="https://..." />
        <div className="space-y-1.5 col-span-2">
          <Label htmlFor="address">Address</Label>
          <AddressAutocomplete
            value={watch("address") ?? ""}
            onChange={(v) => setValue("address", v)}
            onSelect={(v) => {
              setValue("address", v.street);
              setValue("city", v.city);
              setValue("state", v.state);
              setValue("zipCode", v.zip);
            }}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
            placeholder="Start typing your address…"
          />
          {errors.address?.message && <div className="text-xs text-destructive">{errors.address.message}</div>}
        </div>
        <F label="City" name="city" />
        <F label="State / Province" name="state" />
        <F label="Zip / Postal Code" name="zipCode" />
        <div className="space-y-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <select id="timezone" className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" {...register("timezone")}>
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="primaryColor">Brand Color</Label>
          <div className="flex items-center gap-2">
            <input type="color" id="primaryColor" {...register("primaryColor")}
              className="w-10 h-10 rounded cursor-pointer border border-border" />
            <Input {...register("primaryColor")} className="flex-1" />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Business Description</Label>
        <textarea
          id="description"
          rows={3}
          placeholder="Tell clients about your business..."
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          {...register("description")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="welcomeMessage">Welcome Message (shown on booking page)</Label>
        <Input id="welcomeMessage" placeholder="e.g. Welcome! We look forward to seeing you." {...register("welcomeMessage")} />
      </div>

      <Button type="submit" loading={isSubmitting}>Save Changes</Button>
    </form>
  );
}
