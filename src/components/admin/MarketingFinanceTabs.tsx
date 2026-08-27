import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";
import {
  adminSaveOffer, adminDeleteOffer, adminToggleOffer, adminListOffers,
  adminSavePopup, adminTogglePopup, adminListPopups,
  adminSaveGalleryItem, adminDeleteGalleryItem, adminListGallery,
  adminSaveFinancePartner, adminDeleteFinancePartner, adminListFinancePartners,
  adminSaveDirectPartner, adminListDirectPartners,
  adminSaveSettings,
} from "@/lib/admin.functions";
import { settingsQuery } from "@/lib/queries";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminTable, SectionHeader, FieldInput } from "./AdminShared";

export function OffersTab({ token }: { token: string }) {
  const [items, setItems] = useState<unknown[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const listFn = useServerFn(adminListOffers);
  const saveFn = useServerFn(adminSaveOffer);
  const delFn = useServerFn(adminDeleteOffer);
  const toggleFn = useServerFn(adminToggleOffer);

  useEffect(() => {
    listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[])).catch(() => {});
  }, [token]);

  const refresh = () => listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[]));
  type OfferRow = { id: string; title: string; discount_text: string | null; is_active: boolean; valid_until: string | null };
  const rows = items as OfferRow[];

  async function save() {
    if (!draft) return;
    try {
      await saveFn({ data: { token, offer: draft } });
      toast.success("Saved.");
      refresh();
      setDraft(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  }

  return (
    <div>
      <SectionHeader
        title="Offers"
        onAdd={() =>
          setDraft({
            title: "",
            description: "",
            discount_text: "",
            badge_text: "",
            cta_label: "Shop Now",
            cta_link: "/products",
            is_active: true,
            display_order: 0,
          })
        }
      />
      <AdminTable
        headers={["Title", "Discount", "Active", "Valid Until", "Actions"]}
        rows={rows.map((r) => [
          r.title,
          r.discount_text ?? "—",
          <Switch
            key="act"
            checked={r.is_active}
            onCheckedChange={async (v) => {
              await toggleFn({ data: { token, id: r.id, is_active: v } });
              refresh();
            }}
          />,
          r.valid_until ? new Date(r.valid_until).toLocaleDateString("en-IN") : "—",
          <div key="actions" className="flex gap-2">
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Offer</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <FieldInput label="Title" value={String(draft["title"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, title: v } : d))} />
              <FieldInput label="Discount Text (e.g. Up to 20% Off)" value={String(draft["discount_text"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, discount_text: v } : d))} />
              <FieldInput label="Badge Text" value={String(draft["badge_text"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, badge_text: v } : d))} />
              <FieldInput label="Banner Image URL" value={String(draft["banner_image_url"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, banner_image_url: v } : d))} />
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={String(draft["description"] ?? "")} onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))} rows={2} />
              </div>
              <FieldInput label="CTA Label" value={String(draft["cta_label"] ?? "Shop Now")} onChange={(v) => setDraft((d) => (d ? { ...d, cta_label: v } : d))} />
              <FieldInput label="CTA Link" value={String(draft["cta_link"] ?? "/products")} onChange={(v) => setDraft((d) => (d ? { ...d, cta_link: v } : d))} />
              <FieldInput label="Valid Until" type="datetime-local" value={String(draft["valid_until"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, valid_until: v || null } : d))} />
              <FieldInput label="Display Order" type="number" value={String(draft["display_order"] ?? 0)} onChange={(v) => setDraft((d) => (d ? { ...d, display_order: Number(v) } : d))} />
              <div className="flex items-center gap-2">
                <Switch checked={Boolean(draft["is_active"])} onCheckedChange={(v) => setDraft((d) => (d ? { ...d, is_active: v } : d))} id="o-active" />
                <Label htmlFor="o-active">Active</Label>
              </div>
              <div className="flex justify-end gap-2">
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

