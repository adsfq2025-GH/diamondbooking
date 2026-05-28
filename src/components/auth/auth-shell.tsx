import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

const AUTH_LOGO_SRC = "/brand/Vertical-new-logo.webp";
const HEADER_LOGO_SRC = "/brand/header-logo-white-.webp";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/20 via-primary/5 to-white" />
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />

      <div className="relative flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-primary/20 bg-white p-8 shadow-xl shadow-primary/10">
            <div className="flex flex-col items-center text-center">
              <Link href="/" className="mb-6 inline-flex items-center gap-3">
                <Image
                  src={AUTH_LOGO_SRC}
                  alt="Diamond Booking"
                  width={880}
                  height={560}
                  priority
                  className="h-64 w-auto"
                />
              </Link>

              <h1 className="text-2xl font-extrabold tracking-tight text-primary">
                {title}
              </h1>
              <p className="mt-2 text-sm text-primary/70">{subtitle}</p>
            </div>

            <div className="mt-6">{children}</div>
          </div>

          {footer && (
            <div className="mt-4 text-center text-sm text-primary/70">
              {footer}
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-10 right-10 hidden items-center gap-2 opacity-60 md:flex">
        <Image
          src={HEADER_LOGO_SRC}
          alt="Diamond Booking"
          width={200}
          height={44}
          className="h-6 w-auto"
        />
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-xs text-primary/60 px-6">
        <Link href="/terms" className="underline">
          Terms
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
      </div>
    </div>
  );
}
