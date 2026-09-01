import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  LayoutDashboard, ShoppingBag, Wrench, AlertTriangle, Package, Pencil, Eye
} from "lucide-react";
import {
  adminListOrders, adminUpdateOrderStatus,
  adminListRepairEnquiries, adminUpdateRepairStatus,
  adminListEnquiries, adminSetEnquiryStatus,
  adminGetDashboardStats,
} from "@/lib/admin.functions";
import { formatDate, formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminTable, SectionHeader } from "./AdminShared";
import { GenericCrudTab, type FieldConfig } from "./GenericCrudTab";
import { cn } from "@/lib/utils";
import type { Enquiry } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

type DashboardStats = {
  todays_sales: number;
  pending_orders_count: number;
  pending_repairs_count: number;
  low_stock_items: { id: string; name: string; stock: number }[];
  recent_orders: { id: string; order_number: string; customer_name: string; total_amount: number; order_status: string; created_at: string }[];
};

export function DashboardTab({ token }: { token: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  const getStatsFn = useServerFn(adminGetDashboardStats);

  const refresh = () => {
    getStatsFn({ data: { token } })
      .then((d) => setStats(d as DashboardStats))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load dashboard stats."));
  };

  useEffect(refresh, [token]);
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-stats-refresh")
      .on("postgres_changes", { event: "*", schema: "public", table: "website_orders" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "repair_enquiries" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const kpis = [
    { label: "Today's Sales", value: stats ? formatINR(stats.todays_sales) : "—", icon: ShoppingBag },
    { label: "Pending Orders", value: stats?.pending_orders_count ?? "—", icon: Package },
    { label: "Pending Repairs", value: stats?.pending_repairs_count ?? "—", icon: Wrench },
    { label: "Low Stock Items", value: stats?.low_stock_items.length ?? "—", icon: AlertTriangle },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-sm text-muted-foreground mt-1">Overview of your store activity.</p>
      {error && <p className="mt-4 text-sm text-destructive-foreground">{error}</p>}
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

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card-surface rounded-xl p-5">
          <h2 className="font-semibold text-sm">Low Stock Items (&lt; 5)</h2>
          {!stats || stats.low_stock_items.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nothing low on stock.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {stats.low_stock_items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span className="truncate">{item.name}</span>
                  <span className="font-semibold text-destructive-foreground">{item.stock} left</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-surface rounded-xl p-5">
          <h2 className="font-semibold text-sm">Recent Orders</h2>
          {!stats || stats.recent_orders.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {stats.recent_orders.map((o) => (
                <li key={o.id} className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{o.order_number}</p>
                    <p className="text-xs text-muted-foreground truncate">{o.customer_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">{formatINR(o.total_amount)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{o.order_status}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const ORDER_STATUSES = ["pending", "confirmed", "ready", "delivered", "cancelled"];

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
    payment_status: string;
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
            {["all", "product", "hamper", "mixed"].map((t) => (
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
        headers={["Order #", "Customer", "Phone", "Type", "Total", "Status", "Payment", "Date", "Action"]}
        rows={os.map((o) => [
          <span key="num" className="font-mono text-xs text-primary">{o.order_number}</span>,
          o.customer_name,
          o.customer_phone,
          <span key="type" className="text-xs capitalize">{o.order_type}</span>,
          formatINR(o.total_amount),
          <span key="status" className="text-xs capitalize">{o.order_status}</span>,
          <span key="pay" className="text-xs capitalize">{o.payment_status}</span>,
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
  order: { id: string; order_number: string; order_status: string };
  onDone: () => void;
}) {
  const [os, setOs] = useState(order.order_status);
  const updateStatusFn = useServerFn(adminUpdateOrderStatus);

  async function save() {
    try {
      await updateStatusFn({ data: { token, id: order.id, order_status: os } });
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
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>Cancel</Button>
        <Button onClick={save}>Update</Button>
      </div>
    </div>
  );
}

const REPAIR_STATUSES = ["pending", "contacted", "in_repair", "completed", "cancelled"];

export function RepairTab({ token }: { token: string }) {
  const [repairs, setRepairs] = useState<unknown[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
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
      await updateFn({ data: { token, id: (selected as { id: string }).id, status: newStatus } });
      toast.success("Status updated.");
      listFn({ data: { token, status: statusFilter } }).then((d) => setRepairs((d ?? []) as unknown[]));
      setSelected(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  }

  type RepairRow = {
    id: string;
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
        headers={["Customer", "Phone", "Device", "Problem", "Status", "Date", "Action"]}
        rows={rs.map((r) => [
          r.customer_name,
          r.phone,
          `${r.phone_brand} ${r.phone_model}`,
          r.problem_type,
          <span key="status" className="text-xs capitalize">{r.status.replace(/_/g, " ")}</span>,
          formatDate(r.created_at),
          <Button key="btn" size="sm" variant="ghost" onClick={() => { setSelected(r); setNewStatus(r.status); }}>
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
                Customer: <strong className="text-primary">{(selected as { customer_name: string }).customer_name}</strong>
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

const CUSTOMER_FIELDS: FieldConfig[] = [
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address", type: "textarea" },
  { key: "total_purchases", label: "Total Purchases", type: "number" },
];
export function CustomersTab({ token }: { token: string }) {
  return <GenericCrudTab token={token} table="customers" title="Customers" fields={CUSTOMER_FIELDS} orderBy="name" />;
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
      <SectionHeader title="Contact Enquiries" />
      <AdminTable
        headers={["Customer", "Phone", "Subject", "Status", "Date", "Action"]}
        rows={enquiries.map((e) => [
          e.customer_name,
          e.phone,
          e.subject ?? "—",
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
