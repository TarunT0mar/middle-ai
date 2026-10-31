"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CheckCheck, CircleAlert, Clock3, Headset, LoaderCircle, MoreHorizontal, Plus, Send, ShieldCheck, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import type { WorkspaceState } from "@/lib/domain";
import { formatRelativeTime } from "@/lib/utils";

const suggestions = ["Gold package ka kya price hai? Album milega?", "Wedding Photography Gold mein kya included hai?", "Gold package mein drone coverage hai?", "When will our wedding photos be ready?"];

export default function DemoChatPage() {
  const [state, setState] = useState<WorkspaceState | null>(null);
  const [conversationId, setConversationId] = useState(() => {
    if (typeof window === "undefined") return "";
    let id = sessionStorage.getItem("middle-ai-demo-conversation");
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem("middle-ai-demo-conversation", id); }
    return id;
  });
  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [delivered, setDelivered] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadState() {
    let response = await fetch("/api/app", { cache: "no-store" });
    let payload = await response.json();
    if (!response.ok && response.status === 401) {
      response = await fetch("/api/app?demo=1", { cache: "no-store" });
      payload = await response.json();
    }
    if (response.ok && !payload.state) {
      response = await fetch("/api/app?demo=1", { cache: "no-store" });
      payload = await response.json();
    }
    if (!response.ok) throw new Error(payload.error || "Could not load the demo workspace.");
    setState(payload.state);
  }

  useEffect(() => {
    Promise.resolve().then(loadState).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load the demo workspace."))
      .finally(() => setLoading(false));
  }, []);

  const messages = useMemo(() => state?.messages.filter((item) => item.conversationId === conversationId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) ?? [], [state, conversationId]);
  const conversation = state?.conversations.find((item) => item.id === conversationId);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages.length, typing]);

  async function send(value: string) {
    const clean = value.trim();
    if (!clean || !conversationId || typing) return;
    setMessage(""); setError(""); setDelivered(false); setTyping(true);
    await new Promise((resolve) => window.setTimeout(resolve, 420));
    try {
      const response = await fetch("/api/app", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "simulate_message", workspaceId: state?.workspace.id, conversationId, customerName: "Demo customer", customerPhone: "Web simulator", message: clean }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The assistant could not respond.");
      await loadState();
      setDelivered(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The assistant could not respond."); }
    setTyping(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); void send(message);
  }

  function newConversation() {
    const id = crypto.randomUUID(); sessionStorage.setItem("middle-ai-demo-conversation", id); setConversationId(id); setError(""); setDelivered(false);
  }

  const statusLabel = !conversation ? "Ready to chat" : conversation.status === "escalated" ? "Sent to the team" : conversation.status === "awaiting_approval" ? "Draft for the owner" : conversation.status === "human_active" ? "Team is replying" : conversation.status === "resolved" ? "Resolved" : "Assistant is ready";

  return <main className="min-h-screen bg-[#f2f3ed] text-[#2b392e]">
    <header className="flex h-[66px] items-center justify-between border-b border-[#e4e6dd] bg-[#fbfaf6] px-4 sm:px-7"><Link href="/" className="flex items-center gap-2.5"><BrandMark className="h-8 w-8 rounded-[11px]" /><span className="text-[14px] font-bold tracking-[-.04em]">middle<span className="text-[#5e8a62]">.</span>ai</span><span className="hidden text-[10px] text-[#9aa096] sm:inline">Customer simulator</span></Link><div className="flex items-center gap-2"><Link href="/dashboard/conversations" className="hidden sm:inline-flex"><Button size="sm" variant="secondary"><Headset className="h-3.5 w-3.5" />Owner inbox</Button></Link><Link href="/" className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#7d877c] hover:bg-[#f0f1ea]" aria-label="Back to home"><ArrowLeft className="h-4 w-4" /></Link></div></header>

    <div className="mx-auto grid max-w-[1180px] gap-5 px-3 py-5 sm:px-7 sm:py-8 lg:grid-cols-[.7fr_1.3fr] lg:gap-8">
      <section className="hidden pt-4 lg:block"><Badge tone="green"><span className="h-1.5 w-1.5 rounded-full bg-[#648a68]" />Live demo · sample business</Badge><h1 className="mt-5 max-w-[400px] text-[34px] font-semibold leading-[1.14] tracking-[-.045em] text-[#2c3a2e]">Ask the studio anything.</h1><p className="mt-3 max-w-[340px] text-[13px] leading-6 text-[#7e887c]">Try a confirmed detail. Then ask about something the studio hasn’t approved. The assistant will tell you when it needs to check.</p>
          <Card className="mt-7 p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf3ea] text-[#648166]"><BookOpen className="h-4 w-4" /></span><div><p className="text-[12px] font-semibold text-[#48574a]">What’s in this demo</p><p className="mt-0.5 text-[10px] text-[#92998f]">A fictional photography studio</p></div></div><ul className="mt-4 space-y-2.5 text-[10px] text-[#737e73]"><li className="flex gap-2"><CheckCheck className="h-3.5 w-3.5 text-[#759375]" />Three wedding packages and prices</li><li className="flex gap-2"><CheckCheck className="h-3.5 w-3.5 text-[#759375]" />Gold inclusions and delivery time</li><li className="flex gap-2"><CircleAlert className="h-3.5 w-3.5 text-[#b58b45]" />No approved fact about drone coverage</li></ul></Card>
        <div className="mt-5 rounded-2xl border border-[#e5e6dc] bg-[#f8f8f3] p-4"><div className="flex items-start gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#67876a]" /><p className="text-[10px] leading-5 text-[#80897f]">The sample assistant uses only approved demo facts. This simulator doesn’t send messages to WhatsApp.</p></div></div>
        <Link href="/dashboard" className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold text-[#56745b] hover:underline">Back to owner dashboard <ArrowRight className="h-3.5 w-3.5" /></Link>
      </section>

      <section className="mx-auto w-full max-w-[570px] overflow-hidden rounded-[26px] border border-[#e2e4dc] bg-[#fffefa] shadow-[0_16px_60px_rgba(41,54,42,.10)] lg:mx-0">
        <div className="flex items-center justify-between border-b border-[#eeede7] bg-[#fffefa] px-4 py-3.5 sm:px-5"><div className="flex min-w-0 items-center gap-3"><span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e3ebdf] text-[12px] font-bold text-[#5c795e]">O<span className="text-[#89a17e]">&</span>O<span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#77a278]" /></span><div className="min-w-0"><h2 className="truncate text-[12px] font-semibold text-[#3e4b40]">{state?.workspace.name ?? "Olive & Oak Studio"}</h2><p className="mt-0.5 flex items-center gap-1.5 text-[9px] text-[#8b948a]"><span className="h-1.5 w-1.5 rounded-full bg-[#81a77d]" />{statusLabel}</p></div></div><div className="flex items-center gap-1"><Button size="icon" variant="ghost" aria-label="Start a new conversation" onClick={newConversation}><Plus className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Conversation details"><MoreHorizontal className="h-4 w-4" /></Button></div></div>
        <div className="flex h-[min(72vh,650px)] min-h-[480px] flex-col bg-[#f3f2e9]">
          <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-3.5 py-4 sm:px-5 sm:py-5"><div className="mx-auto mb-3 max-w-[280px] rounded-xl bg-white/70 px-3 py-2 text-center text-[9px] leading-4 text-[#96998e]">This is a sample conversation with a fictional business. No WhatsApp message will be sent.</div>
            {!messages.length && !loading ? <div className="mx-auto mt-9 max-w-[290px] rounded-2xl bg-white px-4 py-3 text-center shadow-[0_1px_2px_rgba(30,40,31,.04)]"><span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#eef4eb] text-[#638267]"><Sparkles className="h-4 w-4" /></span><p className="mt-2 text-[11px] font-semibold text-[#4c594e]">Hello, how can we help?</p><p className="mt-1 text-[10px] leading-5 text-[#879086]">Ask a question about the studio’s wedding packages or services.</p></div> : null}
            {loading ? <div className="mx-auto mt-10 flex max-w-[250px] items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[10px] text-[#899287]"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Opening the sample conversation…</div> : null}
            {messages.map((item) => { const isCustomer = item.direction === "incoming"; const isDraft = item.deliveryStatus === "draft"; const isEscalated = item.sender === "ai" && !item.citations.length && conversation?.status === "escalated"; return <div key={item.id} className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}><div className={`max-w-[86%] rounded-[17px] px-3.5 py-2.5 shadow-[0_1px_2px_rgba(25,36,27,.04)] ${isCustomer ? "rounded-br-[5px] bg-[#e4efdf] text-[#435044]" : "rounded-bl-[5px] bg-white text-[#4f5b51]"}`}>{!isCustomer ? <p className="mb-1 flex items-center gap-1 text-[8px] font-bold uppercase tracking-[.11em] text-[#739078]">{isEscalated ? <CircleAlert className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}{isEscalated ? "Needs team review" : "Middle AI"}{isDraft ? <Badge tone="amber" className="ml-1 px-1.5 py-0.5 text-[8px]">Draft</Badge> : null}</p> : null}<p className="whitespace-pre-wrap text-[11px] leading-[1.7]">{item.body}</p><div className={`mt-1.5 flex items-center justify-end gap-1 text-[8px] ${isCustomer ? "text-[#859082]" : "text-[#a0a59d]"}`}>{formatRelativeTime(item.createdAt)}{isCustomer ? <CheckCheck className="h-2.5 w-2.5" /> : null}</div></div></div>; })}
            {typing ? <div className="flex justify-start"><div className="flex items-center gap-1.5 rounded-[17px] rounded-bl-[5px] bg-white px-3.5 py-3"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#91a18c] [animation-delay:-.24s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#91a18c] [animation-delay:-.12s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#91a18c]" /><span className="ml-1 text-[9px] text-[#959d92]">Middle AI is replying</span></div></div> : null}
            {error ? <p role="alert" className="mx-auto max-w-[90%] rounded-xl bg-[#fff0ed] px-3 py-2 text-[10px] text-[#9a4734]">{error}</p> : null}<div ref={bottomRef} />
          </div>
          {delivered && conversation ? <div className="flex items-center justify-between gap-3 border-t border-[#e8e7de] bg-white px-4 py-2.5"><p className="text-[9px] text-[#7e887e]">Conversation saved to your owner inbox.</p><Link href={`/dashboard/conversations?conversation=${conversationId}`} className="text-[9px] font-semibold text-[#507255] hover:underline">View inbox</Link></div> : null}
          {!messages.length ? <div className="border-t border-[#e7e6dd] bg-[#faf9f5] px-3 py-3"><p className="mb-2 px-1 text-[9px] font-semibold uppercase tracking-[.11em] text-[#92988f]">Try a question</p><div className="flex gap-2 overflow-x-auto pb-1">{suggestions.map((question) => <button key={question} type="button" onClick={() => void send(question)} disabled={typing || loading} className="shrink-0 rounded-full border border-[#e3e5dc] bg-white px-3 py-2 text-[9px] font-medium text-[#667365] transition hover:border-[#bbcfb8] hover:bg-[#f4f7f1] disabled:opacity-50">{question}</button>)}</div></div> : null}
          <form onSubmit={submit} className="flex items-center gap-2 border-t border-[#e5e4dc] bg-[#fbfaf7] px-3 py-3 sm:px-4"><label htmlFor="demo-message" className="sr-only">Type a customer message</label><Input id="demo-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Type a message…" maxLength={2000} disabled={typing || loading} className="h-10 rounded-full border-[#e4e3dc] bg-white px-4 text-[11px]" /><Button size="icon" aria-label="Send message" disabled={!message.trim() || typing || loading} className="h-10 w-10 shrink-0 rounded-full">{typing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></form>
        </div>
      </section>
    </div>
    <footer className="mx-auto flex max-w-[1180px] items-center justify-between px-4 pb-5 text-[9px] text-[#959b91] sm:px-7"><Link href="/dashboard" className="inline-flex items-center gap-1.5 font-semibold text-[#607765] sm:hidden"><ArrowLeft className="h-3 w-3" />Owner dashboard</Link><span className="hidden sm:block">Middle AI · Sample workspace</span><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3 w-3" />A demo, not a connected WhatsApp number</span></footer>
  </main>;
}
