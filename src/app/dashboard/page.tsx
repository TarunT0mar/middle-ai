"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, Check, CircleAlert, Clock3, MessageCircle, ShieldAlert, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDashboardData } from "@/components/dashboard-data-provider";
import { formatRelativeTime } from "@/lib/utils";
import type { Conversation, Message } from "@/lib/domain";

function Metric({ label, value, note, icon: Icon, trend }: { label: string; value: string | number; note: string; icon: typeof MessageCircle; trend?: string }) {
  return <Card className="p-5 sm:p-5"><div className="flex items-start justify-between"><span className="text-[11px] font-medium text-[#7a8478]">{label}</span><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f1f4ee] text-[#67846a]"><Icon className="h-4 w-4" /></span></div><div className="mt-3 flex items-end justify-between"><span className="text-[27px] font-semibold tracking-[-.05em] text-[#2d3a30]">{value}</span>{trend ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#67866b]"><ArrowUpRight className="h-3 w-3" />{trend}</span> : null}</div><p className="mt-1 text-[10px] text-[#9aa097]">{note}</p></Card>;
}

function latestMessage(conversation: Conversation, messages: Message[]) {
  return [...messages].filter((message) => message.conversationId === conversation.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export default function DashboardPage() {
  const { state, isLoading, error, demoMode } = useDashboardData();
  if (isLoading) return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((n) => <div key={n} className="h-[125px] animate-pulse rounded-2xl border border-[#e7e5de] bg-white" />)}</div>;
  if (error || !state) return <Card className="p-8 text-center"><CircleAlert className="mx-auto h-7 w-7 text-[#ba745b]" /><h1 className="mt-3 font-semibold">Your workspace needs a moment</h1><p className="mt-1 text-sm text-[#7c857b]">{error || "No workspace is available."}</p><Link href="/onboarding" className="mt-5 inline-block"><Button>Create workspace <ArrowRight className="h-4 w-4" /></Button></Link></Card>;

  const now = new Date();
  const today = state.conversations.filter((conversation) => new Date(conversation.createdAt).toDateString() === now.toDateString()).length;
  const answered = state.messages.filter((message) => message.sender === "ai" && message.citations.length > 0 && message.deliveryStatus !== "draft" && new Date(message.createdAt).toDateString() === now.toDateString()).length;
  const escalated = state.conversations.filter((conversation) => conversation.status === "escalated" || conversation.status === "human_active").length;
  const avgResponse = (() => {
    const pairs: number[] = [];
    for (const conversation of state.conversations) {
      const messages = state.messages.filter((message) => message.conversationId === conversation.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      for (let i = 1; i < messages.length; i += 1) {
        if (messages[i - 1].direction === "incoming" && messages[i].direction === "outgoing" && messages[i].sender === "ai" && messages[i].citations.length > 0) pairs.push(new Date(messages[i].createdAt).getTime() - new Date(messages[i - 1].createdAt).getTime());
      }
    }
    return pairs.length ? `${Math.max(1, Math.round(pairs.reduce((sum, value) => sum + value, 0) / pairs.length / 60_000))} min` : "—";
  })();
  const unanswered = state.conversations.filter((conversation) => conversation.status === "escalated").length;
  const recent = [...state.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const approved = state.sources.filter((source) => source.status === "approved").length;
  const pending = state.sources.filter((source) => source.status === "pending_review").length;

  return <div className="space-y-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-medium text-[#889186]">Your workspace, today</p><h1 className="mt-1 text-[29px] font-semibold tracking-[-.045em] text-[#29382e] sm:text-[34px]">Welcome to {state.workspace.name}</h1><p className="mt-1 text-[13px] text-[#7b857a]">Here’s what’s happening in your workspace.</p></div><Link href="/dashboard/knowledge"><Button variant="secondary"><BookOpen className="h-4 w-4" />Add business information</Button></Link></div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Conversations today" value={today} note="Across WhatsApp and the simulator" icon={MessageCircle} />
      <Metric label="Auto answers" value={answered} note="Replies citing approved information" icon={Check} />
      <Metric label="Handed to your team" value={escalated} note="Questions or actions needing a person" icon={ShieldAlert} />
      <Metric label="Average reply time" value={avgResponse} note="Based on supported AI replies" icon={Clock3} />
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.55fr_.85fr]">
      <Card className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeede7] px-5 py-4 sm:px-6"><div><h2 className="text-[14px] font-semibold text-[#39473b]">Recent conversations</h2><p className="mt-1 text-[10px] text-[#939a90]">A quick look at customer questions and handoffs</p></div><Link href="/dashboard/conversations" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#527657] hover:underline">See all <ArrowRight className="h-3.5 w-3.5" /></Link></div>
        {recent.length ? <div className="divide-y divide-[#f0efe9]">{recent.map((conversation) => { const message = latestMessage(conversation, state.messages); const tone = conversation.status === "escalated" ? "amber" : conversation.status === "human_active" ? "blue" : conversation.status === "resolved" ? "gray" : "green"; const label = conversation.status === "ai_active" ? "AI active" : conversation.status === "human_active" ? "With your team" : conversation.status === "resolved" ? "Resolved" : conversation.status === "awaiting_approval" ? "Needs approval" : "Escalated"; return <Link href={`/dashboard/conversations?conversation=${conversation.id}`} key={conversation.id} className="flex items-center gap-3 px-5 py-4 transition hover:bg-[#fafaf6] sm:px-6"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e9eee4] text-[12px] font-semibold text-[#60765f]">{conversation.customerName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-[12px] font-semibold text-[#465146]">{conversation.customerName}</span><Badge tone={tone}>{label}</Badge></span><span className="mt-1 block truncate text-[11px] text-[#90978d]">{message?.body ?? "No messages yet"}</span></span><span className="hidden shrink-0 text-[10px] text-[#a0a59d] sm:block">{formatRelativeTime(conversation.updatedAt)}</span><ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#b0b5ad]" /></Link>; })}</div> : <div className="px-6 py-14 text-center"><MessageCircle className="mx-auto h-7 w-7 text-[#9aaa96]" /><p className="mt-3 text-[12px] font-semibold text-[#586557]">No conversations yet</p><p className="mt-1 text-[11px] text-[#929a90]">Try a customer question in the simulator.</p><Link href="/demo/chat" className="mt-4 inline-block"><Button size="sm">Open simulator</Button></Link></div>}
      </Card>

      <div className="space-y-5">
        <Card className="p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[11px] font-medium text-[#858e83]">Questions waiting for you</p><p className="mt-2 text-[28px] font-semibold tracking-[-.05em] text-[#333f35]">{unanswered}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#faf3e4] text-[#9e7a35]"><CircleAlert className="h-[17px] w-[17px]" /></span></div><p className="mt-1 text-[11px] leading-5 text-[#8f968c]">When a detail isn’t confirmed, Middle AI hands it over instead of guessing.</p><Link href="/dashboard/conversations" className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-[#7b6b43] hover:underline">Review handoffs <ArrowRight className="h-3 w-3" /></Link></Card>
        <Card className="p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[11px] font-medium text-[#858e83]">Approved knowledge</p><p className="mt-2 text-[22px] font-semibold tracking-[-.04em] text-[#333f35]">{approved} <span className="text-[12px] font-medium text-[#969c92]">sources</span></p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf3eb] text-[#68866c]"><BookOpen className="h-4 w-4" /></span></div><div className="mt-3 flex items-center justify-between border-t border-[#eeede7] pt-3"><span className="text-[10px] text-[#8f968c]">{pending} waiting for review</span><Link href="/dashboard/knowledge" className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#527657] hover:underline">Open library <ArrowRight className="h-3 w-3" /></Link></div></Card>
      </div>
    </div>
    {demoMode ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e6e8df] bg-[#f0f4ed] px-4 py-3.5 sm:px-5"><div className="flex items-center gap-2.5"><Sparkles className="h-4 w-4 text-[#6c8e6b]" /><p className="text-[11px] text-[#657366]"><span className="font-semibold">Sample workspace:</span> {unanswered} conversation{unanswered === 1 ? "" : "s"} need a human response. Metrics above reflect seeded demo activity.</p></div><Link href="/dashboard/conversations" className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#527657] hover:underline">See the handoff <ArrowDownRight className="h-3 w-3" /></Link></div> : null}
  </div>;
}
