// src/components/superadmin/platform-settings-form.tsx
"use client";

import { useState } from "react";
import type { PlatformSettings } from "@prisma/client";
import { ToggleSwitch } from "@/components/superadmin/toggle-switch";

export function PlatformSettingsForm({ settings }: { settings: PlatformSettings }) {
  const [loading, setLoading] = useState(false);
  const [maintenance, setMaintenance] = useState(settings.maintenanceMode);
  const [notifyNewSignup, setNotifyNewSignup] = useState(settings.notifyNewSignup);
  const [notifyPaymentFailure, setNotifyPaymentFailure] = useState(settings.notifyPaymentFailure);
  const [notifySubscriptionEnd, setNotifySubscriptionEnd] = useState(settings.notifySubscriptionEnd);
  const [notifyBusinessSuspend, setNotifyBusinessSuspend] = useState(settings.notifyBusinessSuspend);
  const [saved, setSaved] = useState(false);

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    await fetch("/api/superadmin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platformName: formData.get("platformName"),
        supportEmail: formData.get("supportEmail"),
        defaultTrialDays: Number(formData.get("defaultTrialDays")),
        termsUrl: formData.get("termsUrl"),
        privacyUrl: formData.get("privacyUrl"),
        maintenanceMode: maintenance,
        maintenanceMessage: formData.get("maintenanceMessage"),
        notifyNewSignup,
        notifyPaymentFailure,
        notifySubscriptionEnd,
        notifyBusinessSuspend,
      }),
    });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Field = ({ label, name, defaultValue, type = "text", placeholder = "" }: {
    label: string; name: string; defaultValue?: string | number; type?: string; placeholder?: string;
  }) => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </div>
  );

  const TextAreaField = ({
    label,
    name,
    defaultValue,
    placeholder = "",
  }: {
    label: string;
    name: string;
    defaultValue?: string;
    placeholder?: string;
  }) => (
    <div className="col-span-2">
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
        {label}
      </label>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </div>
  );

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Platform Name" name="platformName" defaultValue={settings.platformName} />
        <Field label="Support Email" name="supportEmail" defaultValue={settings.supportEmail} type="email" />
        <Field label="Default Trial Days" name="defaultTrialDays" defaultValue={settings.defaultTrialDays} type="number" />
        <Field label="Terms URL" name="termsUrl" defaultValue={settings.termsUrl ?? ""} placeholder="https://..." />
        <Field label="Privacy URL" name="privacyUrl" defaultValue={settings.privacyUrl ?? ""} placeholder="https://..." />
        <TextAreaField
          label="Maintenance Message"
          name="maintenanceMessage"
          defaultValue={settings.maintenanceMessage}
          placeholder="What should users see during maintenance?"
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-secondary rounded-lg border border-border">
        <div>
          <p className="text-sm font-medium text-foreground">Maintenance Mode</p>
          <p className="text-xs text-muted-foreground">All tenant dashboards and booking pages will show a maintenance notice</p>
        </div>
        <ToggleSwitch checked={maintenance} onChange={setMaintenance} />
      </div>

      <div className="rounded-lg border border-border bg-secondary p-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">Admin Notifications</p>
          <p className="text-xs text-muted-foreground">Controls which platform events trigger superadmin notifications.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-3">
            <div className="text-sm text-foreground">New signups</div>
            <ToggleSwitch checked={notifyNewSignup} onChange={setNotifyNewSignup} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-3">
            <div className="text-sm text-foreground">Payment failures</div>
            <ToggleSwitch checked={notifyPaymentFailure} onChange={setNotifyPaymentFailure} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-3">
            <div className="text-sm text-foreground">Subscription ended</div>
            <ToggleSwitch checked={notifySubscriptionEnd} onChange={setNotifySubscriptionEnd} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-3">
            <div className="text-sm text-foreground">Business suspended</div>
            <ToggleSwitch checked={notifyBusinessSuspend} onChange={setNotifyBusinessSuspend} />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2.5 text-sm font-medium bg-accent text-primary rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
      >
        {loading ? "Saving..." : saved ? "✓ Saved" : "Save Settings"}
      </button>
    </form>
  );
}
