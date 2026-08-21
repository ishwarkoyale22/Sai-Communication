import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";
import {
  adminSaveProduct, adminDeleteProduct,
  adminSaveBrand, adminDeleteBrand, adminListBrands,
  adminSaveRefurbished, adminDeleteRefurbished, adminListRefurbished,
  adminSaveHamperProduct, adminDeleteHamperProduct, adminListHamperProducts,
} from "@/lib/admin.functions";
import { productsQuery } from "@/lib/queries";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminTable, SectionHeader, FieldInput } from "./AdminShared";
import type { Product } from "@/lib/types";

const EMPTY_PRODUCT = {
  name: "", brand: "", category: "Smartphones", price: 0,
  original_price: null as number | null, stock_status: "in_stock", stock_qty: 0,
  description: "", specsText: "", imagesText: "", is_featured: false,
  finance_available: false, warranty: "", colors: "",
};

type ProductDraft = typeof EMPTY_PRODUCT & { id?: string };

export function ProductsTab({ token }: { token: string }) {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery(productsQuery);
  const saveFn = useServerFn(adminSaveProduct);
  const delFn = useServerFn(adminDeleteProduct);
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [saving, setSaving] = useState(false);

  function setD<K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      await saveFn({
        data: {
          token,
          product: {
            ...(draft.id ? { id: draft.id } : {}),
            name: draft.name,
            brand: draft.brand,
            category: draft.category,
            price: Number(draft.price),
            original_price: draft.original_price,
            stock_status: draft.stock_status,
            stock_qty: Number(draft.stock_qty),
            description: draft.description,
            is_featured: draft.is_featured,
            finance_available: draft.finance_available,
            warranty: draft.warranty || null,
            specs: Object.fromEntries(
              draft.specsText.split("\n").filter(Boolean).map((l) => {
                const [k, ...rest] = l.split(":");
                return [k?.trim() ?? "", rest.join(":").trim()];
              })
            ),
            images: draft.imagesText.split("\n").map((l) => l.trim()).filter(Boolean),
            colors: draft.colors.split(",").map((c) => c.trim()).filter(Boolean),
          },
        },
      });
      toast.success("Product saved.");
      qc.invalidateQueries({ queryKey: ["products"] });
      setDraft(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      await delFn({ data: { token, id } });
      toast.success("Product deleted.");
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  }

  return (
    <div>
      <SectionHeader title="Products" onAdd={() => setDraft({ ...EMPTY_PRODUCT })} />
      <AdminTable
        headers={["Product", "Brand", "Category", "Price", "Stock", "Featured", "Actions"]}
        rows={products.map((p) => [
          <span key="name" className="font-medium">{p.name}</span>,
          p.brand,
          p.category,
          formatINR(p.price),
          <span key="stock" className={p.stock_status === "in_stock" ? "text-green-400 text-xs" : "text-orange-400 text-xs"}>
            {p.stock_status}
          </span>,
          p.is_featured ? <CheckCircle key="feat" className="size-4 text-primary" /> : <XCircle key="feat" className="size-4 text-muted-foreground" />,
          <div key="act" className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft({
                  id: p.id,
                  name: p.name,
                  brand: p.brand,
                  category: p.category,
                  price: p.price,
                  original_price: p.original_price,
                  stock_status: p.stock_status,
                  stock_qty: p.stock_qty,
                  description: p.description,
                  is_featured: p.is_featured,
                  finance_available: p.finance_available || false,
                  warranty: p.warranty || "",
                  colors: (p.colors || []).join(", "),
                  specsText: Object.entries(p.specs || {}).map(([k, v]) => `${k}: ${v}`).join("\n"),
                  imagesText: (p.images || []).join("\n"),
                });
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive-foreground" onClick={() => del(p.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>,
        ])}
      />

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit" : "Add"} Product</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldInput label="Name" value={draft.name} onChange={(v) => setD("name", v)} />
              <FieldInput label="Brand" value={draft.brand} onChange={(v) => setD("brand", v)} />
              <FieldInput label="Category" value={draft.category} onChange={(v) => setD("category", v)} />
              <FieldInput label="Price (₹)" type="number" value={String(draft.price)} onChange={(v) => setD("price", Number(v))} />
              <FieldInput label="Original Price (₹)" type="number" value={String(draft.original_price ?? "")} onChange={(v) => setD("original_price", v ? Number(v) : null)} />
              <div className="space-y-2">
                <Label>Stock Status</Label>
                <Select value={draft.stock_status} onValueChange={(v) => setD("stock_status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    <SelectItem value="pre_order">Pre-Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FieldInput label="Stock Qty" type="number" value={String(draft.stock_qty)} onChange={(v) => setD("stock_qty", Number(v))} />
              <FieldInput label="Warranty" value={draft.warranty} onChange={(v) => setD("warranty", v)} />
              <FieldInput label="Colors (comma-separated)" value={draft.colors} onChange={(v) => setD("colors", v)} />
              <div className="sm:col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea rows={3} value={draft.description} onChange={(e) => setD("description", e.target.value)} />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Specs (one per line: Key: Value)</Label>
                <Textarea rows={5} value={draft.specsText} onChange={(e) => setD("specsText", e.target.value)} />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Image URLs (one per line)</Label>
                <Textarea rows={3} value={draft.imagesText} onChange={(e) => setD("imagesText", e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={draft.is_featured} onCheckedChange={(v) => setD("is_featured", v)} id="featured" />
                <Label htmlFor="featured">Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={draft.finance_available} onCheckedChange={(v) => setD("finance_available", v)} id="finance" />
                <Label htmlFor="finance">Finance Available</Label>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Product"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function BrandsTab({ token }: { token: string }) {
  const [brands, setBrands] = useState<unknown[]>([]);
  const [draft, setDraft] = useState<{ id?: string; name: string; logo_url: string; display_order: number; is_active: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const listFn = useServerFn(adminListBrands);
  const saveFn = useServerFn(adminSaveBrand);
  const delFn = useServerFn(adminDeleteBrand);

  useEffect(() => {
    listFn({ data: { token } }).then((d) => setBrands((d ?? []) as unknown[])).catch(() => {});
  }, [token]);

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      await saveFn({ data: { token, brand: draft } });
      toast.success("Brand saved.");
      listFn({ data: { token } }).then((d) => setBrands((d ?? []) as unknown[]));
      setDraft(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete brand?")) return;
    try {
      await delFn({ data: { token, id } });
      toast.success("Deleted.");
      listFn({ data: { token } }).then((d) => setBrands((d ?? []) as unknown[]));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  }

  const bs = brands as { id: string; name: string; logo_url: string | null; display_order: number; is_active: boolean }[];

  return (
    <div>
      <SectionHeader title="Brands" onAdd={() => setDraft({ name: "", logo_url: "", display_order: 0, is_active: true })} />
      <AdminTable
        headers={["Name", "Logo", "Order", "Active", "Actions"]}
        rows={bs.map((b) => [
          b.name,
          b.logo_url ? <img key="img" src={b.logo_url} alt={b.name} className="h-8 object-contain" /> : "—",
          String(b.display_order),
          b.is_active ? <CheckCircle key="act" className="size-4 text-primary" /> : <XCircle key="act" className="size-4 text-muted-foreground" />,
          <div key="actions" className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setDraft({ ...b, logo_url: b.logo_url ?? "" })}>
              <Pencil className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive-foreground" onClick={() => del(b.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>,
        ])}
      />
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{draft?.id ? "Edit" : "Add"} Brand</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <FieldInput label="Brand Name" value={draft.name} onChange={(v) => setDraft((d) => (d ? { ...d, name: v } : d))} />
              <FieldInput label="Logo URL" value={draft.logo_url} onChange={(v) => setDraft((d) => (d ? { ...d, logo_url: v } : d))} />
              <FieldInput label="Display Order" type="number" value={String(draft.display_order)} onChange={(v) => setDraft((d) => (d ? { ...d, display_order: Number(v) } : d))} />
              <div className="flex items-center gap-2">
                <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft((d) => (d ? { ...d, is_active: v } : d))} id="b-active" />
                <Label htmlFor="b-active">Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function RefurbishedTab({ token }: { token: string }) {
  const [items, setItems] = useState<unknown[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const listFn = useServerFn(adminListRefurbished);
  const saveFn = useServerFn(adminSaveRefurbished);
  const delFn = useServerFn(adminDeleteRefurbished);

  useEffect(() => {
    listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[])).catch(() => {});
  }, [token]);

  async function save() {
    if (!draft) return;
    try {
      await saveFn({
        data: {
          token,
          product: {
            ...draft,
            price: Number(draft["price"]),
            images: String(draft["imagesText"] ?? "").split("\n").map((l: string) => l.trim()).filter(Boolean),
          },
        },
      });
      toast.success("Saved.");
      listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[]));
      setDraft(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  }

  async function del(id: string) {
    if (!confirm("Delete?")) return;
    try {
      await delFn({ data: { token, id } });
      toast.success("Deleted.");
      listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[]));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  }

  type RefurbRow = { id: string; brand: string; model: string; condition: string; price: number; is_available: boolean; images: string[] };
  const rows = items as RefurbRow[];

  return (
    <div>
      <SectionHeader
        title="Refurbished Products"
        onAdd={() =>
          setDraft({
            brand: "",
            model: "",
            storage: "",
            ram: "",
            condition: "good",
            condition_grade: "",
            battery_health: "",
            price: 0,
            original_price: "",
            warranty: "",
            description: "",
            is_available: true,
            imagesText: "",
          })
        }
      />
      <AdminTable
        headers={["Brand", "Model", "Condition", "Price", "Available", "Actions"]}
        rows={rows.map((r) => [
          r.brand,
          r.model,
          <span key="cond" className="capitalize text-xs">{r.condition}</span>,
          formatINR(r.price),
          r.is_available ? <CheckCircle key="avail" className="size-4 text-primary" /> : <XCircle key="avail" className="size-4 text-muted-foreground" />,
          <div key="act" className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setDraft({ ...r, imagesText: r.images.join("\n") })}>
              <Pencil className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive-foreground" onClick={() => del(r.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>,
        ])}
      />
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Refurbished Phone</DialogTitle></DialogHeader>
          {draft && (
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldInput label="Brand" value={String(draft["brand"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, brand: v } : d))} />
              <FieldInput label="Model" value={String(draft["model"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, model: v } : d))} />
              <FieldInput label="Storage" value={String(draft["storage"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, storage: v } : d))} />
              <FieldInput label="RAM" value={String(draft["ram"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, ram: v } : d))} />
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={String(draft["condition"])} onValueChange={(v) => setDraft((d) => (d ? { ...d, condition: v } : d))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FieldInput label="Grade (A/B/C)" value={String(draft["condition_grade"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, condition_grade: v } : d))} />
              <FieldInput label="Battery Health %" type="number" value={String(draft["battery_health"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, battery_health: Number(v) } : d))} />
              <FieldInput label="Price (₹)" type="number" value={String(draft["price"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, price: Number(v) } : d))} />
              <FieldInput label="Original Price (₹)" type="number" value={String(draft["original_price"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, original_price: v ? Number(v) : null } : d))} />
              <FieldInput label="Warranty" value={String(draft["warranty"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, warranty: v } : d))} />
              <div className="sm:col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea value={String(draft["description"] ?? "")} onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))} rows={2} />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Image URLs (one per line)</Label>
                <Textarea value={String(draft["imagesText"] ?? "")} onChange={(e) => setDraft((d) => (d ? { ...d, imagesText: e.target.value } : d))} rows={3} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={Boolean(draft["is_available"])} onCheckedChange={(v) => setDraft((d) => (d ? { ...d, is_available: v } : d))} id="r-avail" />
                <Label htmlFor="r-avail">Available</Label>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
                <Button onClick={save}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function HampersTab({ token }: { token: string }) {
  const [items, setItems] = useState<unknown[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const listFn = useServerFn(adminListHamperProducts);
  const saveFn = useServerFn(adminSaveHamperProduct);
  const delFn = useServerFn(adminDeleteHamperProduct);

  useEffect(() => {
    listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[])).catch(() => {});
  }, [token]);

  const refresh = () => listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[]));
  type HamperRow = { id: string; name: string; category: string; price: number; is_available: boolean };
  const rows = items as HamperRow[];

  return (
    <div>
      <SectionHeader
        title="Gift Hamper Products"
        onAdd={() =>
          setDraft({
            name: "",
            description: "",
            category: "general",
            price: 0,
            image_url: "",
            is_available: true,
            display_order: 0,
          })
        }
      />
      <AdminTable
        headers={["Name", "Category", "Price", "Available", "Actions"]}
        rows={rows.map((r) => [
          r.name,
          r.category,
          formatINR(r.price),
          r.is_available ? <CheckCircle key="avail" className="size-4 text-primary" /> : <XCircle key="avail" className="size-4 text-muted-foreground" />,
          <div key="act" className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setDraft({ ...r })}>
              <Pencil className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive-foreground"
              onClick={async () => {
                if (!confirm("Delete?")) return;
                await delFn({ data: { token, id: r.id } });
                refresh();
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>,
        ])}
      />
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hamper Product</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <FieldInput label="Name" value={String(draft["name"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, name: v } : d))} />
              <FieldInput label="Category" value={String(draft["category"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, category: v } : d))} />
              <FieldInput label="Price (₹)" type="number" value={String(draft["price"] ?? 0)} onChange={(v) => setDraft((d) => (d ? { ...d, price: Number(v) } : d))} />
              <FieldInput label="Image URL" value={String(draft["image_url"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, image_url: v } : d))} />
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={String(draft["description"] ?? "")} onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))} rows={2} />
              </div>
              <FieldInput label="Display Order" type="number" value={String(draft["display_order"] ?? 0)} onChange={(v) => setDraft((d) => (d ? { ...d, display_order: Number(v) } : d))} />
              <div className="flex items-center gap-2">
                <Switch checked={Boolean(draft["is_available"])} onCheckedChange={(v) => setDraft((d) => (d ? { ...d, is_available: v } : d))} id="h-avail" />
                <Label htmlFor="h-avail">Available</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
                <Button
                  onClick={async () => {
                    try {
                      await saveFn({ data: { token, product: draft } });
                      toast.success("Saved.");
                      refresh();
                      setDraft(null);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed.");
                    }
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
