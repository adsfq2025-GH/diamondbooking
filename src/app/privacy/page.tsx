export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold font-heading text-foreground">Privacy Policy</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Replace this page with your actual Privacy Policy before going live.
      </p>
      <div className="mt-8 space-y-5 text-sm text-muted-foreground leading-relaxed">
        <p className="text-foreground/90">
          This Privacy Policy describes how Diamond Booking collects, uses, and shares information.
        </p>
        <h2 className="text-base font-semibold font-heading text-foreground">Information We Collect</h2>
        <p>
          We collect account information (such as name and email), booking data you or your clients
          provide, and technical data needed to operate the service.
        </p>
        <h2 className="text-base font-semibold font-heading text-foreground">How We Use Information</h2>
        <p>
          We use information to provide the service, process payments, send transactional emails,
          and improve the product.
        </p>
        <h2 className="text-base font-semibold font-heading text-foreground">Payments</h2>
        <p>
          Payments are processed by Stripe. We do not store full payment card numbers.
        </p>
        <h2 className="text-base font-semibold font-heading text-foreground">Contact</h2>
        <p>
          For privacy requests, contact your published support email address.
        </p>
      </div>
    </main>
  );
}
