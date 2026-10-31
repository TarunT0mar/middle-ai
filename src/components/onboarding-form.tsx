"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";

const languageOptions = ["English", "Hindi", "Hinglish"];

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("Photography studio");
  const [description, setDescription] = useState("");
  const [languages, setLanguages] = useState(["English", "Hindi", "Hinglish"]);
  const [contact, setContact] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggleLanguage(language: string) {
    setLanguages((current) => current.includes(language) ? current.filter((item) => item !== language) : [...current, language]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/app", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create_workspace", name, businessType, description, languages, contact, workingHours }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not create your workspace.");
      router.push("/dashboard/knowledge"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create your workspace."); setBusy(false); }
  }

  return <form onSubmit={submit} className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#5d685e]">Business name <span className="text-[#bc6e52]">*</span></span><Input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Olive & Oak Studio" /></label>
      <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#5d685e]">Business type <span className="text-[#bc6e52]">*</span></span><Select value={businessType} onChange={(event) => setBusinessType(event.target.value)}><option>Photography studio</option><option>Retail & products</option><option>Food & hospitality</option><option>Health & wellness</option><option>Professional services</option><option>Other</option></Select></label>
    </div>
    <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#5d685e]">A short description</span><Textarea rows={3} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What you do, who you serve, and what makes your business special…" /><span className="mt-1 block text-right text-[10px] text-[#a2a69f]">{description.length}/500</span></label>
    <fieldset><legend className="mb-2 text-[11px] font-semibold text-[#5d685e]">Languages customers can use</legend><div className="flex flex-wrap gap-2">{languageOptions.map((language) => <button key={language} type="button" onClick={() => toggleLanguage(language)} className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[11px] font-medium transition ${languages.includes(language) ? "border-[#abc7aa] bg-[#edf5ec] text-[#406948]" : "border-[#e3e2da] bg-white text-[#858c82] hover:bg-[#f5f5ef]"}`} aria-pressed={languages.includes(language)}>{languages.includes(language) ? <Check className="h-3.5 w-3.5" /> : null}{language}</button>)}</div>{languages.length === 0 ? <p className="mt-1 text-[10px] text-[#9a4c38]">Choose at least one language.</p> : null}</fieldset>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#5d685e]">Customer contact</span><Input value={contact} onChange={(event) => setContact(event.target.value)} maxLength={80} placeholder="Phone or email" /></label>
      <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#5d685e]">Working hours</span><Input value={workingHours} onChange={(event) => setWorkingHours(event.target.value)} maxLength={160} placeholder="e.g. Mon–Sat, 9 am–6 pm" /></label>
    </div>
    <div className="rounded-2xl border border-[#e7e9df] bg-[#f6f7f1] p-4"><p className="text-[11px] font-semibold text-[#4e624f]">Draft only is on by default</p><p className="mt-1 text-[10px] leading-5 text-[#818a7f]">Your assistant can prepare replies, but you’ll review and approve every one before sending.</p></div>
    {error ? <p role="alert" className="rounded-xl bg-[#fff0ed] px-3 py-2 text-[11px] text-[#9a4734]">{error}</p> : null}
    <Button type="submit" disabled={busy || languages.length === 0} size="lg" className="w-full sm:w-auto">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Create workspace <ArrowRight className="h-4 w-4" /></Button>
  </form>;
}
