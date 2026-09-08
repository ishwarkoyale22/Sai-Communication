import { Check, X, Package, ClipboardCheck, PackageCheck, Truck, Home } from "lucide-react";
import { cn } from "@/lib/utils";

// Real order_status values used across the app (see src/lib/types.ts
// OrderStatus and admin/order-track): pending, confirmed, preparing,
// ready, collected, delivered, cancelled. Sai Communication fulfils
// orders via in-store collection or local delivery, not carrier
// shipping, so "Shipped" reads as "Ready" (ready for collection/out for
// delivery) rather than a separate shipping-carrier step.
const STEPS = [
  { key: "pending", label: "Order Placed", icon: ClipboardCheck },
  { key: "confirmed", label: "Confirmed", icon: Check },
  { key: "preparing", label: "Packed", icon: Package },
  { key: "ready", label: "Out for Delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
] as const;

const STEP_INDEX: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  collected: 4,
  delivered: 4,
};

export function OrderTimeline({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive-foreground/20 bg-destructive-foreground/5 p-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
          <X className="size-4" />
        </span>
        <div>
          <p className="text-sm font-bold text-destructive-foreground">Order Cancelled</p>
          <p className="text-xs text-muted-foreground">This order was cancelled and will not be fulfilled.</p>
        </div>
      </div>
    );
  }

  const currentIndex = STEP_INDEX[status] ?? 0;
  const isCollectedLabel = status === "collected";

  return (
    <div className="flex items-start justify-between gap-1">
      {STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const isCurrent = i === currentIndex;
        const label = step.key === "delivered" && isCollectedLabel ? "Collected" : step.label;
        const Icon = step.key === "ready" && isCollectedLabel ? PackageCheck : step.icon;
        return (
          <div key={step.key} className="flex flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <div
                className={cn(
                  "h-0.5 flex-1 transition-colors",
                  i === 0 ? "opacity-0" : done ? "bg-primary" : "bg-border"
                )}
              />
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                  isCurrent && "ring-4 ring-primary/20"
                )}
              >
                <Icon className="size-4" />
              </span>
              <div
                className={cn(
                  "h-0.5 flex-1 transition-colors",
                  i === STEPS.length - 1 ? "opacity-0" : done && i < currentIndex ? "bg-primary" : "bg-border"
                )}
              />
            </div>
            <span
              className={cn(
                "mt-2 max-w-[70px] text-[10.5px] font-semibold leading-tight sm:max-w-none sm:text-xs",
                isCurrent ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
