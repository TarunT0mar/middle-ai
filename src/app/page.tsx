import Link from "next/link";
import { ArrowRight, BadgeCheck, BookOpenCheck, Check, ChevronRight, CircleHelp, Globe2, MessageCircle, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

function PreviewBubble({ children, customer = false }: { children: React.ReactNode; customer?: boolean }) {
  return <div className={`max-w-[88%] rounded-[18px] px-3.5 py-2.5 text-[12px] leading-[1.6] shadow-[0_1px_2px_rgba(25,36,27,.04)] ${customer ? "ml-auto rounded-br-[6px] bg-[#e6f0e3] text-[#435044]" : "rounded-bl-[6px] bg-white text-[#4f5b51]"}`}>{children}</div>;
}

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-[#f7f6f1] text-[#29362c]">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-3"><BrandMark className="h-10 w-10 rounded-[14px]" /><span className="text-[17px] font-bold tracking-[-0.045em]">middle<span className="text-[#5e8a62]">.</span>ai</span></Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-8 text-[13px] font-medium text-[#71796f] md:flex"><a href="#how-it-works" className="hover:text-[#315d47]">How it works</a><a href="#trust" className="hover:text-[#315d47]">Built for trust</a><a href="#demo" className="hover:text-[#315d47]">See the demo</a></nav>
        <div className="flex items-center gap-2.5"><Link href="/login" className="hidden text-[13px] font-semibold text-[#586358] sm:inline-flex">Log in</Link><Link href="/onboarding"><Button size="sm" className="h-10 rounded-full px-4 sm:px-5">Get started <ArrowRight className="h-3.5 w-3.5" /></Button></Link></div>
      </header>

      <section className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-5 pb-20 pt-10 sm:px-8 md:pb-28 md:pt-16 lg:grid-cols-[1.02fr_.98fr] lg:gap-16 lg:px-10">
        <div className="absolute -left-56 top-6 -z-0 h-[540px] w-[540px] rounded-full bg-[#e6ecdf]/55 blur-[70px]" />
        <div className="relative z-10 max-w-[600px]">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dfe5d8] bg-white/75 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.01em] text-[#5a785e]"><Sparkles className="h-3.5 w-3.5" />Customer care, with your business in mind</div>
          <h1 className="text-[42px] font-semibold leading-[1.08] tracking-[-0.055em] text-[#25342a] sm:text-[56px] lg:text-[64px]">Make every customer feel <span className="relative inline-block text-[#46724f]">looked after.<span className="absolute -bottom-1 left-0 h-[7px] w-full rounded-[50%] border-b-[2px] border-[#91b38a]" /></span></h1>
          <p className="mt-6 max-w-[490px] text-[16px] leading-[1.8] text-[#747d72] sm:text-[17px]">Middle AI helps small businesses answer WhatsApp questions in English, Hindi and Hinglish — using the information you’ve approved.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3"><Link href="/onboarding"><Button size="lg" className="rounded-full px-6">Create your workspace <ArrowRight className="h-4 w-4" /></Button></Link><Link href="/demo/chat"><Button variant="secondary" size="lg" className="rounded-full px-6">Try the live demo</Button></Link></div>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[#8a9288]"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#64866a]" />Your facts, your approval</span><span className="h-1 w-1 rounded-full bg-[#c4c9bf]" /><span className="inline-flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5 text-[#64866a]" />English · हिंदी · Hinglish</span></div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[510px]">
          <div className="absolute -right-5 -top-6 h-28 w-28 rounded-full bg-[#f0e9d9] blur-2xl" />
          <div className="relative rotate-[1.1deg] rounded-[30px] border border-[#e4e2d8] bg-[#fffefa] p-3 shadow-[0_26px_80px_rgba(42,59,43,.13)] sm:p-4">
            <div className="flex items-center justify-between rounded-[22px] bg-[#f1f3eb] px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dce8d8] text-[13px] font-bold text-[#557552]">O<span className="text-[#7b9a6e]">&</span>O</span><div><p className="text-[13px] font-semibold text-[#39463a]">Olive & Oak Studio</p><p className="mt-0.5 text-[10px] text-[#829081]">Business assistant · Sample conversation</p></div></div><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#69836b]"><BadgeCheck className="h-4 w-4" /></span></div>
            <div className="mt-3 flex h-[355px] flex-col justify-end gap-3 rounded-[21px] bg-[#f3f1e8] p-4 sm:h-[390px] sm:p-5">
              <p className="mx-auto mb-1 rounded-full bg-white/70 px-3 py-1 text-[9px] font-medium text-[#a0a294]">TODAY · SAMPLE DATA</p>
              <PreviewBubble customer>Gold package ka kya price hai? Album milega?</PreviewBubble>
              <PreviewBubble><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[.09em] text-[#759078]">Middle AI · approved facts</span>Gold package ₹75,000 ka hai, aur haan, isme one album included hai. Booking confirm karne ke liye 30% advance required hai.</PreviewBubble>
              <PreviewBubble customer>Drone bhi included hai?</PreviewBubble>
              <PreviewBubble><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[.09em] text-[#9c7a3b]">Sent to the team</span>Drone coverage ki confirmed information mere paas nahi hai. Main team se check karwa deta hoon.</PreviewBubble>
              <div className="mt-1 flex items-center gap-2 rounded-full border border-[#e6e4dc] bg-white px-3 py-2.5"><span className="text-[11px] text-[#a1a69d]">Message Olive & Oak…</span><span className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#315d47] text-white"><ArrowRight className="h-3.5 w-3.5" /></span></div>
            </div>
            <div className="flex items-center justify-between px-2 pb-1 pt-3"><p className="text-[10px] text-[#8d948a]">Answers stay inside approved business information.</p><span className="inline-flex items-center gap-1 text-[9px] font-medium text-[#6f8a6d]"><span className="h-1.5 w-1.5 rounded-full bg-[#7ca178]" />Demo preview</span></div>
          </div>
          <div className="absolute -bottom-8 -left-7 hidden items-center gap-2.5 rounded-2xl border border-[#e5e4dc] bg-white px-4 py-3 shadow-[0_12px_35px_rgba(42,59,43,.09)] sm:flex"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf4ed] text-[#47724f]"><BookOpenCheck className="h-4 w-4" /></span><div><p className="text-[10px] font-semibold text-[#455448]">Owner-approved knowledge</p><p className="mt-0.5 text-[9px] text-[#93998f]">Prices · policies · FAQs</p></div><Check className="ml-3 h-4 w-4 text-[#6e9673]" /></div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-[#e8e6de] bg-[#fbfaf6] py-16 sm:py-20">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5"><div><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#6f8c70]">A little more breathing room</p><h2 className="mt-2 text-[30px] font-semibold tracking-[-.04em] text-[#2b392e] sm:text-[36px]">Helpful replies, grounded in your business.</h2></div><p className="max-w-[350px] text-[13px] leading-6 text-[#7e867c]">Your team stays in control. Middle AI handles the straightforward questions and knows when to ask for help.</p></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[{ n: "01", icon: UploadCloud, title: "Bring your know-how", copy: "Upload a price list, brochure or FAQ. Middle AI turns it into information your team can review." }, { n: "02", icon: BookOpenCheck, title: "Approve what’s right", copy: "Check every extracted detail before it becomes something the assistant can tell customers." }, { n: "03", icon: MessageCircle, title: "Let conversations flow", copy: "Answer routine questions on WhatsApp. Hand uncertain or sensitive conversations back to your team." }].map(({ n, icon: Icon, title, copy }) => <article key={n} className="rounded-[22px] border border-[#e8e6de] bg-white p-6 sm:p-7"><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf3ea] text-[#557953]"><Icon className="h-5 w-5" /></span><span className="font-mono text-[11px] text-[#b2b6ac]">{n}</span></div><h3 className="mt-6 text-[16px] font-semibold text-[#354238]">{title}</h3><p className="mt-2 text-[13px] leading-[1.75] text-[#7c857b]">{copy}</p></article>)}
          </div>
        </div>
      </section>

      <section id="trust" className="mx-auto grid max-w-[1240px] items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:px-10">
        <div><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#6f8c70]">Trust starts with the source</p><h2 className="mt-3 max-w-[470px] text-[32px] font-semibold leading-[1.18] tracking-[-.045em] text-[#2b392e] sm:text-[40px]">If the answer isn’t there, it won’t make one up.</h2><p className="mt-4 max-w-[440px] text-[14px] leading-7 text-[#7c857b]">Prices, availability and policies come from facts you’ve approved. Missing, conflicting or sensitive requests go to a human.</p><Link href="/dashboard/knowledge" className="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold text-[#46724f] hover:underline">Explore the knowledge review <ChevronRight className="h-4 w-4" /></Link></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-[22px] border border-[#e5e5dc] bg-white p-5 sm:p-6"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4ec] text-[#507653]"><ShieldCheck className="h-5 w-5" /></span><h3 className="mt-5 text-[14px] font-semibold text-[#39473b]">Nothing without your say-so</h3><p className="mt-2 text-[12px] leading-6 text-[#818980]">New information waits for your review before customers can see it.</p></div><div className="rounded-[22px] border border-[#e5e5dc] bg-white p-5 sm:mt-8 sm:p-6"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7f1e4] text-[#947538]"><CircleHelp className="h-5 w-5" /></span><h3 className="mt-5 text-[14px] font-semibold text-[#39473b]">A clear handoff</h3><p className="mt-2 text-[12px] leading-6 text-[#818980]">Uncertain answers and sensitive actions move to your team with context.</p></div></div>
      </section>

      <section id="demo" className="px-5 pb-16 sm:px-8 sm:pb-20 lg:px-10"><div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-5 rounded-[28px] bg-[#eaf0e6] px-6 py-8 sm:flex-row sm:items-center sm:px-10 sm:py-10"><div><p className="text-[11px] font-semibold uppercase tracking-[.15em] text-[#67836a]">Take a look around</p><h2 className="mt-2 text-[24px] font-semibold tracking-[-.035em] text-[#2e4032] sm:text-[29px]">Try a real conversation in the simulator.</h2><p className="mt-2 text-[13px] text-[#758276]">Ask about a package, or try asking about something that isn’t confirmed.</p></div><Link href="/demo/chat"><Button size="lg" className="shrink-0 rounded-full">Open customer simulator <ArrowRight className="h-4 w-4" /></Button></Link></div></section>

      <footer className="border-t border-[#e5e4dc] bg-[#fbfaf7]"><div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-5 py-6 text-[11px] text-[#8e958b] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><Link href="/" className="flex items-center gap-2.5"><BrandMark className="h-7 w-7 rounded-[9px]" /><span className="font-semibold text-[#536253]">middle.ai</span></Link><p>Thoughtful customer care for the businesses that make a place.</p><Link href="/login" className="font-semibold text-[#607765] hover:underline">Owner sign in</Link></div></footer>
    </main>
  );
}
