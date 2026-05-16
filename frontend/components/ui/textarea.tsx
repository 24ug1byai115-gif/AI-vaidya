import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[120px] w-full rounded-md border border-gold/25 bg-black/30 px-3 py-2 text-sm text-parchment placeholder:text-parchment/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
