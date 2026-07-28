"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/use-toast";
import { localDateTimeToUtc } from "@/lib/booking-time";

type ServiceOption = {
  id: string;
  name: string;
  duration: number;
  price: number;
  color: string;
  staffIds: string[];
};

type StaffOption = { id: string; name: string; isActive: boolean };

export function BookingForm({
  services,
  staff,
  timezone,
}: {
  services: ServiceOption[];
  staff: StaffOption[];
  timezone: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [staffId, setStaffId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId]
  );

  const eligibleStaff = useMemo(() => {
    const eligible = new Set(selectedService?.staffIds ?? []);
    return staff.filter((s) => s.isActive && (!selectedService || eligible.has(s.id)));
  }, [staff, selectedService]);

  const startTimeIso = useMemo(() => {
    if (!date || !time) return "";
    try {
      return localDateTimeToUtc(date, time, timezone).toISOString();
    } catch {
      return "";
    }
  }, [date, time, timezone]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId) return toast({ variant: "destructive", title: "Select a service" });
    if (!staffId) return toast({ variant: "destructive", title: "Select a staff member" });
    if (!customerName.trim()) return toast({ variant: "destructive", title: "Enter client name" });
    if (!customerEmail.trim()) return toast({ variant: "destructive", title: "Enter a valid email" });
    if (!date || !time) return toast({ variant: "destructive", title: "Select a date and time" });
    if (!startTimeIso) return toast({ variant: "destructive", title: "Invalid date/time" });

    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          staffId,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim().toLowerCase(),
          customerPhone: customerPhone.trim() || undefined,
          date,
          startTime: startTimeIso,
          notes: notes.trim() || undefined,
        }),
      });

      const json = (await res.json()) as { success: boolean; error?: string; data?: { id: string } };
      if (!res.ok || !json.success) {
        toast({ variant: "destructive", title: "Booking failed", description: json.error ?? "Please try again" });
        return;
      }

      toast({ variant: "success", title: "Booking created" });
      router.push(`/dashboard/bookings/${json.data!.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Service</label>
          <select
            value={serviceId}
            onChange={(e) => {
              const next = e.target.value;
              setServiceId(next);
              setStaffId("");
            }}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Staff</label>
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
          >
            <option value="">Select staff</option>
            {eligibleStaff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Client name</label>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Client email</label>
          <input
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
            placeholder="jane@example.com"
            inputMode="email"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Client phone (optional)</label>
          <input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
            placeholder="+1 555 555 5555"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Date & time</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
          placeholder="Any notes for this booking..."
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-muted-foreground">
          {selectedService ? `${selectedService.duration} min · $${Number(selectedService.price).toFixed(2)}` : null}
        </div>
        <Button type="submit" variant="gold" disabled={loading}>
          {loading ? "Creating..." : "Create Booking"}
        </Button>
      </div>
    </form>
  );
}