export function PopupTab({ token }: { token: string }) {
  const [popups, setPopups] = useState<unknown[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const listFn = useServerFn(adminListPopups);
  const saveFn = useServerFn(adminSavePopup);
  const toggleFn = useServerFn(adminTogglePopup);

  useEffect(() => {
    listFn({ data: { token } }).then((d) => setPopups((d ?? []) as unknown[])).catch(() => {});
  }, [token]);

  const refresh = () => listFn({ data: { token } }).then((d) => setPopups((d ?? []) as unknown[]));
  type PopupRow = { id: string; title: string | null; is_enabled: boolean; show_after_seconds: number };
  const rows = popups as PopupRow[];

  return (
    <div>
      <SectionHeader
        title="Promotional Popup"
        onAdd={() =>
          setDraft({
            title: "",
            description: "",
            discount_text: "",
            cta_label: "View Offer",
            cta_link: "/offers",
            is_enabled: false,
            show_after_seconds: 3,
            session_frequency_hours: 24,
          })
        }
      />
      <p className="text-xs text-muted-foreground mb-4">
        Only one popup can be enabled at a time. Enabling a new one disables all others.
      </p>
      <AdminTable
        headers={["Title", "Enabled", "Show After", "Actions"]}
        rows={rows.map((r) => [
          r.title ?? "—",
          <Switch
            key="act"
            checked={r.is_enabled}
            onCheckedChange={async (v) => {
              await toggleFn({ data: { token, id: r.id, is_enabled: v } });
              refresh();
            }}
          />,
          `${r.show_after_seconds}s`,
          <Button key="edit" size="sm" variant="ghost" onClick={() => setDraft({ ...r })}>
            <Pencil className="size-4" />
          </Button>,
        ])}
      />
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Popup</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <FieldInput label="Title" value={String(draft["title"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, title: v } : d))} />
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={String(draft["description"] ?? "")} onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))} rows={2} />
              </div>
              <FieldInput label="Discount Text" value={String(draft["discount_text"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, discount_text: v } : d))} />
              <FieldInput label="Image URL" value={String(draft["image_url"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, image_url: v } : d))} />
              <FieldInput label="CTA Label" value={String(draft["cta_label"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, cta_label: v } : d))} />
              <FieldInput label="CTA Link" value={String(draft["cta_link"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, cta_link: v } : d))} />
              <FieldInput label="Show After (seconds)" type="number" value={String(draft["show_after_seconds"] ?? 3)} onChange={(v) => setDraft((d) => (d ? { ...d, show_after_seconds: Number(v) } : d))} />
              <FieldInput label="Session Frequency (hours)" type="number" value={String(draft["session_frequency_hours"] ?? 24)} onChange={(v) => setDraft((d) => (d ? { ...d, session_frequency_hours: Number(v) } : d))} />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
                <Button
                  onClick={async () => {
                    try {
                      await saveFn({ data: { token, popup: draft } });
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

export function GalleryTab({ token }: { token: string }) {
  const [items, setItems] = useState<unknown[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const listFn = useServerFn(adminListGallery);
  const saveFn = useServerFn(adminSaveGalleryItem);
  const delFn = useServerFn(adminDeleteGalleryItem);

  useEffect(() => {
    listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[])).catch(() => {});
  }, [token]);

  const refresh = () => listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[]));
  type GalleryRow = { id: string; type: string; category: string; title: string | null; url: string; is_active: boolean };
  const rows = items as GalleryRow[];

  return (
    <div>
      <SectionHeader
        title="Gallery"
        onAdd={() =>
          setDraft({
            type: "photo",
            category: "general",
            title: "",
            url: "",
            thumbnail_url: "",
            display_order: 0,
            is_active: true,
          })
        }
      />
      <AdminTable
        headers={["Type", "Category", "Title", "URL", "Active", "Actions"]}
        rows={rows.map((r) => [
          r.type,
          r.category,
          r.title ?? "—",
          <a key="link" href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary truncate max-w-[120px] block">
            {r.url}
          </a>,
          r.is_active ? <CheckCircle key="act" className="size-4 text-primary" /> : <XCircle key="act" className="size-4 text-muted-foreground" />,
          <div key="acts" className="flex gap-2">
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
          <DialogHeader><DialogTitle>Gallery Item</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={String(draft["type"])} onValueChange={(v) => setDraft((d) => (d ? { ...d, type: v } : d))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={String(draft["category"])} onValueChange={(v) => setDraft((d) => (d ? { ...d, category: v } : d))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["general", "store", "team", "products", "events", "promotions"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FieldInput label="Title" value={String(draft["title"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, title: v } : d))} />
              <FieldInput label="URL" value={String(draft["url"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, url: v } : d))} />
              <FieldInput label="Thumbnail URL (for videos)" value={String(draft["thumbnail_url"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, thumbnail_url: v } : d))} />
              <FieldInput label="Display Order" type="number" value={String(draft["display_order"] ?? 0)} onChange={(v) => setDraft((d) => (d ? { ...d, display_order: Number(v) } : d))} />
              <div className="flex items-center gap-2">
                <Switch checked={Boolean(draft["is_active"])} onCheckedChange={(v) => setDraft((d) => (d ? { ...d, is_active: v } : d))} id="g-active" />
                <Label htmlFor="g-active">Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
                <Button
                  onClick={async () => {
                    try {
                      await saveFn({ data: { token, item: draft } });
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

export function FinanceTab({ token }: { token: string }) {
  const [items, setItems] = useState<unknown[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const listFn = useServerFn(adminListFinancePartners);
  const saveFn = useServerFn(adminSaveFinancePartner);
  const delFn = useServerFn(adminDeleteFinancePartner);

  useEffect(() => {
    listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[])).catch(() => {});
  }, [token]);

  const refresh = () => listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[]));
  type FinRow = { id: string; name: string; min_amount: number | null; max_amount: number | null; processing_fee_pct: number; is_active: boolean };
  const rows = items as FinRow[];

  return (
    <div>
      <SectionHeader
        title="Finance Partners"
        onAdd={() =>
          setDraft({
            name: "",
            description: "",
            min_amount: null,
            max_amount: null,
            available_tenures: [6, 12, 18, 24],
            processing_fee_pct: 0,
            is_active: true,
            tenuresText: "6,12,18,24",
          })
        }
      />
      <AdminTable
        headers={["Name", "Min Amount", "Max Amount", "Fee %", "Active", "Actions"]}
        rows={rows.map((r) => [
          r.name,
          r.min_amount != null ? formatINR(r.min_amount) : "—",
          r.max_amount != null ? formatINR(r.max_amount) : "—",
          `${r.processing_fee_pct}%`,
          r.is_active ? <CheckCircle key="act" className="size-4 text-primary" /> : <XCircle key="act" className="size-4 text-muted-foreground" />,
          <div key="acts" className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setDraft({
                  ...r,
                  tenuresText: String((r as unknown as { available_tenures: number[] }).available_tenures?.join(",") ?? "6,12,18,24"),
                })
              }
            >
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
          <DialogHeader><DialogTitle>Finance Partner</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <FieldInput label="Name" value={String(draft["name"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, name: v } : d))} />
              <FieldInput label="Min Amount (₹)" type="number" value={String(draft["min_amount"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, min_amount: v ? Number(v) : null } : d))} />
              <FieldInput label="Max Amount (₹)" type="number" value={String(draft["max_amount"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, max_amount: v ? Number(v) : null } : d))} />
              <FieldInput label="Processing Fee %" type="number" value={String(draft["processing_fee_pct"] ?? 0)} onChange={(v) => setDraft((d) => (d ? { ...d, processing_fee_pct: Number(v) } : d))} />
              <FieldInput
                label="Available Tenures (comma-separated, months)"
                value={String(draft["tenuresText"] ?? "6,12,18,24")}
                onChange={(v) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          tenuresText: v,
                          available_tenures: v.split(",").map((t) => parseInt(t.trim())).filter(Boolean),
                        }
                      : d
                  )
                }
              />
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={String(draft["description"] ?? "")} onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))} rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={Boolean(draft["is_active"])} onCheckedChange={(v) => setDraft((d) => (d ? { ...d, is_active: v } : d))} id="fp-active" />
                <Label htmlFor="fp-active">Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
                <Button
                  onClick={async () => {
                    try {
                      await saveFn({
                        data: {
                          token,
                          partner: {
                            ...draft,
                            available_tenures: String(draft["tenuresText"] ?? "")
                              .split(",")
                              .map((t) => parseInt(t.trim()))
                              .filter(Boolean),
                          },
                        },
                      });
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

export function DirectPartnersTab({ token }: { token: string }) {
  const [items, setItems] = useState<unknown[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const listFn = useServerFn(adminListDirectPartners);
  const saveFn = useServerFn(adminSaveDirectPartner);

  useEffect(() => {
    listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[])).catch(() => {});
  }, [token]);

  const refresh = () => listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[]));
  type DPRow = { id: string; name: string; contact_person: string | null; phone: string | null };
  const rows = items as DPRow[];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-3">
        <AlertTriangle className="size-4 text-primary" /> <p className="text-xs text-muted-foreground">🔒 Internal Only</p>
      </div>
      <SectionHeader
        title="Direct Partners"
        onAdd={() => setDraft({ name: "", contact_person: "", phone: "", email: "", notes: "", is_active: true })}
      />
      <AdminTable
        headers={["Name", "Contact", "Phone", "Actions"]}
        rows={rows.map((r) => [
          r.name,
          r.contact_person ?? "—",
          r.phone ?? "—",
          <Button key="act" size="sm" variant="ghost" onClick={() => setDraft({ ...r })}>
            <Pencil className="size-4" />
          </Button>,
        ])}
      />
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Direct Partner</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              {(["name", "contact_person", "phone", "email"] as const).map((k) => (
                <FieldInput key={k} label={k.replace(/_/g, " ")} value={String(draft[k] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, [k]: v } : d))} />
              ))}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={String(draft["notes"] ?? "")} onChange={(e) => setDraft((d) => (d ? { ...d, notes: e.target.value } : d))} rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
                <Button
                  onClick={async () => {
                    try {
                      await saveFn({ data: { token, partner: draft } });
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

const SETTING_FIELDS = [
  // Brand & Founder
  ["shop_name", "Shop Name"],
  ["tagline", "Tagline"],
  ["logo_url", "Logo URL"],
  ["owner_name", "Owner / Founder Name"],
  ["vijay_sir_photo_url", "Vijay Sir Photo URL (hero_photo_url)"],
  ["vijay_sir_video_url", "Vijay Sir Video URL (owner_video_url)"],
  ["owner_intro", "Vijay Sir Intro / Quote"],
  ["owner_history", "Store History Text"],
  ["established", "Established Year"],
  ["years_in_business", "Years in Business"],
  ["rating", "Justdial / Google Rating (e.g. 4.8)"],
  ["total_ratings", "Total Ratings Count (e.g. 242)"],

  // Store Contact Details
  ["store_phone", "Store Phone (phone)"],
  ["phone_alt", "Alternative Phone"],
  ["store_whatsapp", "Store WhatsApp (with country code)"],
  ["store_email", "Store Email (email)"],
  ["store_address", "Full Address (address)"],
  ["store_hours", "Store Hours (hours)"],
  ["google_maps_embed_url", "Google Maps Embed URL (maps_embed)"],

  // Social Links
  ["facebook_url", "Facebook Page URL (facebook)"],
  ["instagram_url", "Instagram Profile URL (instagram)"],
  ["youtube_url", "YouTube Channel URL (youtube)"],
  ["twitter_url", "Twitter / X URL (twitter)"],

  // Policies
  ["delivery_policy", "Delivery Policy"],
  ["return_policy", "Return Policy"],
  ["warranty_policy", "Warranty Policy"],
] as const;

export function SettingsTab({ token }: { token: string }) {
  const { data: settingsData } = useQuery(settingsQuery);
  const [local, setLocal] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const saveFn = useServerFn(adminSaveSettings);
  const qc = useQueryClient();

  useEffect(() => {
    if (settingsData) setLocal({ ...settingsData });
  }, [settingsData]);

  async function save() {
    setSaving(true);
    try {
      // Sync aliases so both forms are saved to Supabase
      const entriesToSave = { ...local };
      if (entriesToSave["vijay_sir_photo_url"]) entriesToSave["hero_photo_url"] = entriesToSave["vijay_sir_photo_url"];
      if (entriesToSave["vijay_sir_video_url"]) entriesToSave["owner_video_url"] = entriesToSave["vijay_sir_video_url"];
      if (entriesToSave["store_phone"]) entriesToSave["phone"] = entriesToSave["store_phone"];
      if (entriesToSave["store_whatsapp"]) entriesToSave["whatsapp"] = entriesToSave["store_whatsapp"];
      if (entriesToSave["store_email"]) entriesToSave["email"] = entriesToSave["store_email"];
      if (entriesToSave["store_address"]) entriesToSave["address"] = entriesToSave["store_address"];
      if (entriesToSave["store_hours"]) entriesToSave["hours"] = entriesToSave["store_hours"];
      if (entriesToSave["google_maps_embed_url"]) entriesToSave["maps_embed"] = entriesToSave["google_maps_embed_url"];
      if (entriesToSave["facebook_url"]) entriesToSave["facebook"] = entriesToSave["facebook_url"];
      if (entriesToSave["instagram_url"]) entriesToSave["instagram"] = entriesToSave["instagram_url"];
      if (entriesToSave["youtube_url"]) entriesToSave["youtube"] = entriesToSave["youtube_url"];

      await saveFn({
        data: {
          token,
          entries: Object.entries(entriesToSave).map(([key, value]) => ({ key, value })),
        },
      });
      toast.success("Settings saved successfully.");
      qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <SectionHeader title="Settings" />
      <p className="text-xs text-muted-foreground mb-6">
        Update your store contact details, Vijay Sir branding, store hours, social media links, and policies in real-time.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {SETTING_FIELDS.map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`setting-${key}`}>{label}</Label>
            {(key as string).includes("policy") ||
            (key as string).includes("history") ||
            (key as string).includes("intro") ? (
              <Textarea
                id={`setting-${key}`}
                value={local[key] ?? ""}
                onChange={(e) => setLocal((l) => ({ ...l, [key]: e.target.value }))}
                rows={3}
              />
            ) : (
              <Input
                id={`setting-${key}`}
                value={local[key] ?? ""}
                onChange={(e) => setLocal((l) => ({ ...l, [key]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={save} disabled={saving} size="lg">
          {saving ? "Saving..." : "Save All Settings"}
        </Button>
      </div>
    </div>
  );
}
