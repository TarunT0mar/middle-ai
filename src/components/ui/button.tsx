import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonStyles = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315D47] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      primary: "bg-[#315D47] text-white shadow-sm hover:bg-[#254A38]",
      secondary: "border border-[#deded5] bg-white text-[#30382f] hover:bg-[#f5f5ef]",
      ghost: "text-[#626b61] hover:bg-[#f0f1eb] hover:text-[#26362c]",
      quiet: "bg-[#edf3ed] text-[#315D47] hover:bg-[#e2ece2]",
      danger: "bg-[#fff0ed] text-[#9a3c2a] hover:bg-[#ffe4de]",
    },
    size: {
      md: "h-10 px-4",
      sm: "h-8 px-3 text-xs",
      lg: "h-12 px-5",
      icon: "h-9 w-9 p-0",
    },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonStyles> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}
