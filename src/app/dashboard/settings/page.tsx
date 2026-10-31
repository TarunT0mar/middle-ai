"use client";

import { useState, type FormEvent } from "react";
import { Check, CircleHelp, LockKeyhole, MessageCircle, Save, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { useDashboardData } from "@/components/dashboard-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/field";
import type { AutomationMode, Workspace } from "@/lib/domain";

type WorkspaceProfile = { name: string; businessType: string; description: string; contact: string; workingHours: string; languages: string[]; automationMode: AutomationMode };

function profileFromWorkspace(workspace: Workspace): WorkspaceProfile {
  return { name: workspace.name, businessType: workspace.businessType, description: workspace.description, contact: workspace.contact, workingHours: workspace.workingHours, languages: workspace.languages, automationMode: workspace.automationMode };
}

const modes: { id: AutomationMode; title: string; detail: string }[] = [
  { id: "draft_only", title: "Draft only", detail: "Prepare a reply for every question. Your team reviews and sends each one." },
  { id: "safe_automation", title: "Safe automation", detail: "Automatically answer clear questions grounded in approved information. Ask for help when something is missing or sensitive." },
  { id: "ai_active", title: "AI active", detail: "Answer supported routine questions automatically. Sensitive requests always go to your team." },
];

export default function SettingsPage() {
  const { state, isLoading, demoMode, integrations, mutate } = useDashboardData();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectMessage, setConnectMessage] = useState("");
  const [connectError, setConnectError] = useState("");
  const [whatsAppForm, setWhatsAppForm] = useState({ phoneNumberId: "", businessAccountId: "", displayPhone: "", accessToken: "" });
  const [workspaceEdits, setWorkspaceEdits] = useState<Partial<WorkspaceProfile>>({});
  const workspaceForm = { ...(state ? profileFromWorkspace(state.workspace) : { name: "", businessType: "", description: "", contact: "", workingHours: "", languages: [], automationMode: "draft_only" as AutomationMode }), ...workspaceEdits };

  function setWorkspaceField<K extends keyof WorkspaceProfile>(field: K, value: WorkspaceProfile[K]) {
    setWorkspaceEdits((current) => ({ ...current, [field]: value }));
  }

  function toggleLanguage(language: string) {
    setWorkspaceField("languages", workspaceForm.languages.includes(language) ? workspaceForm.languages.filter((item) => item !== language) : [...workspaceForm.languages, language]);
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!state) return;
    setBusy(true); setError(""); setSaved(false);
    try { await mutate({ action: "settings_update", ...workspaceForm }); setWorkspaceEdits({}); setSaved(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Settings could not be saved."); }
    setBusy(false);
  }

  async function connectWhatsApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setConnectBusy(true); setConnectError(""); setConnectMessage("");
    try {
      await mutate({ action: "whatsapp_connect", ...whatsAppForm });
      setWhatsAppForm((current) => ({ ...current, accessToken: "" }));
      setConnectMessage("Business number saved. The access token is encrypted at rest and never shown again.");
    } catch (cause) { setConnectError(cause instanceof Error ? cause.message : "Connection details could not be saved."); }
    setConnectBusy(false);
  }

  if (isLoading || !state) return <div className="h-[520px] animate-pulse rounded-2xl border border-[#e7e5de] bg-white" />;
  return <div className="space-y-6">
    <div><p className="text-[11px] font-medium text-[#889186]">Make Middle AI work your way</p><h1 className="mt-1 text-[29px] font-semibold tracking-[-.045em] text-[#29382e] sm:text-[34px]">Settings</h1><p className="mt-1 text-[13px] text-[#7b857a]">Business profile, automation and WhatsApp connection.</p></div>

    <Card className="p-5 sm:p-6"><div className="mb-5 flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef3ea] text-[#648266]"><Smartphone className="h-[18px] w-[18px]" /></span><div><h2 className="text-[14px] font-semibold text-[#3c4a3e]">Business profile</h2><p className="mt-1 text-[10px] text-[#8e968b]">Your approved business details help the assistant stay on topic.</p></div></div><form onSubmit={saveSettings} className="grid gap-4 sm:grid-cols-2">
      <label><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Business name</span><Input required maxLength={80} value={workspaceForm.name} onChange={(event) => setWorkspaceField("name", event.target.value)} /></label>
      <label><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Business type</span><Input maxLength={80} value={workspaceForm.businessType} onChange={(event) => setWorkspaceField("businessType", event.target.value)} /></label>
      <label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Description</span><Textarea rows={3} maxLength={500} value={workspaceForm.description} onChange={(event) => setWorkspaceField("description", event.target.value)} /></label>
      <label><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Customer contact</span><Input maxLength={80} value={workspaceForm.contact} onChange={(event) => setWorkspaceField("contact", event.target.value)} /></label>
      <label><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Working hours</span><Input maxLength={160} value={workspaceForm.workingHours} onChange={(event) => setWorkspaceField("workingHours", event.target.value)} /></label>
      <fieldset className="sm:col-span-2"><legend className="mb-2 text-[10px] font-semibold text-[#657065]">Supported languages</legend><div className="flex flex-wrap gap-2">{["English", "Hindi", "Hinglish"].map((language) => <button key={language} type="button" onClick={() => toggleLanguage(language)} aria-pressed={workspaceForm.languages.includes(language)} className={`rounded-xl border px-3 py-2 text-[10px] font-medium ${workspaceForm.languages.includes(language) ? "border-[#afc7ae] bg-[#eef5eb] text-[#456d4a]" : "border-[#e2e1da] text-[#898f86]"}`}>{workspaceForm.languages.includes(language) ? "✓ " : ""}{language}</button>)}</div></fieldset>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">{error ? <p role="alert" className="text-[10px] text-[#9a4734]">{error}</p> : null}{saved ? <p role="status" className="inline-flex items-center gap-1 text-[10px] text-[#47724f]"><Check className="h-3.5 w-3.5" />Changes saved</p> : null}<Button className="ml-auto" type="submit" disabled={busy || workspaceForm.languages.length === 0}>{busy ? "Saving…" : <><Save className="h-3.5 w-3.5" />Save profile</>}</Button></div>
    </form></Card>

    <Card className="p-5 sm:p-6"><div className="mb-5 flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7f1e4] text-[#94743b]"><Sparkles className="h-[18px] w-[18px]" /></span><div><h2 className="text-[14px] font-semibold text-[#3c4a3e]">Automation mode</h2><p className="mt-1 text-[10px] text-[#8e968b]">You can change this any time. Sensitive actions always go to a person.</p></div></div><form onSubmit={saveSettings} className="space-y-3">{modes.map((mode) => <label key={mode.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${workspaceForm.automationMode === mode.id ? "border-[#a9c1a6] bg-[#f2f6ef]" : "border-[#e8e6de] hover:bg-[#fbfbf8]"}`}><input type="radio" name="automation-mode" value={mode.id} checked={workspaceForm.automationMode === mode.id} onChange={() => setWorkspaceField("automationMode", mode.id)} className="mt-0.5 accent-[#315d47]" /><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-[12px] font-semibold text-[#465447]">{mode.title}{mode.id === "draft_only" ? <Badge tone="green">Recommended for new workspaces</Badge> : null}</span><span className="mt-1 block text-[10px] leading-5 text-[#818a80]">{mode.detail}</span></span></label>)}<div className="flex justify-end pt-1"><Button type="submit" disabled={busy}><Save className="h-3.5 w-3.5" />Save automation</Button></div></form><div className="mt-5 flex items-start gap-2 rounded-xl bg-[#f6f4ed] px-3.5 py-3 text-[10px] leading-5 text-[#7e8579]"><CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9c854c]" /><span>Discounts, refunds, cancellations, complaints, booking confirmations, payment disputes, order changes, regulated advice and unsupported claims are always escalated.</span></div></Card>

    <Card className="flex items-start gap-3 p-5 sm:p-6"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef3ea] text-[#648266]"><Sparkles className="h-[18px] w-[18px]" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-[14px] font-semibold text-[#3c4a3e]">AI provider</h2><Badge tone={integrations.ai ? "green" : "gray"}>{integrations.aiProvider === "deepseek" ? "DeepSeek" : integrations.aiProvider === "openai" ? "OpenAI" : "Not configured"}</Badge></div><p className="mt-1 text-[10px] leading-5 text-[#8e968b]">Provider keys are read from server environment variables and never sent to the browser. DeepSeek is selected when both chat providers are configured.</p></div></Card>

    <Card className="p-5 sm:p-6"><div className="mb-5 flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ec] text-[#638067]"><MessageCircle className="h-[18px] w-[18px]" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-[14px] font-semibold text-[#3c4a3e]">WhatsApp connection</h2><Badge tone={integrations.whatsapp ? "green" : "gray"}>{integrations.whatsapp ? "Connected" : "Not connected"}</Badge></div><p className="mt-1 text-[10px] text-[#8e968b]">Connect an official WhatsApp Business Cloud API number.</p></div></div>
      {demoMode ? <div className="rounded-2xl border border-[#e8e8de] bg-[#f7f7f2] p-4"><p className="text-[11px] font-semibold text-[#4d5e4e]">Credentials stay outside the demo workspace</p><p className="mt-1.5 text-[10px] leading-5 text-[#818a80]">Configure Supabase and TOKEN_ENCRYPTION_KEY to save business credentials securely. A demo number can be supplied through server environment variables. This does not connect a personal WhatsApp account.</p><div className="mt-3 flex items-center gap-2 text-[9px] text-[#758276]"><LockKeyhole className="h-3.5 w-3.5" />The access token is encrypted before it reaches the database.</div></div> : <>
        {state.whatsappConnection ? <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-[#edf5ed] px-3.5 py-3 text-[10px] text-[#527256]"><Check className="h-4 w-4" />{state.whatsappConnection.displayPhone} · Business number ID {state.whatsappConnection.phoneNumberId}<span className="ml-auto inline-flex items-center gap-1"><LockKeyhole className="h-3 w-3" />Encrypted token saved</span></div> : null}
        <form onSubmit={connectWhatsApp} className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Phone number ID</span><Input required value={whatsAppForm.phoneNumberId} onChange={(event) => setWhatsAppForm({ ...whatsAppForm, phoneNumberId: event.target.value })} placeholder="From Meta WhatsApp settings" /></label><label><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">WhatsApp Business Account ID</span><Input required value={whatsAppForm.businessAccountId} onChange={(event) => setWhatsAppForm({ ...whatsAppForm, businessAccountId: event.target.value })} placeholder="Your WABA ID" /></label><label><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Display phone number</span><Input required value={whatsAppForm.displayPhone} onChange={(event) => setWhatsAppForm({ ...whatsAppForm, displayPhone: event.target.value })} placeholder="+91 …" /></label><label><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Business access token</span><Input required type="password" autoComplete="new-password" value={whatsAppForm.accessToken} onChange={(event) => setWhatsAppForm({ ...whatsAppForm, accessToken: event.target.value })} placeholder={state.whatsappConnection ? "Enter a new token to rotate it" : "Paste your Meta access token"} /></label>{connectError ? <p role="alert" className="text-[10px] text-[#9a4734] sm:col-span-2">{connectError}</p> : null}{connectMessage ? <p role="status" className="text-[10px] text-[#47724f] sm:col-span-2">{connectMessage}</p> : null}<div className="flex items-center justify-between gap-4 sm:col-span-2"><p className="max-w-[450px] text-[9px] leading-5 text-[#969c93]">Requires a verified WhatsApp Business Cloud API number and access token. Manual setup is used here; Embedded Signup can replace this form later.</p><Button type="submit" disabled={connectBusy}>{connectBusy ? "Saving…" : <><LockKeyhole className="h-3.5 w-3.5" />Save connection</>}</Button></div></form>
      </>}
      <div className="mt-5 flex items-start gap-2 rounded-xl border border-[#eeeae0] bg-[#fbfaf5] px-3.5 py-3 text-[10px] leading-5 text-[#85897d]"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8a8b69]" /><span>Only official WhatsApp Business Cloud API numbers can be connected. An ordinary personal WhatsApp account isn’t supported.</span></div>
    </Card>

    <div className="flex items-center gap-2 rounded-xl border border-[#e7e8df] bg-[#f2f4ee] px-4 py-3 text-[10px] leading-5 text-[#778275]"><LockKeyhole className="h-4 w-4 shrink-0 text-[#6a8a6c]" /><span>AI and WhatsApp secrets stay server-side. The dashboard never reads or displays saved access tokens.</span><Select aria-label="Workspace status" disabled className="ml-auto hidden w-[120px] py-1 text-[9px] sm:block"><option>Active</option></Select></div>
  </div>;
}
