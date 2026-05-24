"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";

export function HelpTooltip({
  ariaLabel,
  content,
}: {
  ariaLabel: string;
  content: ReactNode;
}) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <HelpCircle className="w-4 h-4 opacity-70" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="end"
            className="z-50 max-w-[360px] rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60 p-4 text-sm text-gray-700"
          >
            {content}
            <Tooltip.Arrow className="fill-white" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

