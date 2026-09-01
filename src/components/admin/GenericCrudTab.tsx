import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminTable, SectionHeader } from "./AdminShared";
import { adminGenericList, adminGenericSave, adminGenericDelete } from "@/lib/admin.functions";
import { formatDate } from "@/lib/format";
import type { GenericCrudTable } from "@/lib/admin.server";

export type FieldType = "text" | "number" | "boolean" | "date" | "textarea" | "json";

export type FieldConfig = {
  key: string;
  label: string;
  type?: FieldType;
  /** Show this field as a column in the list table (defaults to true for the first 5 fields). */
  listColumn?: boolean;
};

function coerceForSave(fields: FieldConfig[], values: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = values[f.key] ?? "";
    if (f.type === "number") {
      out[f.key] = raw === "" ? null : Number(raw);
    } else if (f.type === "boolean") {
      out[f.key] = raw === "true";
    } else if (f.type === "json") {
      try {
        out[f.key] = raw.trim() === "" ? null : JSON.parse(raw);
      } catch {
        out[f.key] = raw; // let the server reject malformed JSON rather than silently drop it
      }
    } else {
      out[f.key] = raw === "" ? null : raw;
    }
  }
  return out;
}

function coerceForEdit(fields: FieldConfig[], row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = row[f.key];
    if (v == null) out[f.key] = "";
    else if (f.type === "json") out[f.key] = JSON.stringify(v, null, 2);
    else if (f.type === "boolean") out[f.key] = String(Boolean(v));
    else out[f.key] = String(v);
  }
  return out;
}

export function GenericCrudTab({
  token,
  table,
  title,
  fields,
  orderBy = "created_at",
  filter,
  extraFieldsOnSave,
  extraFieldsOnNew,
}: {
  token: string;
  table: GenericCrudTable;
  title: string;
  fields: FieldConfig[];
  orderBy?: string;
  /** Restrict the list to rows matching this column/value (e.g. product_type='new'). */
  filter?: { column: string; value: string };
  /** Merged into every save (e.g. { product_type: 'new' }) so shared tables split correctly. */
  extraFieldsOnSave?: Record<string, unknown>;
  /** Merged into a fresh "Add" draft's initial values (defaults to extraFieldsOnSave). */
  extraFieldsOnNew?: Record<string, string>;
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const listFn = useServerFn(adminGenericList);
  const saveFn = useServerFn(adminGenericSave);
  const deleteFn = useServerFn(adminGenericDelete);

  const refresh = () => {
    setLoading(true);
    listFn({ data: { token, table, orderBy, ascending: false, filter } })
      .then((d) => setRows((d ?? []) as Record<string, unknown>[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load records."))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, [table]);

  const columns = fields.filter((f) => f.listColumn !== false).slice(0, 6);

  function openNew() {
    const blank: Record<string, string> = {};
    for (const f of fields) blank[f.key] = "";
    Object.assign(blank, extraFieldsOnNew ?? {});
    setEditing(blank);
    setEditingId(null);
  }

  function openEdit(row: Record<string, unknown>) {
    setEditing(coerceForEdit(fields, row));
    setEditingId(String(row["id"]));
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const record = coerceForSave(fields, editing);
      Object.assign(record, extraFieldsOnSave ?? {});
      if (editingId) record["id"] = editingId;
      await saveFn({ data: { token, table, record } });
      toast.success("Saved.");
      setEditing(null);
      setEditingId(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    try {
      await deleteFn({ data: { token, table, id } });
      toast.success("Deleted.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete.");
    }
  }

  function fmtCell(f: FieldConfig, v: unknown): string {
    if (v == null) return "—";
    if (f.type === "boolean") return v ? "Yes" : "No";
    if (f.type === "date" && f.key.includes("_at")) return formatDate(String(v));
    if (f.type === "json") return typeof v === "string" ? v : JSON.stringify(v);
    return String(v);
  }

  return (
    <div>
      <SectionHeader title={title} onAdd={openNew} />
      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading...</p>
      ) : (
        <AdminTable
          headers={[...columns.map((c) => c.label), "Actions"]}
          rows={rows.map((row) => [
            ...columns.map((c) => fmtCell(c, row[c.key])),
            <div key="actions" className="flex gap-2">
              <button onClick={() => openEdit(row)} className="text-muted-foreground hover:text-primary">
                <Pencil className="size-4" />
              </button>
              <button onClick={() => handleDelete(String(row["id"]))} className="text-muted-foreground hover:text-destructive-foreground">
                <Trash2 className="size-4" />
              </button>
            </div>,
          ])}
        />
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) { setEditing(null); setEditingId(null); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Record" : "Add Record"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="capitalize">{f.label}</Label>
                  {f.type === "boolean" ? (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={editing[f.key] === "true"}
                        onCheckedChange={(v) => setEditing({ ...editing, [f.key]: v ? "true" : "false" })}
                      />
                      <span className="text-sm text-muted-foreground">{editing[f.key] === "true" ? "Yes" : "No"}</span>
                    </div>
                  ) : f.type === "textarea" || f.type === "json" ? (
                    <Textarea
                      rows={f.type === "json" ? 5 : 3}
                      value={editing[f.key] ?? ""}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                    />
                  ) : (
                    <Input
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      value={editing[f.key] ?? ""}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
