import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
    <div className="pointer-events-none absolute -left-36 top-[-80px] h-[420px] w-[420px] rounded-full bg-[#e6ecdf]/75 blur-[80px]" />
    <div className="pointer-events-none absolute -bottom-40 -right-36 h-[500px] w-[500px] rounded-full bg-[#f0e7d6]/55 blur-[80px]" />
    <div className="relative w-full max-w-[440px]">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-[12px] font-medium text-[#7f887c] hover:text-[#315d47]"><ArrowLeft className="h-3.5 w-3.5" />Back to home</Link>
      <div className="rounded-[28px] border border-[#e5e4dc] bg-[#fffefa] p-6 shadow-[0_20px_70px_rgba(48,57,47,.09)] sm:p-9">
        <Link href="/" className="mb-7 inline-flex items-center gap-3"><BrandMark /><span className="text-[15px] font-bold tracking-[-.04em]">middle<span className="text-[#5e8a62]">.</span>ai</span></Link>
        <h1 className="text-[27px] font-semibold tracking-[-.04em] text-[#2b392e]">Good to see you.</h1>
        <p className="mt-2 text-[13px] leading-6 text-[#838b80]">Sign in to manage your business assistant.</p>
        <div className="mt-7"><LoginForm /></div>
      </div>
      <p className="mt-5 text-center text-[10px] leading-5 text-[#969c93]">By continuing, you agree to use Middle AI responsibly and review customer-facing information before it is shared.</p>
    </div>
  </main>;
}
