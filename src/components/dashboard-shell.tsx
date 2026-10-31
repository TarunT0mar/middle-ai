"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, ChevronDown, Headset, LayoutDashboard, MessageCircle, Package, Settings2, Sparkles, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboardData } from "@/components/dashboard-data-provider";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/conversations", label: "Conversations", icon: MessageCircle },
  { href: "/dashboard/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/dashboard/products", label: "Products & services", icon: Package },
  { href: "/dashboard/settings", label: "Settings", icon: Settings2 },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { state, demoMode } = useDashboardData();
  const workspaceName = state?.workspace.name ?? "Olive & Oak Studio";
  const needsAttention = state?.conversations.filter((item) => item.status === "escalated" || item.status === "awaiting_approval").length ?? 0;

  const nav = (
    <>
      <div className="mb-7 flex items-center gap-3 px-2">
        <BrandMark />
        <div><p className="text-[15px] font-bold tracking-[-0.03em] text-[#28382c]">middle<span className="text-[#57825e]">.</span>ai</p><p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#93988e]">Owner workspace</p></div>
      </div>
      <div className="mb-6 rounded-2xl border border-[#e6e7de] bg-white/75 p-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf2e9] text-sm font-bold text-[#3f6547]">{workspaceName.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold text-[#354138]">{workspaceName}</p><p className="text-[10px] text-[#92978d]">{state?.workspace.businessType || "Business workspace"}</p></div>
          <ChevronDown className="h-4 w-4 text-[#93988e]" />
        </div>
      </div>
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a0a49d]">Workspace</p>
      <nav aria-label="Workspace navigation" className="space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          const count = href === "/dashboard/conversations" && needsAttention > 0 ? needsAttention : null;
          return <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={cn("group flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition", active ? "bg-[#eaf1e9] text-[#315d47]" : "text-[#6e776e] hover:bg-[#f0f1ea] hover:text-[#36483a]")}>
            <Icon className={cn("h-[17px] w-[17px]", active ? "text-[#47724f]" : "text-[#92998f]")} />
            <span className="flex-1">{label}</span>
            {count ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f5e6ce] px-1 text-[10px] font-bold text-[#8b6224]">{count}</span> : null}
          </Link>;
        })}
      </nav>
      <div className="mt-8 border-t border-[#e7e5de] pt-5">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a0a49d]">Try it out</p>
        <Link href="/demo/chat" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#627365] transition hover:bg-white hover:text-[#315d47]"><Headset className="h-[17px] w-[17px] text-[#788d77]" />Customer simulator<ChevronDown className="ml-auto h-3.5 w-3.5 -rotate-90 text-[#a1a69d]" /></Link>
      </div>
      <div className="mt-auto rounded-2xl border border-[#e4e6dd] bg-[#f2f4ee] p-4">
        <div className="mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#57825e]" /><span className="text-[12px] font-semibold text-[#435447]">Knowledge stays yours</span></div>
        <p className="text-[11px] leading-[1.65] text-[#7d877c]">Answers come only from information you’ve reviewed and approved.</p>
        <Link href="/dashboard/knowledge" className="mt-3 inline-flex text-[11px] font-semibold text-[#47724f] hover:underline">Review knowledge <span className="ml-1">→</span></Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f7f6f1] text-[#263229]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] flex-col border-r border-[#e5e4dc] bg-[#fbfaf7] px-4 py-6 lg:flex">{nav}</aside>
      {mobileOpen ? <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation backdrop" className="absolute inset-0 bg-[#1f2b22]/30" onClick={() => setMobileOpen(false)} /><aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-[#e5e4dc] bg-[#fbfaf7] px-4 py-6"><div className="mb-3 flex justify-end"><Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X className="h-4 w-4" /></Button></div>{nav}</aside></div> : null}
      <div className="min-h-screen lg:pl-[250px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[#e5e4dc] bg-[#f9f8f4]/95 px-4 backdrop-blur-sm sm:px-7 lg:px-9">
          <div className="flex items-center gap-3"><Button className="lg:hidden" variant="ghost" size="icon" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></Button><div className="hidden h-8 w-px bg-[#e4e3dc] lg:block" /><Badge tone={demoMode ? "amber" : "green"} className="gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${demoMode ? "bg-[#c5913a]" : "bg-[#668f69]"}`} />{demoMode ? "Demo workspace" : "Connected workspace"}</Badge>{demoMode ? <span className="hidden text-[11px] text-[#8f958c] sm:inline">Sample business data</span> : null}</div>
          <div className="flex items-center gap-2.5"><Link href="/demo/chat" className="hidden sm:block"><Button variant="secondary" size="sm"><Headset className="h-3.5 w-3.5" />Open simulator</Button></Link><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e6ecdf] text-[11px] font-bold text-[#49674a]" aria-label="Workspace avatar">{workspaceName.slice(0, 1).toUpperCase()}</span></div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 pb-12 pt-7 sm:px-7 sm:pt-9 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
