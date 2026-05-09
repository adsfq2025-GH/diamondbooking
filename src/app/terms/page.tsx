export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold font-heading text-foreground">Terms of Service</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Replace this page with your actual Terms of Service before going live.
      </p>
      <div className="mt-8 space-y-5 text-sm text-muted-foreground leading-relaxed">
        <p className="text-foreground/90">
          These Terms govern access to and use of the Diamond Booking service. By using the service,
          you agree to these Terms.
        </p>
        <h2 className="text-base font-semibold font-heading text-foreground">Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for
          all activities that occur under your account.
        </p>
        <h2 className="text-base font-semibold font-heading text-foreground">Billing</h2>
        <p>
          Paid plans are billed in advance. Payments are processed by Stripe. Subscription changes
          and cancellations take effect according to your billing settings.
        </p>
        <h2 className="text-base font-semibold font-heading text-foreground">Acceptable Use</h2>
        <p>
          You agree not to misuse the service, attempt unauthorized access, or interfere with normal
          operation.
        </p>
        <h2 className="text-base font-semibold font-heading text-foreground">Contact</h2>
        <p>
          For questions about these Terms, contact support at your published support email address.
        </p>
      </div>
    </main>
  );
}
