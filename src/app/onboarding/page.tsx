import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { OnboardingForm } from "@/components/onboarding-form";

export const metadata: Metadata = { title: "Set up your workspace" };

export default function OnboardingPage() {
  return <main className="min-h-screen px-4 py-8 sm:px-8 sm:py-12">
    <div className="mx-auto max-w-[720px]">
      <div className="mb-8 flex items-center justify-between"><Link href="/" className="inline-flex items-center gap-2 text-[12px] font-medium text-[#7f887c] hover:text-[#315d47]"><ArrowLeft className="h-3.5 w-3.5" />Home</Link><Link href="/" className="flex items-center gap-2.5"><BrandMark className="h-8 w-8 rounded-[11px]" /><span className="text-[14px] font-bold tracking-[-.04em]">middle<span className="text-[#5e8a62]">.</span>ai</span></Link><Link href="/login" className="text-[12px] font-semibold text-[#56715b] hover:underline">Already have a workspace?</Link></div>
      <div className="rounded-[28px] border border-[#e5e4dc] bg-[#fffefa] p-6 shadow-[0_16px_50px_rgba(48,57,47,.06)] sm:p-10">
        <div className="mb-8"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#739075]">A good place to begin</p><h1 className="mt-2 text-[30px] font-semibold tracking-[-.045em] text-[#2b392e] sm:text-[36px]">Let’s set up your business.</h1><p className="mt-2 max-w-[500px] text-[13px] leading-6 text-[#7f887d]">A few details help your assistant speak in your business’s voice. You can change everything later.</p></div>
        <OnboardingForm />
      </div>
      <p className="mt-5 text-center text-[10px] text-[#969c93]">New workspaces start in Draft only. You approve every answer before it reaches a customer.</p>
    </div>
  </main>;
}
