import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Automations" };
export const dynamic = "force-dynamic";

export default function AutomationsPage() {
  const emailReady = !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Automations</h1>
        <p className="text-muted-foreground">System status for booking confirmations and notifications.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Automations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            Booking confirmation emails and owner notifications are sent automatically when a booking is created.
          </p>
          <p className="text-sm text-muted-foreground">
            Status: {emailReady ? "Ready" : "Missing RESEND_API_KEY / RESEND_FROM_EMAIL"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

