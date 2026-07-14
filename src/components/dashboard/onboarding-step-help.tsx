"use client";

import type { ReactNode } from "react";
import { HelpTooltip } from "@/components/ui/help-tooltip";

type Help = {
  ariaLabel: string;
  content: ReactNode;
};

const ITEM: Record<number, Help> = {
  1: {
    ariaLabel: "Help for choosing a plan",
    content: (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-[#0b5c8b]">Choose your plan</div>
        <div className="space-y-2 text-sm">
          <div>
            <div className="font-semibold">What this does</div>
            <div className="text-gray-600">Selects the features and limits for your account.</div>
          </div>
          <div>
            <div className="font-semibold">Why it matters</div>
            <div className="text-gray-600">Your plan controls what you can enable later (widget features, automations, and limits).</div>
          </div>
          <div>
            <div className="font-semibold">Recommended example</div>
            <div className="text-gray-600">Start with Starter, upgrade later once you’re consistently booking online.</div>
          </div>
          <div>
            <div className="font-semibold">Common mistakes</div>
            <div className="text-gray-600">Picking a higher tier before you’ve validated your services and availability.</div>
          </div>
        </div>
      </div>
    ),
  },
  2: {
    ariaLabel: "Help for business information",
    content: (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-[#0b5c8b]">Business information</div>
        <div className="space-y-2 text-sm">
          <div>
            <div className="font-semibold">What this does</div>
            <div className="text-gray-600">Creates your business profile and booking page URL automatically.</div>
          </div>
          <div>
            <div className="font-semibold">Why it matters</div>
            <div className="text-gray-600">This is what customers see on your booking page and confirmation messages.</div>
          </div>
          <div>
            <div className="font-semibold">Best practices</div>
            <div className="text-gray-600">Use your public brand name and the timezone where appointments happen.</div>
          </div>
          <div>
            <div className="font-semibold">Common mistakes</div>
            <div className="text-gray-600">Wrong timezone or phone number (causes scheduling confusion and missed calls).</div>
          </div>
        </div>
      </div>
    ),
  },
  3: {
    ariaLabel: "Help for payment setup",
    content: (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-[#0b5c8b]">Payment setup</div>
        <div className="space-y-2 text-sm">
          <div>
            <div className="font-semibold">What this does</div>
            <div className="text-gray-600">Saves a payment method to activate your free trial.</div>
          </div>
          <div>
            <div className="font-semibold">Why it matters</div>
            <div className="text-gray-600">It unlocks the dashboard and keeps your account active when the trial ends.</div>
          </div>
          <div>
            <div className="font-semibold">Best practices</div>
            <div className="text-gray-600">Use the business card you want billed monthly.</div>
          </div>
          <div>
            <div className="font-semibold">Common mistakes</div>
            <div className="text-gray-600">Using a personal card you can’t access later.</div>
          </div>
        </div>
      </div>
    ),
  },
  4: {
    ariaLabel: "Help for setup overview",
    content: (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-[#0b5c8b]">Setup overview</div>
        <div className="space-y-2 text-sm text-gray-600">
          <div>You’re about to set business hours, staff availability, services, pricing rules, and the widget design.</div>
          <div>Best practice: finish hours + services first so the booking page can show availability.</div>
        </div>
      </div>
    ),
  },
  5: {
    ariaLabel: "Help for business hours",
    content: (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-[#0b5c8b]">Business hours</div>
        <div className="space-y-2 text-sm">
          <div>
            <div className="font-semibold">What this does</div>
            <div className="text-gray-600">Sets when customers can book appointments.</div>
          </div>
          <div>
            <div className="font-semibold">Why it matters</div>
            <div className="text-gray-600">No hours means no availability—customers won’t see bookable times.</div>
          </div>
          <div>
            <div className="font-semibold">Recommended example</div>
            <div className="text-gray-600">Mon–Fri 9:00–5:00. Keep weekends closed until you’re ready.</div>
          </div>
          <div>
            <div className="font-semibold">Common mistakes</div>
            <div className="text-gray-600">Forgetting to toggle a day “open” (it remains closed).</div>
          </div>
        </div>
      </div>
    ),
  },
  6: {
    ariaLabel: "Help for team setup",
    content: (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-[#0b5c8b]">Team & availability</div>
        <div className="space-y-2 text-sm">
          <div>
            <div className="font-semibold">What this does</div>
            <div className="text-gray-600">Adds team members and their weekly working hours.</div>
          </div>
          <div>
            <div className="font-semibold">Why it matters</div>
            <div className="text-gray-600">Availability comes from staff schedules—if no one is available, no time slots show.</div>
          </div>
          <div>
            <div className="font-semibold">Best practices</div>
            <div className="text-gray-600">Start with 1 team member (even if it’s you). Add others later.</div>
          </div>
          <div>
            <div className="font-semibold">Common mistakes</div>
            <div className="text-gray-600">Leaving all days “off” or setting open/close times backwards.</div>
          </div>
        </div>
      </div>
    ),
  },
  7: {
    ariaLabel: "Help for services setup",
    content: (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-[#0b5c8b]">Services</div>
        <div className="space-y-2 text-sm">
          <div>
            <div className="font-semibold">What this does</div>
            <div className="text-gray-600">Defines what customers can book, how long it takes, and the base price.</div>
          </div>
          <div>
            <div className="font-semibold">Why it matters</div>
            <div className="text-gray-600">Services drive pricing and appointment duration.</div>
          </div>
          <div>
            <div className="font-semibold">Recommended example</div>
            <div className="text-gray-600">“Standard Cleaning — 2 hours — $180”. Keep it simple, then refine.</div>
          </div>
          <div>
            <div className="font-semibold">Common mistakes</div>
            <div className="text-gray-600">Too many services at launch. Start with your top 3–5.</div>
          </div>
        </div>
      </div>
    ),
  },
  8: {
    ariaLabel: "Help for pricing and intake",
    content: (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-[#0b5c8b]">Pricing & intake</div>
        <div className="space-y-2 text-sm">
          <div>
            <div className="font-semibold">What this does</div>
            <div className="text-gray-600">Adds optional add-ons, recurring discounts, and booking questions.</div>
          </div>
          <div>
            <div className="font-semibold">Why it matters</div>
            <div className="text-gray-600">This is how the widget calculates totals in real time.</div>
          </div>
          <div>
            <div className="font-semibold">Best practices</div>
            <div className="text-gray-600">Start with 1–3 add-ons and 1–2 simple questions, then expand later.</div>
          </div>
          <div>
            <div className="font-semibold">Common mistakes</div>
            <div className="text-gray-600">Adding lots of questions that slow down booking conversion.</div>
          </div>
        </div>
      </div>
    ),
  },
  9: {
    ariaLabel: "Help for widget customization",
    content: (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-[#0b5c8b]">Widget customization</div>
        <div className="space-y-2 text-sm text-gray-600">
          <div>Pick colors, fonts, and display options. Customers will see this on your booking page and embedded widget.</div>
          <div>Best practice: match your website’s primary color and keep the layout clean.</div>
        </div>
      </div>
    ),
  },
  10: {
    ariaLabel: "Help for embed code",
    content: (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-[#0b5c8b]">Booking link & embed code</div>
        <div className="space-y-2 text-sm text-gray-600">
          <div>Use the booking link to share directly, or paste the embed snippet into your website.</div>
          <div>Best practice: test the embed on your site and complete a test booking end-to-end.</div>
        </div>
      </div>
    ),
  },
  11: {
    ariaLabel: "Help for final review",
    content: (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-[#0b5c8b]">Final review</div>
        <div className="space-y-2 text-sm text-gray-600">
          <div>Quick check before launch. You can always change settings later in the dashboard.</div>
          <div>Best practice: verify hours, services, and that your booking page shows time slots.</div>
        </div>
      </div>
    ),
  },
};

export function OnboardingStepHelp({ step }: { step: number }) {
  const item = ITEM[step];
  if (!item) return null;
  return <HelpTooltip ariaLabel={item.ariaLabel} content={item.content} />;
}

