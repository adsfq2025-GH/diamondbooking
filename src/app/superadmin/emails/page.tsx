// src/app/superadmin/emails/page.tsx
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { BroadcastEmailForm } from "@/components/superadmin/broadcast-email-form";
import { Mail, Send } from "lucide-react";

export const metadata = { title: "Email & Notifications" };
export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const sentEmails = await prisma.broadcastEmail.findMany({
    where: { status: "sent" },
    orderBy: { sentAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold font-heading text-foreground">Email & Notifications</h2>
        <p className="text-sm text-muted-foreground">Send broadcast emails and manage platform notifications</p>
      </div>

      {/* Broadcast tool */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Broadcast Email</h3>
        </div>
        <BroadcastEmailForm />
      </div>

      {/* Email history */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Sent Broadcasts</h3>
        </div>
        {sentEmails.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No broadcasts sent yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sentEmails.map((email) => (
              <div key={email.id} className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{email.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sent to: {email.recipientType} · {email.recipientCount} recipients
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0 ml-4">
                    {email.sentAt ? formatDateTime(email.sentAt) : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
