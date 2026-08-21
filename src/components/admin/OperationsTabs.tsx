import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  LayoutDashboard, ShoppingBag, Wrench, AlertTriangle, Package, Pencil, Eye
} from "lucide-react";
import {
  adminListOrders, adminUpdateOrderStatus, adminUpdateDeliveryStatus,
  adminListRepairEnquiries, adminUpdateRepairStatus,
  adminListCustomers, adminListEnquiries, adminSetEnquiryStatus
} from "@/lib/admin.functions";
import { productsQuery } from "@/lib/queries";
import { formatDate, formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminTable, SectionHeader } from "./AdminShared";
import { cn } from "@/lib/utils";
import type { Enquiry } from "@/lib/types";

export function DashboardTab({ token }: { token: string }) {
  const { data: products = [] } = useQuery(productsQuery);
  const [orders, setOrders] = useState<unknown[]>([]);
  const [repairs, setRepairs] = useState<unknown[]>([]);
  const listOrdersFn = useServerFn(adminListOrders);
  const listRepairFn = useServerFn(adminListRepairEnquiries);

  useEffect(() => {
    listOrdersFn({ data: { token } }).then((d) => setOrders((d ?? []) as unknown[])).catch(() => {});
    listRepairFn({ data: { token } }).then((d) => setRepairs((d ?? []) as unknown[])).catch(() => {});
  }, [token]);

  const kpis = [
    { label: "Total Products", value: products.length, icon: Package },
    { label: "Total Orders", value: orders.length, icon: ShoppingBag },
    { label: "Repair Enquiries", value: repairs.length, icon: Wrench },
    { label: "New Repairs", value: (repairs as { status: string }[]).filter((r) => r.status === "new").length, icon: AlertTriangle },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-sm text-muted-foreground mt-1">Overview of your store activity.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card-surface rounded-xl p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <k.icon className="size-4" />
              <span className="text-xs">{k.label}</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const ORDER_STATUSES = ["pending", "confirmed", "preparing", "ready", "collected", "delivered", "cancelled"];
const DELIVERY_STATUSES = ["pending", "preparing", "transfer_requested", "in_transit", "ready", "delivered", "collected", "cancelled"];

export function OrdersTab({ token }: { token: string }) {
  const [orders, setOrders] = useState<unknown[]>([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const listFn = useServerFn(adminListOrders);

  useEffect(() => {
    listFn({ data: { token, order_type: typeFilter, order_status: statusFilter } })
      .then((d) => setOrders((d ?? []) as unknown[]))
      .catch(() => {});
  }, [token, typeFilter, statusFilter]);

  type OrderRow = {
    id: string;
    order_number: string;
    customer_name: string;
    customer_phone: string;
    total_amount: number;
    order_type: string;
    order_status: string;
    delivery_status: string;
    created_at: string;
  };
  const os = orders as OrderRow[];

  return (
    <div>
      <SectionHeader title="Orders" />
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Type</p>
          <div className="flex flex-wrap gap-1">
            {["all", "direct", "third_party", "whatsapp", "phone", "walk_in"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  typeFilter === t ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
      <AdminTable
        headers={["Order #", "Customer", "Phone", "Type", "Total", "Status", "Delivery", "Date", "Action"]}
        rows={os.map((o) => [
          <span key="num" className="font-mono text-xs text-primary">{o.order_number}</span>,
          o.customer_name,
          o.customer_phone,
          <span key="type" className="text-xs capitalize">{o.order_type.replace(/_/g, " ")}</span>,
          formatINR(o.total_amount),
          <span key="status" className="text-xs capitalize">{o.order_status}</span>,
          <span key="deliv" className="text-xs capitalize">{o.delivery_status.replace(/_/g, " ")}</span>,
          formatDate(o.created_at),
          <Button key="btn" size="sm" variant="ghost" onClick={() => setSelected(o)}>
            <Pencil className="size-4" />
          </Button>,
        ])}
      />
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order</DialogTitle>
          </DialogHeader>
          {selected && (
            <OrderUpdateForm
              token={token}
              order={selected as OrderRow}
              onDone={() => {
                setSelected(null);
                listFn({ data: { token, order_type: typeFilter, order_status: statusFilter } })
                  .then((d) => setOrders((d ?? []) as unknown[]));
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderUpdateForm({
  token,
  order,
  onDone,
}: {
  token: string;
  order: { id: string; order_number: string; order_status: string; delivery_status: string };
  onDone: () => void;
}) {
  const [os, setOs] = useState(order.order_status);
  const [ds, setDs] = useState(order.delivery_status);
  const updateStatusFn = useServerFn(adminUpdateOrderStatus);
  const updateDeliveryFn = useServerFn(adminUpdateDeliveryStatus);

  async function save() {
    try {
      await updateStatusFn({ data: { token, id: order.id, order_status: os } });
      await updateDeliveryFn({ data: { token, id: order.id, delivery_status: ds } });
      toast.success("Order updated.");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Order: <strong className="text-primary">{order.order_number}</strong>
      </p>
      <div className="space-y-2">
        <Label>Order Status</Label>
        <Select value={os} onValueChange={setOs}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Delivery Status</Label>
        <Select value={ds} onValueChange={setDs}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {DELIVERY_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>Cancel</Button>
        <Button onClick={save}>Update</Button>
      </div>
    </div>
  );
}

const REPAIR_STATUSES = ["new", "contacted", "device_received", "diagnosis", "in_progress", "ready", "delivered", "cancelled"];

export function RepairTab({ token }: { token: string }) {
  const [repairs, setRepairs] = useState<unknown[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [notes, setNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const listFn = useServerFn(adminListRepairEnquiries);
  const updateFn = useServerFn(adminUpdateRepairStatus);

  useEffect(() => {
    listFn({ data: { token, status: statusFilter } })
      .then((d) => setRepairs((d ?? []) as unknown[]))
      .catch(() => {});
  }, [token, statusFilter]);

  async function update() {
    if (!selected) return;
    try {
      await updateFn({ data: { token, id: (selected as { id: string }).id, status: newStatus, admin_notes: notes } });
      toast.success("Status updated.");
      listFn({ data: { token, status: statusFilter } }).then((d) => setRepairs((d ?? []) as unknown[]));
      setSelected(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  }

  type RepairRow = {
    id: string;
    enquiry_number: string;
    customer_name: string;
    phone: string;
    phone_brand: string;
    phone_model: string;
    problem_type: string;
    status: string;
    created_at: string;
  };
  const rs = repairs as RepairRow[];

  return (
    <div>
      <SectionHeader title="Repair Enquiries" />
      <div className="mb-4 flex flex-wrap gap-2">
        {["all", ...REPAIR_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {s === "all" ? "All" : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      <AdminTable
        headers={["Enquiry #", "Customer", "Phone", "Device", "Problem", "Status", "Date", "Action"]}
        rows={rs.map((r) => [
          <span key="num" className="font-mono text-xs text-primary">{r.enquiry_number}</span>,
          r.customer_name,
          r.phone,
          `${r.phone_brand} ${r.phone_model}`,
          r.problem_type,
          <span key="status" className="text-xs capitalize">{r.status.replace(/_/g, " ")}</span>,
          formatDate(r.created_at),
          <Button key="btn" size="sm" variant="ghost" onClick={() => { setSelected(r); setNewStatus(r.status); setNotes(""); }}>
            <Pencil className="size-4" />
          </Button>,
        ])}
      />
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Repair Status</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enquiry: <strong className="text-primary">{(selected as { enquiry_number: string }).enquiry_number}</strong>
              </p>
              <div className="space-y-2">
                <Label>New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REPAIR_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Admin Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button>
                <Button onClick={update}>Update</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CustomersTab({ token }: { token: string }) {
  const [customers, setCustomers] = useState<unknown[]>([]);
  const listFn = useServerFn(adminListCustomers);
  useEffect(() => {
    listFn({ data: { token } }).then((d) => setCustomers((d ?? []) as unknown[])).catch(() => {});
  }, [token]);

  type CustomerRow = { id: string; name: string; phone: string; email: string | null; city: string | null; created_at: string };
  const rows = customers as CustomerRow[];

  return (
    <div>
      <SectionHeader title="Customers" />
      <AdminTable
        headers={["Name", "Phone", "Email", "City", "Joined"]}
        rows={rows.map((c) => [c.name, c.phone, c.email ?? "—", c.city ?? "—", formatDate(c.created_at)])}
      />
    </div>
  );
}

export function EnquiriesTab({ token }: { token: string }) {
  const listFn = useServerFn(adminListEnquiries);
  const setStatusFn = useServerFn(adminSetEnquiryStatus);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);

  useEffect(() => {
    listFn({ data: { token } }).then((d) => setEnquiries((d ?? []) as Enquiry[])).catch(() => {});
  }, [token]);

  const refresh = () => listFn({ data: { token } }).then((d) => setEnquiries((d ?? []) as Enquiry[]));

  return (
    <div>
      <SectionHeader title="Product Enquiries (Legacy)" />
      <AdminTable
        headers={["Customer", "Phone", "Product", "Status", "Date", "Action"]}
        rows={enquiries.map((e) => [
          e.customer_name,
          e.phone,
          e.product_name ?? "—",
          <span key="status" className="text-xs capitalize">{e.status}</span>,
          formatDate(e.created_at),
          <Select
            key="sel"
            value={e.status}
            onValueChange={async (v) => {
              await setStatusFn({ data: { token, id: e.id, status: v as "new" | "contacted" | "closed" } });
              refresh();
            }}
          >
            <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>,
        ])}
      />
    </div>
  );
}
