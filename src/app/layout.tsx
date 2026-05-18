// src/app/layout.tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Diamond Booking — Online Booking for Growing Businesses",
    template: "%s | Diamond Booking",
  },
  description:
    "Let your clients book appointments 24/7. The booking platform built for salons, barbershops, clinics, fitness studios, and more.",
  keywords: [
    "online booking",
    "appointment scheduling",
    "salon booking",
    "business booking software",
    "appointment management",
  ],
  authors: [{ name: "Diamond Booking" }],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://www.diamond-booking.com"
  ),
  openGraph: {
    type: "website",
    siteName: "Diamond Booking",
    title: "Diamond Booking — Online Booking for Growing Businesses",
    description:
      "Let your clients book appointments 24/7. Set up in minutes. Start for free.",
  },
  icons: {
    icon: "/brand/favicon.ico",
    shortcut: "/brand/favicon.ico",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${dmSans.variable} font-body antialiased`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
