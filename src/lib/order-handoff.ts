// Hands the customer's phone number from checkout to the order-success / order-track pages
// WITHOUT putting it in the URL (URLs end up in browser history, analytics and referrers, and the
// router serialises numeric-looking strings as JSON, e.g. phone=%229000000001%22).
// sessionStorage lives only in this tab and is cleared when the tab closes. Every access is
// wrapped: storage can be unavailable (private mode, blocked site data) and the pages must still
// work — they simply ask the customer to type the number.

const KEY = "sai:last-order";

export function rememberOrderPhone(orderNumber: string, phone: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ orderNumber, phone }));
  } catch {
    /* storage unavailable: fall back to manual entry */
  }
}

// Returns the remembered phone only for the order it was saved for.
export function recallOrderPhone(orderNumber: string): string {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { orderNumber?: unknown; phone?: unknown };
    if (parsed.orderNumber === orderNumber && typeof parsed.phone === "string") return parsed.phone;
  } catch {
    /* ignore */
  }
  return "";
}
