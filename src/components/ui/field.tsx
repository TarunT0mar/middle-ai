import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const fieldStyles = "w-full rounded-xl border border-[#deded5] bg-white px-3.5 py-2.5 text-sm text-[#283229] outline-none transition placeholder:text-[#a3a69e] focus:border-[#6c9a79] focus:ring-2 focus:ring-[#315d47]/10 disabled:bg-[#f5f5ef]";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldStyles, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldStyles, "min-h-28 resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: InputHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldStyles, "appearance-auto", className)} {...props} />;
}
