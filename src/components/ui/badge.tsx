import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  green: "border-[#d1e5d5] bg-[#edf6ee] text-[#3b6d49]",
  amber: "border-[#eadcba] bg-[#fbf5e6] text-[#8a6721]",
  red: "border-[#efd1c9] bg-[#fff1ed] text-[#9c4c3a]",
  gray: "border-[#e6e5de] bg-[#f5f4f0] text-[#6e746d]",
  blue: "border-[#d4e1ec] bg-[#edf4fa] text-[#526f85]",
} as const;

export function Badge({ tone = "gray", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof variants }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none", variants[tone], className)} {...props} />;
}
