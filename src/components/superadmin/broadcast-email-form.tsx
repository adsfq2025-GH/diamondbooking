// src/components/superadmin/broadcast-email-form.tsx
"use client";

import { useState } from "react";

const RECIPIENT_OPTIONS = [
  { value: "all", label: "All users" },
  { value: "plan:STARTER", label: "Starter plan" },
  { value: "plan:PROFESSIONAL", label: "Professional plan" },
  { value: "plan:ENTERPRISE", label: "Enterprise plan" },
  { value: "plan:FREE", label: "Free plan" },
  { value: "status:PAST_DUE", label: "Past-due accounts" },
  { value: "status:TRIALING", label: "Trial users" },
];

export function BroadcastEmailForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/superadmin/emails/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: formData.get("subject"),
        body: formData.get("body"),
        recipientType: formData.get("recipientType"),
      }),
    });

    setLoading(false);
    if (res.ok) {
      setSent(true);
      (e.target as HTMLFormElement).reset();
    } else {
      setError("Failed to send email. Please try again.");
    }
  };

  if (sent) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">✓</span>
        </div>
        <p className="text-sm font-medium text-foreground">Email sent successfully</p>
        <button onClick={() => setSent(false)} className="mt-3 text-xs text-accent hover:underline">
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Recipients</label>
        <select
          name="recipientType"
          required
          className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {RECIPIENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Subject</label>
        <input
          name="subject"
          required
          placeholder="Email subject line..."
          className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Message</label>
        <textarea
          name="body"
          required
          rows={6}
          placeholder="Email body content..."
          className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 text-sm font-medium bg-accent text-primary rounded-lg hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Email"}
        </button>
        <p className="text-xs text-muted-foreground self-center">
          This will send an email immediately to all matching users.
        </p>
      </div>
    </form>
  );
}
