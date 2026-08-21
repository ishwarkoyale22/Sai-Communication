import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  normalizeProduct,
  normalizeRefurbished,
  type Product,
  type SettingsMap,
  type Brand,
  type Offer,
  type PromoPopup,
  type GalleryItem,
  type RefurbishedProduct,
  type GiftHamperProduct,
  type FinancePartner,
} from "./types";

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => normalizeProduct(row as Record<string, unknown>));
  },
});

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async (): Promise<SettingsMap> => {
    const { data, error } = await supabase.from("settings").select("key,value");
    if (error) throw new Error(error.message);
    const map: SettingsMap = { ...DEFAULT_SETTINGS };
    for (const row of data ?? []) {
      if (row.key) {
        map[row.key as string] = (row.value as string) ?? "";
      }
    }

    // Bidirectional aliases for seamless dynamic data & backward compatibility
    if (map["vijay_sir_photo_url"] && !map["hero_photo_url"]) map["hero_photo_url"] = map["vijay_sir_photo_url"];
    if (map["hero_photo_url"] && !map["vijay_sir_photo_url"]) map["vijay_sir_photo_url"] = map["hero_photo_url"];

    if (map["vijay_sir_video_url"] && !map["owner_video_url"]) map["owner_video_url"] = map["vijay_sir_video_url"];
    if (map["owner_video_url"] && !map["vijay_sir_video_url"]) map["vijay_sir_video_url"] = map["owner_video_url"];

    if (map["store_phone"] && !map["phone"]) map["phone"] = map["store_phone"];
    if (map["phone"] && !map["store_phone"]) map["store_phone"] = map["phone"];

    if (map["store_whatsapp"] && !map["whatsapp"]) map["whatsapp"] = map["store_whatsapp"];
    if (map["whatsapp"] && !map["store_whatsapp"]) map["store_whatsapp"] = map["whatsapp"];

    if (map["store_email"] && !map["email"]) map["email"] = map["store_email"];
    if (map["email"] && !map["store_email"]) map["store_email"] = map["email"];

    if (map["store_address"] && !map["address"]) map["address"] = map["store_address"];
    if (map["address"] && !map["store_address"]) map["store_address"] = map["address"];

    if (map["store_hours"] && !map["hours"]) map["hours"] = map["store_hours"];
    if (map["hours"] && !map["store_hours"]) map["store_hours"] = map["hours"];

    if (map["google_maps_embed_url"] && !map["maps_embed"]) map["maps_embed"] = map["google_maps_embed_url"];
    if (map["maps_embed"] && !map["google_maps_embed_url"]) map["google_maps_embed_url"] = map["maps_embed"];

    if (map["instagram_url"] && !map["instagram"]) map["instagram"] = map["instagram_url"];
    if (map["instagram"] && !map["instagram_url"]) map["instagram_url"] = map["instagram"];

    if (map["facebook_url"] && !map["facebook"]) map["facebook"] = map["facebook_url"];
    if (map["facebook"] && !map["facebook_url"]) map["facebook_url"] = map["facebook"];

    if (map["youtube_url"] && !map["youtube"]) map["youtube"] = map["youtube_url"];
    if (map["youtube"] && !map["youtube_url"]) map["youtube_url"] = map["youtube"];

    return map;
  },
});

