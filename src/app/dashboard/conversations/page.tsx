"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ArrowDown, Check, CheckCheck, CircleAlert, Headset, LoaderCircle, MessageCircle, Pause, Play, Send, ShieldAlert, Sparkles, UserRound } from "lucide-react";
import { useDashboardData } from "@/components/dashboard-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import type { Conversation, Message } from "@/lib/domain";
import { formatRelativeTime } from "@/lib/utils";

function statusText(status: Conversation["status"]) {
  if (status === "ai_active") return "AI active";
  if (status === "awaiting_approval") return "Awaiting approval";
  if (status === "escalated") return "Escalated";
  if (status === "human_active") return "Human active";
  return "Resolved";
}

function statusTone(status: Conversation["status"]) {
  if (status === "ai_active") return "green" as const;
  if (status === "awaiting_approval") return "amber" as const;
  if (status === "escalated") return "red" as const;
  if (status === "human_active") return "blue" as const;
  return "gray" as const;
}

function PreviewMessage({ message, sourceNames, onEditDraft, onApproveDraft, onProposeFaq, busy }: { message: Message; sourceNames: string[]; onEditDraft: () => void; onApproveDraft: () => void; onProposeFaq: () => void; busy: boolean }) {
  const customer = message.direction === "incoming";
  const human = message.sender === "owner";
  return <div className={`flex ${customer ? "justify-start" : "justify-end"}`}><div className={`max-w-[84%] rounded-2xl px-4 py-3 ${customer ? "rounded-bl-md bg-white text-[#4c594f] shadow-[0_1px_3px_rgba(40,50,40,.04)]" : human ? "rounded-br-md bg-[#315d47] text-white" : "rounded-br-md border border-[#dce8d9] bg-[#edf4ea] text-[#47584a]"}`}>
    {!customer ? <p className={`mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.1em] ${human ? "text-[#d4e7d5]" : "text-[#719070]"}`}>{human ? <UserRound className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}{human ? "You" : "Middle AI"}{message.deliveryStatus === "draft" ? <span className="rounded-full bg-[#f8edcf] px-2 py-0.5 text-[#8c6a2a]">Draft</span> : null}</p> : null}
    <p className="whitespace-pre-wrap text-[12px] leading-[1.7]">{message.body}</p>
    <div className={`mt-2 flex items-center justify-end gap-1 text-[9px] ${human ? "text-[#d2e2d2]" : "text-[#98a097]"}`}>{formatRelativeTime(message.createdAt)}{!customer ? message.deliveryStatus === "draft" ? <CircleAlert className="h-3 w-3" /> : <CheckCheck className="h-3 w-3" /> : null}</div>
    {message.citations.length ? <div className="mt-2 flex flex-wrap gap-1.5">{sourceNames.map((name) => <span key={name} className="rounded-full border border-[#d8e3d5] bg-white/70 px-2 py-1 text-[9px] text-[#687c69]">Source · {name}</span>)}</div> : null}
    {message.deliveryStatus === "draft" ? <div className="mt-3 flex flex-wrap gap-2 border-t border-[#dce8d9] pt-2.5"><Button size="sm" onClick={onApproveDraft} disabled={busy}><Check className="h-3 w-3" />Approve & send</Button><Button size="sm" variant="secondary" onClick={onEditDraft} disabled={busy}>Edit draft</Button></div> : null}
    {human && message.sender === "owner" ? <button type="button" onClick={onProposeFaq} disabled={busy} className="mt-2 block text-[9px] font-semibold text-[#dcebd9] underline-offset-2 hover:underline">Propose as FAQ</button> : null}
  </div></div>;
}

