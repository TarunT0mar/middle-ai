"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { AlertCircle, ArrowUpFromLine, Check, CheckCircle2, ChevronDown, ChevronUp, Clock3, FileText, LoaderCircle, Pencil, Plus, RefreshCw, ShieldCheck, Trash2, UploadCloud, X } from "lucide-react";
import { useDashboardData } from "@/components/dashboard-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/field";
import type { KnowledgeSource } from "@/lib/domain";
import { formatRelativeTime } from "@/lib/utils";

function sourceTone(status: KnowledgeSource["status"]) {
  if (status === "approved") return "green";
  if (status === "pending_review") return "amber";
  if (status === "error") return "red";
  if (status === "processing") return "blue";
  return "gray";
}

export default function KnowledgePage() {
  const { state, isLoading, mutate, refresh } = useDashboardData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteBusy, setPasteBusy] = useState(false);
  const [pasteError, setPasteError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true); setUploadError(""); setUploadMessage(`Reading ${file.name}…`);
    const form = new FormData(); form.set("file", file);
    try {
      const response = await fetch("/api/ingest", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "That file could not be processed.");
      setUploadMessage(`${file.name} is ready for your review.`);
      await refresh();
    } catch (cause) { setUploadError(cause instanceof Error ? cause.message : "That file could not be processed."); setUploadMessage(""); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files[0]);
  }

  async function pasteText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPasteBusy(true); setPasteError("");
    const form = new FormData(event.currentTarget);
    try {
      await mutate({ action: "knowledge_add", name: form.get("name"), type: "TEXT", text: form.get("text") });
      setPasteOpen(false);
    } catch (cause) { setPasteError(cause instanceof Error ? cause.message : "Could not save this information."); }
    setPasteBusy(false);
  }

  async function sourceAction(action: string, source: KnowledgeSource) {
    setBusyId(source.id);
    try { await mutate({ action, id: source.id }); }
    catch (cause) { setUploadError(cause instanceof Error ? cause.message : "This action could not be completed."); }
    setBusyId(null);
  }

  async function saveSource(event: FormEvent<HTMLFormElement>, source: KnowledgeSource) {
    event.preventDefault(); setBusyId(source.id);
    const form = new FormData(event.currentTarget);
    try { await mutate({ action: "source_edit", id: source.id, name: form.get("name"), text: form.get("text") }); setEditing(null); }
    catch (cause) { setUploadError(cause instanceof Error ? cause.message : "This source could not be saved."); }
    setBusyId(null);
  }

  if (isLoading || !state) return <div className="h-[360px] animate-pulse rounded-2xl border border-[#e7e5de] bg-white" />;
  const pending = state.sources.filter((source) => source.status === "pending_review");
  const approved = state.sources.filter((source) => source.status === "approved");
  const other = state.sources.filter((source) => source.status === "rejected" || source.status === "error");
  const sources = [...pending, ...approved, ...other];

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-medium text-[#889186]">The information behind every answer</p><h1 className="mt-1 text-[29px] font-semibold tracking-[-.045em] text-[#29382e] sm:text-[34px]">Knowledge library</h1><p className="mt-1 text-[13px] text-[#7b857a]">Review each source before your assistant can use it with customers.</p></div><Button variant="secondary" onClick={() => setPasteOpen((value) => !value)}><Plus className="h-4 w-4" />Paste information</Button></div>

    <div className="grid gap-3 sm:grid-cols-3"><Card className="px-4 py-3.5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf3ea] text-[#668568]"><FileText className="h-4 w-4" /></span><div><p className="text-[10px] text-[#8d958b]">Approved sources</p><p className="mt-0.5 text-[16px] font-semibold text-[#3c4a3d]">{approved.length}</p></div></div></Card><Card className="px-4 py-3.5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fbf3e4] text-[#9d7c39]"><Clock3 className="h-4 w-4" /></span><div><p className="text-[10px] text-[#8d958b]">Needs your review</p><p className="mt-0.5 text-[16px] font-semibold text-[#3c4a3d]">{pending.length}</p></div></div></Card><Card className="px-4 py-3.5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf3ea] text-[#668568]"><ShieldCheck className="h-4 w-4" /></span><div><p className="text-[10px] text-[#8d958b]">Products approved</p><p className="mt-0.5 text-[16px] font-semibold text-[#3c4a3d]">{state.products.filter((product) => product.status === "approved").length}</p></div></div></Card></div>

    <label onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} className={`group flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed px-5 py-7 text-center transition ${dragging ? "border-[#73a078] bg-[#edf5ec]" : "border-[#cfd8cc] bg-[#f3f5ef] hover:border-[#98b89a] hover:bg-[#f0f4ec]"}`}>
      <input ref={fileRef} type="file" className="sr-only" accept=".pdf,.docx,.txt,.md,.csv,.xlsx,.png,.jpg,.jpeg,.webp" onChange={(event: ChangeEvent<HTMLInputElement>) => void upload(event.target.files?.[0])} />
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#648367] shadow-sm"><UploadCloud className="h-5 w-5" /></span><span className="mt-3 text-[13px] font-semibold text-[#4a594b]">{uploading ? uploadMessage || "Processing your file…" : "Drop a file here, or browse"}</span><span className="mt-1.5 text-[10px] text-[#899287]">PDF · DOCX · TXT · CSV · XLSX · Images · Up to 15 MB</span><span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#dce5d9] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#5e795e]"><ArrowUpFromLine className="h-3 w-3" />Choose a file</span>
    </label>
    {uploadError ? <p role="alert" className="flex items-start gap-2 rounded-xl bg-[#fff0ed] px-3.5 py-3 text-[11px] text-[#9a4734]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{uploadError}</p> : null}
    {uploadMessage && !uploading ? <p role="status" className="flex items-center gap-2 rounded-xl bg-[#edf5ed] px-3.5 py-3 text-[11px] text-[#3d7048]"><CheckCircle2 className="h-4 w-4" />{uploadMessage}</p> : null}

    {pasteOpen ? <Card className="p-5 sm:p-6"><div className="mb-4 flex items-start justify-between"><div><h2 className="text-[14px] font-semibold text-[#3b493d]">Add information by hand</h2><p className="mt-1 text-[10px] text-[#8c958a]">Paste verified business details. They’ll stay hidden until you approve them.</p></div><Button variant="ghost" size="icon" aria-label="Close paste form" onClick={() => setPasteOpen(false)}><X className="h-4 w-4" /></Button></div><form onSubmit={pasteText} className="space-y-3"><label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Title</span><Input name="name" required maxLength={120} placeholder="e.g. Delivery and returns" /></label><label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Approved business information</span><Textarea name="text" required minLength={1} maxLength={120000} rows={6} placeholder="Paste a price list, FAQ, policy or product information…" /></label>{pasteError ? <p role="alert" className="text-[11px] text-[#9a4734]">{pasteError}</p> : null}<div className="flex justify-end"><Button type="submit" disabled={pasteBusy}>{pasteBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save for review</Button></div></form></Card> : null}

    <div><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-[14px] font-semibold text-[#3b493d]">Sources</h2><p className="mt-1 text-[10px] text-[#92998f]">Extracted details are suggestions until you approve them.</p></div><span className="text-[10px] text-[#939b91]">{sources.length} total</span></div>
      {sources.length ? <div className="space-y-3">{sources.map((source) => { const isOpen = expanded === source.id || source.status === "pending_review"; const isEditing = editing === source.id; return <Card key={source.id} className="overflow-hidden"><div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2f3ed] text-[#758674]"><FileText className="h-4 w-4" /></span><div className="min-w-[150px] flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-[12px] font-semibold text-[#455146]">{source.name}</h3><Badge tone={sourceTone(source.status)}>{source.status.replace("_", " ")}</Badge></div><p className="mt-1 text-[10px] text-[#929a90]">{source.type} · Added {formatRelativeTime(source.createdAt)} · Updated {formatRelativeTime(source.updatedAt)}</p></div><div className="flex items-center gap-1">{source.status === "pending_review" ? <><Button size="sm" variant="secondary" onClick={() => void sourceAction("source_reject", source)} disabled={busyId === source.id}>Reject</Button><Button size="sm" onClick={() => void sourceAction("source_approve", source)} disabled={busyId === source.id}>{busyId === source.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Approve</Button></> : null}<Button size="icon" variant="ghost" aria-label={isOpen ? "Collapse source" : "Expand source"} onClick={() => setExpanded(isOpen && source.status !== "pending_review" ? null : source.id)}>{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button><Button size="icon" variant="ghost" aria-label={`Delete ${source.name}`} onClick={() => window.confirm(`Delete ${source.name} and its approved information?`) && void sourceAction("source_delete", source)}><Trash2 className="h-4 w-4 text-[#9d6a59]" /></Button></div></div>
        {isOpen ? <div className="border-t border-[#efeee8] bg-[#fcfcf9] px-4 py-4 sm:px-5">{isEditing ? <form onSubmit={(event) => void saveSource(event, source)} className="space-y-3"><label className="block"><span className="mb-1 block text-[10px] font-semibold text-[#657065]">Source title</span><Input name="name" defaultValue={source.name} maxLength={120} required /></label><label className="block"><span className="mb-1 block text-[10px] font-semibold text-[#657065]">Extracted text</span><Textarea name="text" defaultValue={source.extractedText} rows={8} maxLength={120000} required /></label><p className="text-[10px] text-[#99773e]">Saving changes resets this source to pending review.</p><div className="flex justify-end gap-2"><Button type="button" size="sm" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button size="sm" type="submit" disabled={busyId === source.id}>Save edits</Button></div></form> : <><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#899186]">{source.status === "pending_review" ? "Inferred extraction · review before approval" : "Extracted business information"}</p>{source.status !== "pending_review" ? <Button size="sm" variant="ghost" onClick={() => void sourceAction("source_reprocess", source)} disabled={busyId === source.id}><RefreshCw className="h-3.5 w-3.5" />Reprocess</Button> : <Button size="sm" variant="ghost" onClick={() => setEditing(source.id)}><Pencil className="h-3.5 w-3.5" />Edit extraction</Button>}</div>{source.suggestedFacts.length ? <ul className="mt-3 space-y-2">{source.suggestedFacts.map((fact, index) => <li key={`${source.id}-${index}`} className="flex gap-2 text-[11px] leading-5 text-[#586359]"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#85a182]" />{fact}</li>)}</ul> : null}{source.suggestedProducts.length ? <div className="mt-3 rounded-xl border border-[#e8eadf] bg-white p-3"><p className="text-[10px] font-semibold text-[#5c6e5e]">Products suggested from this source</p><div className="mt-2 flex flex-wrap gap-2">{source.suggestedProducts.map((product) => <span key={product.name} className="rounded-lg bg-[#f3f4ef] px-2 py-1 text-[9px] text-[#687469]">{product.name}{product.price !== null ? ` · ${product.currency} ${product.price.toLocaleString("en-IN")}` : " · price not found"}</span>)}</div></div> : null} {source.suggestedFaqs.length ? <div className="mt-3 rounded-xl border border-[#e8eadf] bg-white p-3"><p className="text-[10px] font-semibold text-[#5c6e5e]">FAQs suggested from this source</p><ul className="mt-2 space-y-2.5">{source.suggestedFaqs.map((faq, index) => <li key={`${source.id}-faq-${index}`} className="text-[10px] leading-5 text-[#667166]"><span className="font-semibold">Q · {faq.question}</span><span className="block">A · {faq.answer}</span></li>)}</ul></div> : null}{source.suggestedPolicies.length ? <div className="mt-3 rounded-xl border border-[#e8eadf] bg-white p-3"><p className="text-[10px] font-semibold text-[#5c6e5e]">Policies suggested from this source</p><ul className="mt-2 space-y-2.5">{source.suggestedPolicies.map((policy, index) => <li key={`${source.id}-policy-${index}`} className="text-[10px] leading-5 text-[#667166]"><span className="font-semibold">{policy.name}</span><span className="block">{policy.content}</span></li>)}</ul></div> : null}<details className="mt-3"><summary className="cursor-pointer text-[10px] font-semibold text-[#738174]">View full extracted text</summary><pre className="scrollbar-thin mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-[#f4f4ef] p-3 font-sans text-[10px] leading-5 text-[#768075]">{source.extractedText || "No extracted text."}</pre></details>{source.status === "rejected" ? <p className="mt-3 text-[10px] text-[#8f968c]">This information is rejected and is not used for customer answers.</p> : null}</>}</div> : null}</Card>; })}</div> : <Card className="py-14 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef3eb] text-[#628165]"><FileText className="h-5 w-5" /></span><p className="mt-3 text-[12px] font-semibold text-[#536153]">Your knowledge library is ready</p><p className="mx-auto mt-1 max-w-[340px] text-[10px] leading-5 text-[#90978d]">Upload a brochure or paste your FAQs to get started. Every detail stays in review until you approve it.</p><Button className="mt-4" size="sm" variant="secondary" onClick={() => fileRef.current?.click()}><UploadCloud className="h-3.5 w-3.5" />Choose a document</Button></Card>}
    </div>
    <div className="flex items-center gap-2 rounded-xl border border-[#e7e8df] bg-[#f2f4ee] px-4 py-3 text-[10px] leading-5 text-[#778275]"><ShieldCheck className="h-4 w-4 shrink-0 text-[#6a8a6c]" /><span>Unapproved information stays out of customer answers. Deleting a source also removes its approved chunks, products, FAQs, and policies.</span></div>
  </div>;
}
