import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { CartItemType, Product, RefurbishedProduct, GiftHamperProduct } from "@/lib/types";

interface CartContextType {
  items: CartItemType[];
  addProduct: (product: Product, qty?: number, variant?: Record<string, string>) => void;
  addRefurbished: (product: RefurbishedProduct, qty?: number) => void;
  addHamperProduct: (product: GiftHamperProduct, qty?: number) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

// Cart items only ever hold product/quantity/display info (see CartItemType)
// — no customer or payment details — so it's safe to persist as-is.
const CART_STORAGE_KEY = "sc_cart_v1";

function isCartItem(v: unknown): v is CartItemType {
  if (!v || typeof v !== "object") return false;
  const item = v as Record<string, unknown>;
  return (
    typeof item["id"] === "string" &&
    typeof item["name"] === "string" &&
    typeof item["price"] === "number" &&
    typeof item["quantity"] === "number" &&
    typeof item["item_type"] === "string"
  );
}

function loadStoredCart(): CartItemType[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : [];
  } catch {
    // Corrupted JSON, storage blocked (private mode), or unavailable —
    // fall back to an empty cart rather than throwing.
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Always starts empty on both server and the client's first render, so
  // there is nothing for hydration to mismatch on. The persisted cart (if
  // any) is restored client-side after mount, below — a normal post-mount
  // state update, not a hydration diff.
  const [items, setItems] = useState<CartItemType[]>([]);
  const hydratedRef = useRef(false);

  useEffect(() => {
    setItems(loadStoredCart());
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    // Skip the very first run (before the restore effect above has fired)
    // so we never clobber a saved cart with the initial empty array.
    if (!hydratedRef.current) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full or blocked — cart still works for this session, it
      // just won't survive a refresh.
    }
  }, [items]);

  const addProduct = useCallback((product: Product, qty = 1, variant: Record<string, string> = {}) => {
    const key = `product-${product.id}-${JSON.stringify(variant)}`;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === key);
      if (existing) return prev.map((i) => i.id === key ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, {
        id: key,
        product,
        item_type: "product",
        name: [product.brand, product.name].filter(Boolean).join(" "),
        brand: product.brand,
        price: product.price,
        quantity: qty,
        variant_info: variant,
        image: product.images[0] ?? "",
      }];
    });
  }, []);

  const addRefurbished = useCallback((product: RefurbishedProduct, qty = 1) => {
    const key = `refurbished-${product.id}`;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === key);
      if (existing) return prev.map((i) => i.id === key ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, {
        id: key,
        refurbished: product,
        item_type: "refurbished",
        name: `${[product.brand, product.model].filter(Boolean).join(" ")} (Refurbished)`,
        brand: product.brand,
        price: product.price,
        quantity: qty,
        variant_info: {},
        image: product.images[0] ?? "",
      }];
    });
  }, []);

  const addHamperProduct = useCallback((product: GiftHamperProduct, qty = 1) => {
    const key = `hamper-${product.id}`;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === key);
      if (existing) return prev.map((i) => i.id === key ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, {
        id: key,
        hamperProduct: product,
        item_type: "hamper_product",
        name: product.name,
        brand: "",
        price: product.price,
        quantity: qty,
        variant_info: {},
        image: product.image_url ?? "",
      }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) { setItems((prev) => prev.filter((i) => i.id !== id)); return; }
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: qty } : i));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addProduct, addRefurbished, addHamperProduct, removeItem, updateQty, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
