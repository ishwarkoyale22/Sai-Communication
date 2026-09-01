import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";
import {
  adminSavePopup, adminTogglePopup, adminListPopups,
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
import { GenericCrudTab, type FieldConfig } from "./GenericCrudTab";

const OFFER_FIELDS: FieldConfig[] = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "discount_percent", label: "Discount %", type: "number" },
  { key: "image", label: "Image URL" },
  { key: "valid_from", label: "Valid From", type: "date" },
  { key: "valid_until", label: "Valid Until", type: "date" },
  { key: "is_active", label: "Active", type: "boolean" },
];
export function OffersTab({ token }: { token: string }) {
  return <GenericCrudTab token={token} table="offers" title="Offers" fields={OFFER_FIELDS} />;
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

const GALLERY_FIELDS: FieldConfig[] = [
  { key: "image_url", label: "Image URL" },
  { key: "caption", label: "Caption" },
  { key: "sort_order", label: "Sort Order", type: "number" },
];
export function GalleryTab({ token }: { token: string }) {
  return <GenericCrudTab token={token} table="gallery" title="Gallery" fields={GALLERY_FIELDS} orderBy="sort_order" />;
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
