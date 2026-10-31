"use client";

import { useState, type FormEvent } from "react";
import { Archive, ArrowRight, Check, CirclePlus, Clock3, Edit3, Package, Plus, Trash2, X } from "lucide-react";
import { useDashboardData } from "@/components/dashboard-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/field";
import type { Product } from "@/lib/domain";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

const emptyProduct = { name: "", category: "", description: "", price: "", currency: "INR", priceQualifier: "", availability: "", inclusions: "", deliveryTime: "", status: "draft" as const, sourceId: "" };

export default function ProductsPage() {
  const { state, isLoading, mutate } = useDashboardData();
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const priceValue = String(form.get("price") ?? "").trim();
    const price = priceValue === "" ? null : Number(priceValue);
    if (price !== null && !Number.isFinite(price)) { setError("Enter a valid price or leave it blank."); setBusy(false); return; }
    try {
      await mutate({ action: "product_save", id: editing?.id, name: form.get("name"), category: form.get("category"), description: form.get("description"), price, currency: form.get("currency"), priceQualifier: form.get("priceQualifier"), availability: form.get("availability"), inclusions: String(form.get("inclusions") ?? "").split("\n").map((value) => value.trim()).filter(Boolean), deliveryTime: form.get("deliveryTime"), status: form.get("status"), sourceId: form.get("sourceId") || null });
      setEditing(null); setShowForm(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this product."); }
    setBusy(false);
  }

  async function remove(product: Product) {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    try { await mutate({ action: "product_delete", id: product.id }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete the product."); }
  }

  if (isLoading || !state) return <div className="h-[320px] animate-pulse rounded-2xl border border-[#e7e5de] bg-white" />;
  const products = state.products.filter((product) => filter === "all" || product.status === filter);
  const startEdit = (product: Product) => { setEditing(product); setShowForm(true); };
  const closeForm = () => { setEditing(null); setShowForm(false); setError(""); };
  const values = editing ?? emptyProduct;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-medium text-[#889186]">Your approved facts, in one place</p><h1 className="mt-1 text-[29px] font-semibold tracking-[-.045em] text-[#29382e] sm:text-[34px]">Products & services</h1><p className="mt-1 text-[13px] text-[#7b857a]">Keep prices and package details precise. Draft products never reach customers.</p></div><Button onClick={() => { setEditing(null); setShowForm(true); }}><CirclePlus className="h-4 w-4" />Add a product</Button></div>

    {showForm ? <Card className="p-5 sm:p-6"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-[15px] font-semibold text-[#364339]">{editing ? "Edit product or service" : "Add a product or service"}</h2><p className="mt-1 text-[11px] text-[#8e968c]">Use confirmed details. You can leave an unknown price blank.</p></div><Button variant="ghost" size="icon" onClick={closeForm} aria-label="Close product form"><X className="h-4 w-4" /></Button></div>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Name *</span><Input name="name" required maxLength={100} defaultValue={values.name} placeholder="e.g. Wedding Photography Gold" /></label>
        <label><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Category</span><Input name="category" maxLength={80} defaultValue={values.category} placeholder="Wedding photography" /></label>
        <div className="grid grid-cols-[1fr_104px] gap-2"><label><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Price</span><Input type="number" min="0" step="0.01" name="price" defaultValue={values.price ?? ""} placeholder="75000" /></label><label><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Currency</span><Select name="currency" defaultValue={values.currency}><option value="INR">INR ₹</option><option value="USD">USD $</option><option value="AED">AED د.إ</option><option value="GBP">GBP £</option></Select></label></div>
        <label><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Price qualifier</span><Input name="priceQualifier" maxLength={40} defaultValue={values.priceQualifier} placeholder="Starting from" /></label>
        <label><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Availability</span><Input name="availability" maxLength={120} defaultValue={values.availability} placeholder="Accepting bookings" /></label>
        <label><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Delivery time</span><Input name="deliveryTime" maxLength={80} defaultValue={values.deliveryTime} placeholder="6–8 weeks" /></label>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Description</span><Textarea name="description" rows={2} maxLength={1000} defaultValue={values.description} placeholder="Describe this product or service…" /></label>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Package inclusions <span className="font-normal text-[#969c93]">(one per line)</span></span><Textarea name="inclusions" rows={3} maxLength={1800} defaultValue={Array.isArray(values.inclusions) ? values.inclusions.join("\n") : values.inclusions} placeholder={"Two photographers\nOne videographer\nOne album"} /></label>
        <label><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Status</span><Select name="status" defaultValue={values.status}><option value="draft">Draft · hidden from customers</option><option value="approved">Approved · customer-visible</option><option value="archived">Archived · not in use</option></Select></label>
        <label><span className="mb-1.5 block text-[10px] font-semibold text-[#657065]">Source</span><Select name="sourceId" defaultValue={values.sourceId ?? ""}><option value="">Manual entry</option>{state.sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</Select></label>
        <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-3">{error ? <p role="alert" className="mr-auto text-[11px] text-[#9a4734]">{error}</p> : <span className="mr-auto text-[10px] text-[#949b91]">Double-check prices before approving.</span>}<Button type="button" variant="secondary" onClick={closeForm}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add product"}</Button></div>
      </form>
    </Card> : null}

    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[11px] text-[#828b81]">{state.products.length} product{state.products.length === 1 ? "" : "s"} in this workspace</p><Select aria-label="Filter products by status" className="w-[160px] py-2 text-[11px]" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All statuses</option><option value="approved">Approved</option><option value="draft">Draft</option><option value="archived">Archived</option></Select></div>
    {error && !showForm ? <p role="alert" className="rounded-xl bg-[#fff0ed] p-3 text-[11px] text-[#9a4734]">{error}</p> : null}
    {products.length ? <div className="grid gap-4 lg:grid-cols-2">{products.map((product) => { const source = state.sources.find((item) => item.id === product.sourceId); const tone = product.status === "approved" ? "green" : product.status === "draft" ? "amber" : "gray"; return <Card key={product.id} className="overflow-hidden"><div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6"><div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf3ea] text-[#628165]"><Package className="h-[18px] w-[18px]" /></span><div className="min-w-0"><p className="truncate text-[14px] font-semibold text-[#38463b]">{product.name}</p><p className="mt-1 text-[10px] text-[#92998f]">{product.category || "Uncategorized"}</p></div></div><Badge tone={tone}>{product.status}</Badge></div><div className="flex items-end justify-between px-5 pt-4 sm:px-6"><div><p className="text-[22px] font-semibold tracking-[-.04em] text-[#2d3c31]">{product.priceQualifier ? <span className="mr-1 text-[11px] font-medium text-[#858e83]">{product.priceQualifier}</span> : null}{formatCurrency(product.price, product.currency)}</p><p className="mt-1 text-[10px] text-[#90978d]">{product.availability || "Availability not set"}</p></div><div className="flex gap-1"><Button size="icon" variant="ghost" aria-label={`Edit ${product.name}`} onClick={() => startEdit(product)}><Edit3 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Delete ${product.name}`} onClick={() => remove(product)}><Trash2 className="h-4 w-4 text-[#9d6a59]" /></Button></div></div><div className="mx-5 mt-4 border-t border-[#efeee8] pt-3 sm:mx-6"><p className="line-clamp-2 text-[11px] leading-5 text-[#768075]">{product.description || "No description added."}</p>{product.inclusions.length ? <div className="mt-3 flex flex-wrap gap-1.5">{product.inclusions.map((item) => <span key={item} className="rounded-lg bg-[#f3f4ef] px-2 py-1 text-[9px] text-[#6c796d]">{item}</span>)}</div> : null}<div className="mt-4 flex flex-wrap items-center justify-between gap-2 pb-4 text-[9px] text-[#9aa097]"><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />Updated {formatRelativeTime(product.updatedAt)}</span><span>{source ? `Source: ${source.name}` : "Manual entry"}</span>{product.deliveryTime ? <span>Delivery: {product.deliveryTime}</span> : null}</div></div></Card>; })}</div> : <Card className="py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf3ea] text-[#628165]"><Archive className="h-5 w-5" /></span><h2 className="mt-4 text-[13px] font-semibold text-[#4a584b]">No products in this view</h2><p className="mx-auto mt-1 max-w-[340px] text-[11px] leading-5 text-[#90978d]">Add confirmed prices and service details. Keep them in draft while you review, then approve when they’re ready.</p><Button className="mt-4" size="sm" variant="secondary" onClick={() => setShowForm(true)}><Plus className="h-3.5 w-3.5" />Add your first product</Button></Card>}
    <div className="flex items-center gap-2 rounded-xl border border-[#e7e8df] bg-[#f2f4ee] px-4 py-3 text-[10px] leading-5 text-[#778275]"><Check className="h-4 w-4 shrink-0 text-[#6a8a6c]" /><span>Only approved products and information are available to the customer assistant. Source documents remain private to your workspace.</span><ArrowRight className="ml-auto hidden h-3.5 w-3.5 shrink-0 sm:block" /></div>
  </div>;
}
