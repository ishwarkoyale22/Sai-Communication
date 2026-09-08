import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/repair-track")({
  validateSearch: (search: Record<string, unknown>) => ({
    phone: String(search["phone"] ?? ""),
  }),
  head: () => ({
    meta: [
      { title: "Track Repair Status | Sai Communication" },
      { name: "description", content: "Track the status of your mobile repair enquiry at Sai Communication by mobile number." },
    ],
  }),
  component: RepairTrackPage,
});

type RepairRow = {
  id: string;
  phone_brand: string;
  phone_model: string;
  problem_type: string;
  status: string | null;
  created_at: string | null;
};

// Admin-side status values, mapped to the customer-facing wording from the
// service workflow (Called Up → Pending → Submitted Product → In Process →
// Repaired/Completed). Unknown values fall back to a title-cased raw status.
const STATUS_LABELS: Record<string, string> = {
  new: "Called Up",
  contacted: "Called Up",
  pending: "Pending",
  device_received: "Submitted Product",
  diagnosis: "In Process",
  in_progress: "In Process",
  ready: "Repaired / Ready for Collection",
  delivered: "Repaired / Completed",
  cancelled: "Cancelled",
};

function statusLabel(status: string | null) {
  if (!status) return "Called Up";
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusClasses(status: string | null) {
  if (status === "delivered") return "border-green-400/40 text-green-400 bg-green-400/10";
  if (status === "cancelled") return "border-red-400/40 text-red-400 bg-red-400/10";
  return "border-primary/40 text-primary bg-primary/10";
}

function RepairTrackPage() {
  const { phone: initPhone } = Route.useSearch();
  const [phone, setPhone] = useState(initPhone);
  const [results, setResults] = useState<RepairRow[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!phone) { setError("Please enter your mobile number."); return; }
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const { data, error: qError } = await supabase
        .from("repair_enquiries")
        .select("id, phone_brand, phone_model, problem_type, status, created_at")
        .eq("phone", phone)
        .order("created_at", { ascending: false });
      if (qError) throw new Error(qError.message);
      if (!data || data.length === 0) {
        setError("No repair enquiries found for this mobile number.");
        setResults([]);
      } else {
        setResults(data as RepairRow[]);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="text-center">
        <Wrench className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Track Your Repair</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter your mobile number to see the status of your repair enquiries.</p>
      </div>

      <form onSubmit={handleSearch} className="mt-8 card-surface rounded-2xl p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="repair-track-phone">Mobile Number</Label>
          <Input id="repair-track-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your 10-digit mobile number" />
        </div>
        {error && <p className="text-sm text-destructive-foreground">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          <Search className="size-4 mr-2" /> {loading ? "Searching..." : "Track Repair"}
        </Button>
      </form>

      {results && results.length > 0 && (
        <div className="mt-6 space-y-4">
          {results.map((r) => (
            <div key={r.id} className="card-surface rounded-2xl p-6 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground">Device</p>
                  <p className="font-bold text-primary">{r.phone_brand} {r.phone_model}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold border ${statusClasses(r.status)}`}>
                  {statusLabel(r.status)}
                </span>
              </div>
              <div className="text-sm space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Issue</span><span className="capitalize">{r.problem_type.replace(/_/g, " ")}</span></div>
                {r.created_at && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Submitted On</span><span>{new Date(r.created_at).toLocaleDateString("en-IN")}</span></div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
