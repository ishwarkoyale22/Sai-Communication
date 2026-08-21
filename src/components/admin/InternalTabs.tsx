import React, { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";
import {
  adminSaveBranch, adminDeleteBranch, adminListBranches, adminGetBranchInventory,
  adminCreateTransfer, adminUpdateTransferStatus, adminListTransfers,
  adminSaveSupplier, adminDeleteSupplier, adminListSuppliers,
  adminListProductSources,
  adminSaveThirdPartySource, adminListThirdPartySources,
} from "@/lib/admin.functions";
import { formatINR, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminTable, SectionHeader, FieldInput } from "./AdminShared";

export function BranchesTab({ token }: { token: string }) {
  const [items, setItems] = useState<unknown[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const listFn = useServerFn(adminListBranches);
  const saveFn = useServerFn(adminSaveBranch);
  const delFn = useServerFn(adminDeleteBranch);

  useEffect(() => {
    listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[])).catch(() => {});
  }, [token]);

  const refresh = () => listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[]));
  type BranchRow = { id: string; name: string; city: string | null; contact_person: string | null; phone: string | null; is_active: boolean };
  const rows = items as BranchRow[];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-3">
        <AlertTriangle className="size-4 text-primary" />
        <p className="text-xs text-muted-foreground">🔒 Internal Only — Branch information is never shown to customers.</p>
      </div>
      <SectionHeader
        title="Branches"
        onAdd={() =>
          setDraft({
            name: "",
            address: "",
            city: "",
            contact_person: "",
            phone: "",
            opening_hours: "",
            is_active: true,
          })
        }
      />
      <AdminTable
        headers={["Name", "City", "Contact", "Phone", "Active", "Actions"]}
        rows={rows.map((r) => [
          r.name,
          r.city ?? "—",
          r.contact_person ?? "—",
          r.phone ?? "—",
          r.is_active ? <CheckCircle key="act" className="size-4 text-primary" /> : <XCircle key="act" className="size-4 text-muted-foreground" />,
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
          <DialogHeader><DialogTitle>Branch</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <FieldInput label="Branch Name" value={String(draft["name"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, name: v } : d))} />
              <FieldInput label="Address" value={String(draft["address"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, address: v } : d))} />
              <FieldInput label="City" value={String(draft["city"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, city: v } : d))} />
              <FieldInput label="Contact Person" value={String(draft["contact_person"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, contact_person: v } : d))} />
              <FieldInput label="Phone" value={String(draft["phone"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, phone: v } : d))} />
              <FieldInput label="Opening Hours" value={String(draft["opening_hours"] ?? "")} onChange={(v) => setDraft((d) => (d ? { ...d, opening_hours: v } : d))} />
              <div className="flex items-center gap-2">
                <Switch checked={Boolean(draft["is_active"])} onCheckedChange={(v) => setDraft((d) => (d ? { ...d, is_active: v } : d))} id="br-active" />
                <Label htmlFor="br-active">Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
                <Button
                  onClick={async () => {
                    try {
                      await saveFn({ data: { token, branch: draft } });
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

export function InventoryTab({ token }: { token: string }) {
  const [branches, setBranches] = useState<unknown[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [inventory, setInventory] = useState<unknown[]>([]);
  const listBranchesFn = useServerFn(adminListBranches);
  const getInvFn = useServerFn(adminGetBranchInventory);

  useEffect(() => {
    listBranchesFn({ data: { token } }).then((d) => setBranches((d ?? []) as unknown[])).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!selectedBranch) return;
    getInvFn({ data: { token, branch_id: selectedBranch } }).then((d) => setInventory((d ?? []) as unknown[])).catch(() => {});
  }, [token, selectedBranch]);

  type BranchRow = { id: string; name: string };
  type InvRow = { id: string; quantity: number; reserved_quantity: number; products: { name: string; brand: string } | null };
  const bs = branches as BranchRow[];
  const inv = inventory as InvRow[];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-3">
        <AlertTriangle className="size-4 text-primary" />
        <p className="text-xs text-muted-foreground">🔒 Internal Only — Never shown to customers.</p>
      </div>
      <SectionHeader title="Branch Inventory" />
      <div className="mb-4 max-w-xs">
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
          <SelectContent>{bs.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {selectedBranch && (
        <AdminTable
          headers={["Product", "Brand", "Qty", "Reserved", "Available"]}
          rows={inv.map((r) => [
            r.products?.name ?? "—",
            r.products?.brand ?? "—",
            String(r.quantity),
            String(r.reserved_quantity),
            <span key="avail" className="text-primary font-semibold">{r.quantity - r.reserved_quantity}</span>,
          ])}
        />
      )}
    </div>
  );
}

export function TransfersTab({ token }: { token: string }) {
  const [items, setItems] = useState<unknown[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const listFn = useServerFn(adminListTransfers);
  const updateFn = useServerFn(adminUpdateTransferStatus);

  useEffect(() => {
    listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[])).catch(() => {});
  }, [token]);

  type TransferRow = {
    id: string;
    transfer_status: string;
    quantity: number;
    products: { name: string } | null;
    from_branch: { name: string } | null;
    to_branch: { name: string } | null;
    created_at: string;
  };
  const rows = items as TransferRow[];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-3">
        <AlertTriangle className="size-4 text-primary" />
        <p className="text-xs text-muted-foreground">🔒 Internal Only</p>
      </div>
      <SectionHeader title="Product Transfers" />
      <AdminTable
        headers={["Product", "From", "To", "Qty", "Status", "Date", "Action"]}
        rows={rows.map((r) => [
          r.products?.name ?? "—",
          r.from_branch?.name ?? "—",
          r.to_branch?.name ?? "—",
          String(r.quantity),
          <span key="status" className="text-xs capitalize">{r.transfer_status.replace(/_/g, " ")}</span>,
          formatDate(r.created_at),
          <Button key="btn" size="sm" variant="ghost" onClick={() => { setSelected(r); setNewStatus(r.transfer_status); }}>
            <Pencil className="size-4" />
          </Button>,
        ])}
      />
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Transfer</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["requested", "approved", "in_transit", "received", "completed", "cancelled"].map((s) => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button>
                <Button
                  onClick={async () => {
                    try {
                      await updateFn({ data: { token, id: (selected as { id: string }).id, transfer_status: newStatus } });
                      toast.success("Updated.");
                      listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[]));
                      setSelected(null);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed.");
                    }
                  }}
                >
                  Update
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function SuppliersTab({ token }: { token: string }) {
  const [items, setItems] = useState<unknown[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const listFn = useServerFn(adminListSuppliers);
  const saveFn = useServerFn(adminSaveSupplier);
  const delFn = useServerFn(adminDeleteSupplier);

  useEffect(() => {
    listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[])).catch(() => {});
  }, [token]);

  const refresh = () => listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[]));
  type SupplierRow = { id: string; name: string; contact_person: string | null; phone: string | null; email: string | null };
  const rows = items as SupplierRow[];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-3">
        <AlertTriangle className="size-4 text-primary" />
        <p className="text-xs text-muted-foreground">🔒 Internal Only — Supplier details are never shown to customers.</p>
      </div>
      <SectionHeader
        title="Suppliers"
        onAdd={() =>
          setDraft({
            name: "",
            contact_person: "",
            phone: "",
            email: "",
            address: "",
            notes: "",
            is_active: true,
          })
        }
      />
      <AdminTable
        headers={["Name", "Contact", "Phone", "Email", "Actions"]}
        rows={rows.map((r) => [
          r.name,
          r.contact_person ?? "—",
          r.phone ?? "—",
          r.email ?? "—",
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
          <DialogHeader><DialogTitle>Supplier</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              {(["name", "contact_person", "phone", "email", "address"] as const).map((k) => (
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
                      await saveFn({ data: { token, supplier: draft } });
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

export function SourcesTab({ token }: { token: string }) {
  const [items, setItems] = useState<unknown[]>([]);
  const listFn = useServerFn(adminListProductSources);
  useEffect(() => {
    listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[])).catch(() => {});
  }, [token]);

  type SourceRow = {
    id: string;
    products: { name: string } | null;
    suppliers: { name: string } | null;
    source_branch: { name: string } | null;
    purchase_date: string | null;
    quantity: number;
    purchase_cost: number | null;
  };
  const rows = items as SourceRow[];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-3">
        <AlertTriangle className="size-4 text-primary" />
        <p className="text-xs text-muted-foreground">🔒 Internal Only — Purchase cost and source details never shown to customers.</p>
      </div>
      <SectionHeader title="Product Sources" />
      <AdminTable
        headers={["Product", "Supplier", "Source Branch", "Purchase Date", "Qty", "Cost (₹)"]}
        rows={rows.map((r) => [
          r.products?.name ?? "—",
          r.suppliers?.name ?? "—",
          r.source_branch?.name ?? "—",
          r.purchase_date ?? "—",
          String(r.quantity),
          r.purchase_cost != null ? formatINR(r.purchase_cost) : "—",
        ])}
      />
    </div>
  );
}

export function ThirdPartyTab({ token }: { token: string }) {
  const [items, setItems] = useState<unknown[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const listFn = useServerFn(adminListThirdPartySources);
  const saveFn = useServerFn(adminSaveThirdPartySource);

  useEffect(() => {
    listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[])).catch(() => {});
  }, [token]);

  const refresh = () => listFn({ data: { token } }).then((d) => setItems((d ?? []) as unknown[]));
  type TPRow = { id: string; name: string; sector: string | null; contact_person: string | null; phone: string | null };
  const rows = items as TPRow[];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-3">
        <AlertTriangle className="size-4 text-primary" />
        <p className="text-xs text-muted-foreground">🔒 Internal Only</p>
      </div>
      <SectionHeader
        title="Third-Party Sources"
        onAdd={() =>
          setDraft({
            name: "",
            sector: "",
            contact_person: "",
            phone: "",
            email: "",
            notes: "",
            is_active: true,
          })
        }
      />
      <AdminTable
        headers={["Name", "Sector", "Contact", "Phone", "Actions"]}
        rows={rows.map((r) => [
          r.name,
          r.sector ?? "—",
          r.contact_person ?? "—",
          r.phone ?? "—",
          <Button key="act" size="sm" variant="ghost" onClick={() => setDraft({ ...r })}>
            <Pencil className="size-4" />
          </Button>,
        ])}
      />
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Third-Party Source</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              {(["name", "sector", "contact_person", "phone", "email"] as const).map((k) => (
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
                      await saveFn({ data: { token, source: draft } });
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
