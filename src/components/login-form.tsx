"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const supabaseEnabled = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setBusy(false); router.push("/dashboard"); return; }
    const result = mode === "sign_in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/onboarding` } });
    if (result.error) { setError(result.error.message); setBusy(false); return; }
    if (mode === "sign_up" && !result.data.session) {
      setMessage("Check your inbox to confirm your email, then sign in to continue."); setBusy(false); return;
    }
    const response = await fetch("/api/app", { cache: "no-store" });
    const payload = await response.json();
    router.push(payload.needsWorkspace || !payload.state ? "/onboarding" : "/dashboard");
    router.refresh();
  }

  return <>
    {supabaseEnabled ? <form onSubmit={submit} className="space-y-4">
      <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#5d685e]">Email address</span><Input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@yourbusiness.com" /></label>
      <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#5d685e]">Password</span><span className="relative block"><Input type={showPassword ? "text" : "password"} autoComplete={mode === "sign_up" ? "new-password" : "current-password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="pr-11" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#929a90]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
      {error ? <p role="alert" className="rounded-xl bg-[#fff0ed] px-3 py-2 text-[11px] text-[#9a4734]">{error}</p> : null}
      {message ? <p role="status" className="rounded-xl bg-[#edf5ed] px-3 py-2 text-[11px] text-[#3d7048]">{message}</p> : null}
      <Button type="submit" disabled={busy} className="h-11 w-full">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : mode === "sign_in" ? "Sign in to your workspace" : "Create owner account"}<ArrowRight className="h-4 w-4" /></Button>
    </form> : <div className="rounded-2xl border border-[#e5e8de] bg-[#f6f8f2] p-4"><p className="text-[12px] font-semibold text-[#415745]">Demo mode is ready</p><p className="mt-1.5 text-[11px] leading-5 text-[#7c867a]">Supabase isn’t configured in this local workspace. Continue to the seeded owner dashboard to explore the demo.</p><Link href="/dashboard" className="mt-4 block"><Button className="w-full">Open the demo workspace <ArrowRight className="h-4 w-4" /></Button></Link></div>}
    {supabaseEnabled ? <p className="mt-5 text-center text-[11px] text-[#848c81]">{mode === "sign_in" ? "New to Middle AI?" : "Already have an account?"}{" "}<button type="button" className="font-semibold text-[#47724f] hover:underline" onClick={() => { setMode(mode === "sign_in" ? "sign_up" : "sign_in"); setError(""); setMessage(""); }}>{mode === "sign_in" ? "Create an account" : "Sign in"}</button></p> : <p className="mt-4 text-center text-[11px] text-[#848c81]">Ready to add your own business? <Link href="/onboarding" className="font-semibold text-[#47724f] hover:underline">Create a workspace</Link></p>}
  </>;
}
