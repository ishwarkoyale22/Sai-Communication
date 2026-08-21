import React, { useState } from "react";
import {
  LayoutDashboard, ShoppingBag, Wrench, Users, Eye,
  Package, Tag, RefreshCw, Gift,
  Building2, BarChart3, ArrowLeftRight, Truck, Handshake,
  Megaphone, AlertTriangle, Image, Banknote, Settings,
  LogOut, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

import { DashboardTab, OrdersTab, RepairTab, CustomersTab, EnquiriesTab } from "./OperationsTabs";
import { ProductsTab, BrandsTab, RefurbishedTab, HampersTab } from "./CatalogueTabs";
import { BranchesTab, InventoryTab, TransfersTab, SuppliersTab, SourcesTab, ThirdPartyTab } from "./InternalTabs";
import { OffersTab, PopupTab, GalleryTab, FinanceTab, DirectPartnersTab, SettingsTab } from "./MarketingFinanceTabs";

const NAV_SECTIONS = [
  {
    label: "Operations",
    items: [
      { tab: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { tab: "orders", icon: ShoppingBag, label: "Orders" },
      { tab: "repair", icon: Wrench, label: "Repair Enquiries" },
      { tab: "customers", icon: Users, label: "Customers" },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { tab: "products", icon: Package, label: "Products" },
      { tab: "brands", icon: Tag, label: "Brands" },
      { tab: "refurbished", icon: RefreshCw, label: "Refurbished" },
      { tab: "hampers", icon: Gift, label: "Gift Hampers" },
    ],
  },
  {
    label: "Internal 🔒",
    items: [
      { tab: "branches", icon: Building2, label: "Branches" },
      { tab: "inventory", icon: BarChart3, label: "Inventory" },
      { tab: "transfers", icon: ArrowLeftRight, label: "Transfers" },
      { tab: "suppliers", icon: Truck, label: "Suppliers" },
      { tab: "sources", icon: Package, label: "Product Sources" },
      { tab: "thirdparty", icon: Handshake, label: "3rd Party" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { tab: "offers", icon: Megaphone, label: "Offers" },
      { tab: "popup", icon: AlertTriangle, label: "Popup" },
      { tab: "gallery", icon: Image, label: "Gallery" },
    ],
  },
  {
    label: "Finance & Partners",
    items: [
      { tab: "finance", icon: Banknote, label: "Finance Partners" },
      { tab: "directpartners", icon: Handshake, label: "Direct Partners" },
    ],
  },
  {
    label: "Config",
    items: [
      { tab: "enquiries", icon: Eye, label: "Enquiries (Legacy)" },
      { tab: "settings", icon: Settings, label: "Settings" },
    ],
  },
];

export function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn("flex flex-col border-r border-border bg-card transition-all duration-300", sidebarOpen ? "w-56" : "w-14")}>
        <div className="flex h-14 items-center justify-between px-3 border-b border-border">
          {sidebarOpen && <span className="font-serif text-sm font-bold text-primary truncate">Sai Admin</span>}
          <button onClick={() => setSidebarOpen((v) => !v)} className="p-1 text-muted-foreground hover:text-foreground">
            <ChevronRight className={cn("size-4 transition-transform", sidebarOpen ? "rotate-180" : "")} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-2">
              {sidebarOpen && (
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{section.label}</p>
              )}
              {section.items.map((item) => (
                <button
                  key={item.tab}
                  onClick={() => setTab(item.tab)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors",
                    tab === item.tab ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-2">
          <button onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50">
            <LogOut className="size-4 shrink-0" />
            {sidebarOpen && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {tab === "dashboard" && <DashboardTab token={token} />}
          {tab === "orders" && <OrdersTab token={token} />}
          {tab === "repair" && <RepairTab token={token} />}
          {tab === "customers" && <CustomersTab token={token} />}
          {tab === "products" && <ProductsTab token={token} />}
          {tab === "brands" && <BrandsTab token={token} />}
          {tab === "refurbished" && <RefurbishedTab token={token} />}
          {tab === "hampers" && <HampersTab token={token} />}
          {tab === "branches" && <BranchesTab token={token} />}
          {tab === "inventory" && <InventoryTab token={token} />}
          {tab === "transfers" && <TransfersTab token={token} />}
          {tab === "suppliers" && <SuppliersTab token={token} />}
          {tab === "sources" && <SourcesTab token={token} />}
          {tab === "thirdparty" && <ThirdPartyTab token={token} />}
          {tab === "offers" && <OffersTab token={token} />}
          {tab === "popup" && <PopupTab token={token} />}
          {tab === "gallery" && <GalleryTab token={token} />}
          {tab === "finance" && <FinanceTab token={token} />}
          {tab === "directpartners" && <DirectPartnersTab token={token} />}
          {tab === "enquiries" && <EnquiriesTab token={token} />}
          {tab === "settings" && <SettingsTab token={token} />}
        </div>
      </main>
    </div>
  );
}