export const brandsQuery = queryOptions({
  queryKey: ["brands"],
  queryFn: async (): Promise<Brand[]> => {
    const { data, error } = await supabase
      .from("brands")
      .select("id, name, logo_url, display_order, is_active, created_at")
      .eq("is_active", true)
      .order("display_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as Brand[];
  },
});

export const offersQuery = queryOptions({
  queryKey: ["offers"],
  queryFn: async (): Promise<Offer[]> => {
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as Offer[];
  },
});

export const activePopupQuery = queryOptions({
  queryKey: ["active-popup"],
  queryFn: async (): Promise<PromoPopup | null> => {
    const { data, error } = await supabase
      .from("promotional_popups")
      .select("*")
      .eq("is_enabled", true)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as PromoPopup | null;
  },
});

export const galleryQuery = (category?: string) =>
  queryOptions({
    queryKey: ["gallery", category ?? "all"],
    queryFn: async (): Promise<GalleryItem[]> => {
      let q = supabase
        .from("gallery_items")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (category && category !== "all") q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as GalleryItem[];
    },
  });

export const refurbishedQuery = queryOptions({
  queryKey: ["refurbished"],
  queryFn: async (): Promise<RefurbishedProduct[]> => {
    const { data, error } = await supabase
      .from("refurbished_products")
      .select("*")
      .eq("is_available", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => normalizeRefurbished(row as Record<string, unknown>));
  },
});

export const financePartnersQuery = queryOptions({
  queryKey: ["finance-partners"],
  queryFn: async (): Promise<FinancePartner[]> => {
    const { data, error } = await supabase
      .from("finance_partners")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as FinancePartner[];
  },
});

export const hamperProductsQuery = queryOptions({
  queryKey: ["hamper-products"],
  queryFn: async (): Promise<GiftHamperProduct[]> => {
    const { data, error } = await supabase
      .from("gift_hamper_products")
      .select("*")
      .eq("is_available", true)
      .order("display_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as GiftHamperProduct[];
  },
});

export const DEFAULT_SETTINGS: SettingsMap = {
  shop_name: "Sai Communication",
  tagline: "Mobile Phone Dealer & Repair Service — Since 2005",
  address: "Shop No. 30, P.L. Khandge Plaza, Near Saraswat Bank, Chakan-Talegaon Road, Talegaon Dabhade, Pune, Maharashtra - 410507",
  store_address: "Shop No. 30, P.L. Khandge Plaza, Near Saraswat Bank, Chakan-Talegaon Road, Talegaon Dabhade, Pune, Maharashtra - 410507",
  phone: "09845458942",
  store_phone: "09845458942",
  phone_alt: "7507575755",
  whatsapp: "917507575755",
  store_whatsapp: "917507575755",
  email: "contact@saicommunication.com",
  store_email: "contact@saicommunication.com",
  hours: "Open all days: 10:00 AM - 10:00 PM",
  store_hours: "Open all days: 10:00 AM - 10:00 PM",
  established: "2005",
  years_in_business: "21",
  rating: "4.7",
  total_ratings: "119",
  verification: "Justdial Verified",
  city: "Pune",
  state: "Maharashtra",
  pin_code: "410507",
  maps_embed: "https://www.google.com/maps?q=P.L.%20Khandge%20Plaza%2C%20Chakan-Talegaon%20Road%2C%20Talegaon%20Dabhade%2C%20Pune%2C%20Maharashtra%20410507&output=embed",
  google_maps_embed_url: "https://www.google.com/maps?q=P.L.%20Khandge%20Plaza%2C%20Chakan-Talegaon%20Road%2C%20Talegaon%20Dabhade%2C%20Pune%2C%20Maharashtra%20410507&output=embed",
  facebook: "",
  facebook_url: "",
  instagram: "",
  instagram_url: "",
  youtube: "",
  youtube_url: "",
  twitter: "",
  twitter_url: "",
  logo_url: "/logo.jpg",
  hero_photo_url: "",
  vijay_sir_photo_url: "",
  owner_name: "Vijay Sir",
  owner_intro: "\"When we opened Sai Communication in 2005, technology was simpler, but the need for trust was just as vital. Today, our role is more important than ever: we test, verify, and guide you so your hard-earned money gets you the device that best fits your life.\"",
  owner_history: "Founded in 2005, Sai Communication began with a simple promise: give every customer honest advice, 100% genuine products, and after-sale support you can count on. Over the last 21+ years, we have grown to become one of Pune & Talegaon's premier mobile destinations.",
  owner_video_url: "",
  vijay_sir_video_url: "",
  owner_timeline: "[]",
  product_whatsapp_message: "Hello, I am interested in",
  repair_whatsapp_message: "Hello, I would like to enquire about a mobile repair.",
};