export default function ConversationsPage() {
  const { state, isLoading, mutate } = useDashboardData();
  const [requested] = useState<string | null>(() => typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("conversation"));
  const [selectedId, setSelectedId] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingDraft, setEditingDraft] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");

  const activeId = state?.conversations.some((item) => item.id === selectedId) ? selectedId : state?.conversations.some((item) => item.id === requested) ? requested ?? "" : state?.conversations[0]?.id ?? "";
  const conversation = state?.conversations.find((item) => item.id === activeId) ?? null;
  const messages = useMemo(() => state?.messages.filter((message) => message.conversationId === activeId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) ?? [], [state, activeId]);

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!conversation || !reply.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try { await mutate({ action: "manual_reply", conversationId: conversation.id, message: reply.trim() }); setReply(""); setNotice("Your reply was added to the conversation."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Your reply could not be saved."); }
    setBusy(false);
  }

  async function runAction(action: Record<string, unknown>, success: string) {
    setBusy(true); setError(""); setNotice("");
    try { await mutate(action); setNotice(success); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "This action could not be completed."); }
    setBusy(false);
  }

  async function saveDraft(message: Message) {
    setBusy(true); setError("");
    try { await mutate({ action: "draft_edit", messageId: message.id, conversationId: message.conversationId, message: draftText }); setEditingDraft(null); setNotice("Draft updated. It still needs your approval before sending."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Draft could not be saved."); }
    setBusy(false);
  }

  if (isLoading || !state) return <div className="grid h-[650px] animate-pulse grid-cols-[300px_1fr] gap-4"><div className="rounded-2xl border border-[#e7e5de] bg-white" /><div className="rounded-2xl border border-[#e7e5de] bg-white" /></div>;
  const sorted = [...state.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const status = conversation?.status ?? "ai_active";

  return <div className="space-y-5">
    <div><p className="text-[11px] font-medium text-[#889186]">Your customer inbox</p><h1 className="mt-1 text-[29px] font-semibold tracking-[-.045em] text-[#29382e] sm:text-[34px]">Conversations</h1><p className="mt-1 text-[13px] text-[#7b857a]">Step in whenever a customer needs a person.</p></div>
    <div className="grid min-h-[640px] gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Card className="flex min-h-[300px] flex-col overflow-hidden"><div className="border-b border-[#eeede7] px-4 py-4"><div className="flex items-center justify-between"><h2 className="text-[12px] font-semibold text-[#475347]">Inbox</h2><Badge tone="gray">{state.conversations.length}</Badge></div><p className="mt-1 text-[10px] text-[#969c93]">Recent customer conversations</p></div>{sorted.length ? <div className="scrollbar-thin flex-1 overflow-y-auto">{sorted.map((item) => { const latest = [...state.messages].filter((message) => message.conversationId === item.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]; const selected = item.id === activeId; return <button key={item.id} onClick={() => { setSelectedId(item.id); setError(""); setNotice(""); }} className={`flex w-full items-start gap-3 border-b border-[#f1f0eb] px-4 py-4 text-left transition ${selected ? "bg-[#f0f5ee]" : "hover:bg-[#fafaf6]"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e9eee4] text-[10px] font-semibold text-[#60765f]">{item.customerName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-[11px] font-semibold text-[#465146]">{item.customerName}</span><span className="shrink-0 text-[9px] text-[#9ba197]">{formatRelativeTime(item.updatedAt)}</span></span><span className="mt-1 block truncate text-[10px] text-[#8b9389]">{latest?.body ?? "No messages yet"}</span><span className="mt-2 flex items-center gap-1.5"><Badge tone={statusTone(item.status)} className="text-[9px]">{statusText(item.status)}</Badge><span className="text-[9px] text-[#a1a69e]">{item.channel === "web_demo" ? "Simulator" : "WhatsApp"}</span></span></span>{item.unread > 0 ? <span className="mt-1 h-2 w-2 rounded-full bg-[#d49a45]" /> : null}</button>; })}</div> : <div className="flex flex-1 flex-col items-center justify-center px-5 text-center"><MessageCircle className="h-7 w-7 text-[#9aaa96]" /><p className="mt-3 text-[11px] font-semibold text-[#566255]">Your inbox is ready</p><p className="mt-1 text-[10px] text-[#92998f]">Use the customer simulator to start a sample conversation.</p></div>}</Card>

      <Card className="flex min-h-[620px] flex-col overflow-hidden">{conversation ? <><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeede7] px-4 py-3.5 sm:px-5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9eee4] text-[10px] font-semibold text-[#60765f]">{conversation.customerName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><h2 className="text-[12px] font-semibold text-[#425044]">{conversation.customerName}</h2><p className="mt-0.5 text-[10px] text-[#959c92]">{conversation.customerPhone} · {conversation.channel === "web_demo" ? "Web simulator" : "WhatsApp"}</p></div></div><div className="flex items-center gap-2"><Badge tone={statusTone(status)}>{statusText(status)}</Badge>{status !== "resolved" ? <Button size="sm" variant={status === "ai_active" ? "secondary" : "quiet"} disabled={busy} onClick={() => void runAction({ action: "conversation_status", conversationId: conversation.id, status: status === "ai_active" ? "human_active" : "ai_active" }, status === "ai_active" ? "AI paused. Your team has the conversation." : "AI resumed for this conversation.")}>{status === "ai_active" ? <><Pause className="h-3.5 w-3.5" />Pause AI</> : <><Play className="h-3.5 w-3.5" />Resume AI</>}</Button> : null}<Button size="sm" variant="ghost" disabled={busy || status === "resolved"} onClick={() => void runAction({ action: "conversation_status", conversationId: conversation.id, status: "resolved" }, "Conversation marked resolved.")}>Resolve</Button></div></div>
        <div className="flex items-center gap-2 border-b border-[#f0efe9] bg-[#fafaf7] px-4 py-2.5 text-[10px] text-[#879085] sm:px-5"><ShieldAlert className="h-3.5 w-3.5 text-[#839480]" />AI cites approved sources and pauses after an escalation or when your team takes over.</div>
        <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto bg-[#f8f8f4] px-4 py-5 sm:px-6">{messages.map((message) => { const sourceNames = message.citations.map((id) => state.sources.find((source) => source.id === id)?.name).filter((name): name is string => Boolean(name)); const editing = editingDraft === message.id; return editing ? <div key={message.id} className="ml-auto max-w-[84%] rounded-2xl border border-[#dce8d9] bg-[#edf4ea] p-3"><label className="mb-2 block text-[9px] font-bold uppercase tracking-[.1em] text-[#719070]">Edit AI draft</label><Textarea value={draftText} onChange={(event) => setDraftText(event.target.value)} rows={3} maxLength={2000} /><div className="mt-2 flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={() => setEditingDraft(null)}>Cancel</Button><Button size="sm" onClick={() => void saveDraft(message)} disabled={busy}>Save draft</Button></div><p className="mt-2 text-[9px] text-[#8d988a]">Saving does not send this message. Approve it when it’s ready.</p></div> : <PreviewMessage key={message.id} message={message} sourceNames={sourceNames} busy={busy} onEditDraft={() => { setEditingDraft(message.id); setDraftText(message.body); }} onApproveDraft={() => void runAction({ action: "draft_approve", conversationId: conversation.id }, "Draft approved.")} onProposeFaq={() => void runAction({ action: "propose_faq", conversationId: conversation.id, messageId: message.id }, "A FAQ proposal was added to your knowledge review.")} />; })}</div>
        {error ? <p role="alert" className="mx-4 mt-3 rounded-xl bg-[#fff0ed] px-3 py-2 text-[10px] text-[#9a4734] sm:mx-5">{error}</p> : null}{notice ? <p role="status" className="mx-4 mt-3 rounded-xl bg-[#edf5ed] px-3 py-2 text-[10px] text-[#3d7048] sm:mx-5">{notice}</p> : null}
        {status !== "resolved" ? <form onSubmit={sendReply} className="border-t border-[#eeede7] bg-white p-3.5 sm:p-4"><label className="sr-only" htmlFor="owner-reply">Write a reply</label><div className="flex items-end gap-2"><Textarea id="owner-reply" rows={2} maxLength={2000} value={reply} onChange={(event) => setReply(event.target.value)} placeholder={status === "ai_active" ? "Take over and reply to the customer…" : "Write a reply to the customer…"} className="min-h-[58px] flex-1 rounded-2xl bg-[#fbfbf8] text-[11px]" /><Button type="submit" size="icon" aria-label="Send manual reply" disabled={busy || !reply.trim()} className="h-10 w-10 rounded-xl">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div><p className="mt-2 flex items-center gap-1.5 px-1 text-[9px] text-[#9ba197]"><Headset className="h-3 w-3" />A manual reply pauses AI for this conversation. <ArrowDown className="ml-auto h-3 w-3" /></p></form> : <div className="border-t border-[#eeede7] bg-white px-5 py-4 text-center text-[10px] text-[#90988e]">This conversation is resolved. Resume AI if the customer comes back.</div>}
      </> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf3ea] text-[#668568]"><MessageCircle className="h-6 w-6" /></span><h2 className="mt-4 text-[14px] font-semibold text-[#4c594d]">Select a conversation</h2><p className="mt-1 max-w-[300px] text-[11px] leading-5 text-[#929a90]">Open a customer thread to review context, answer manually or change the AI handoff state.</p></div>}</Card>
    </div>
  </div>;
}
