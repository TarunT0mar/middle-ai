import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-[#315d47]", className)} aria-hidden="true">
      <span className="absolute left-[9px] top-[9px] h-[8px] w-[8px] rounded-[3px] bg-[#dce9d7]" />
      <span className="absolute right-[9px] top-[9px] h-[8px] w-[8px] rounded-[3px] bg-[#89ae85]" />
      <span className="absolute bottom-[9px] left-[9px] h-[8px] w-[8px] rounded-[3px] bg-[#89ae85]" />
      <span className="absolute bottom-[9px] right-[9px] h-[8px] w-[8px] rounded-[3px] bg-[#dce9d7]" />
    </span>
  );
}
