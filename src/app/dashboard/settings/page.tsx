// src/app/dashboard/settings/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BusinessSettingsForm } from "@/components/dashboard/business-settings-form";
import { BusinessHoursForm } from "@/components/dashboard/business-hours-form";
import { WidgetAccessCard } from "@/components/dashboard/widget-access-card";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/onboarding");

  const business = await prisma.business.findUnique({
    where: { id: session.user.businessId },
    include: { businessHours: { orderBy: { dayOfWeek: "asc" } } },
  });

  if (!business) redirect("/onboarding");

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-base font-semibold font-heading mb-5">Business Profile</h3>
        <BusinessSettingsForm business={business} />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-base font-semibold font-heading mb-1">Business Hours</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Set your operating hours. Clients can only book within these times.
        </p>
        <BusinessHoursForm businessId={business.id} hours={business.businessHours} />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-base font-semibold font-heading mb-1">Booking Preferences</h3>
        <p className="text-sm text-muted-foreground mb-5">Configure how clients can book with you.</p>
        <BookingPrefsForm business={business} />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <WidgetAccessCard slug={business.slug} />
      </div>
    </div>
  );
}

function BookingPrefsForm({ business }: { business: { id: string; advanceBookingDays: number; minimumNoticeHours: number; bufferMinutes: number; autoConfirm: boolean; cancellationPolicy: string | null } }) {
  return (
    <form action={async (fd: FormData) => {
      "use server";
      const { requireOwner } = await import("@/lib/auth");
      const session = await requireOwner();
      const { prisma } = await import("@/lib/prisma");
      await prisma.business.update({
        where: { id: business.id, ownerId: session.user.id },
        data: {
          advanceBookingDays: Number(fd.get("advanceBookingDays")),
          minimumNoticeHours: Number(fd.get("minimumNoticeHours")),
          bufferMinutes: Number(fd.get("bufferMinutes")),
          autoConfirm: fd.get("autoConfirm") === "true",
          cancellationPolicy: fd.get("cancellationPolicy") as string,
        },
      });
    }} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Advance booking (days)", name: "advanceBookingDays", value: business.advanceBookingDays },
          { label: "Minimum notice (hours)", name: "minimumNoticeHours", value: business.minimumNoticeHours },
          { label: "Buffer between appts (min)", name: "bufferMinutes", value: business.bufferMinutes },
        ].map((f) => (
          <div key={f.name}>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{f.label}</label>
            <input
              name={f.name}
              type="number"
              defaultValue={f.value}
              min={0}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Auto-confirm bookings</label>
        <select name="autoConfirm" defaultValue={String(business.autoConfirm)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background">
          <option value="true">Yes — confirm automatically</option>
          <option value="false">No — I&apos;ll confirm manually</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Cancellation policy</label>
        <textarea
          name="cancellationPolicy"
          defaultValue={business.cancellationPolicy ?? ""}
          rows={3}
          placeholder="e.g. Cancellations must be made at least 24 hours before the appointment..."
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none"
        />
      </div>

      <button type="submit"
        className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
        Save Preferences
      </button>
    </form>
  );
}
