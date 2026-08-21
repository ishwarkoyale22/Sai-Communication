import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItemType[]>([]);

  const addProduct = useCallback((product: Product, qty = 1, variant: Record<string, string> = {}) => {
    const key = `product-${product.id}-${JSON.stringify(variant)}`;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === key);
      if (existing) return prev.map((i) => i.id === key ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, {
        id: key,
        product,
        item_type: "product",
        name: `${product.brand} ${product.name}`,
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
        name: `${product.brand} ${product.model} (Refurbished)`,
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
