import { AutomationsSettings } from "@/components/dashboard/automations-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Automations" };
export const dynamic = "force-dynamic";

export default function AutomationsPage() {
  const emailReady = !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL;
  const smsReady =
    !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN && !!process.env.TWILIO_FROM_NUMBER;
  const cronSecretSet = !!process.env.AUTOMATIONS_CRON_SECRET;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Automations</h1>
        <p className="text-muted-foreground">System status for booking confirmations and notifications.</p>
      </div>

      <AutomationsSettings emailReady={emailReady} smsReady={smsReady} cronSecretSet={cronSecretSet} />

      <Card>
        <CardHeader>
          <CardTitle>Runner Endpoint</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">Scheduled reminders, cancellations, and follow-ups are delivered by a cron trigger.</p>
          <p className="text-sm text-muted-foreground">POST /api/automations/run</p>
        </CardContent>
      </Card>
    </div>
  );
}
