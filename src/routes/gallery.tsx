import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { X, Play } from "lucide-react";
import { galleryQuery } from "@/lib/queries";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/lib/types";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — Store Photos & Videos | Sai Communication" },
      { name: "description", content: "Browse photos and videos from Sai Communication — our store, team, products and events in Talegaon Dabhade, Pune." },
      { property: "og:title", content: "Gallery | Sai Communication" },
    ],
  }),
  component: GalleryPage,
});

const CATS = [
  { value: "all", label: "All" },
  { value: "store", label: "Store" },
  { value: "team", label: "Team" },
  { value: "products", label: "Products" },
  { value: "events", label: "Events" },
  { value: "promotions", label: "Promotions" },
];

// Real in-store footage, served from /public/videos.
const SHOP_VIDEOS: GalleryItem[] = [
  {
    id: "shop-tour-1",
    type: "video",
    category: "store",
    title: "A Walk Through Our Store",
    url: "/videos/shop-tour-1.mp4",
    thumbnail_url: null,
    display_order: 1,
    is_active: true,
    created_at: "",
  },
  {
    id: "shop-tour-2",
    type: "video",
    category: "store",
    title: "Inside Sai Communication",
    url: "/videos/shop-tour-2.mp4",
    thumbnail_url: null,
    display_order: 2,
    is_active: true,
    created_at: "",
  },
  {
    id: "shop-tour-3",
    type: "video",
    category: "store",
    title: "Our Store Counter",
    url: "/videos/shop-tour-3.mp4",
    thumbnail_url: null,
    display_order: 3,
    is_active: true,
    created_at: "",
  },
];

function GalleryPage() {
  const [cat, setCat] = useState("all");
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const { data: dbItems = [], isLoading } = useQuery(galleryQuery(cat === "all" ? undefined : cat));
  const localItems = cat === "all" || cat === "store" ? SHOP_VIDEOS : [];
  const items = [...localItems, ...dbItems];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="max-w-2xl">
        <TextReveal as="h1" trigger="mount" className="font-serif text-3xl font-medium sm:text-4xl">Gallery</TextReveal>
        <p className="mt-3 text-muted-foreground">A glimpse into our store, team and the moments that matter.</p>
      </header>

      <div className="mt-8 flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button key={c.value} onClick={() => setCat(c.value)}
            className={cn("border px-4 py-2 text-sm font-medium transition-colors",
              cat === c.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-gold hover:text-gold")}>
            {c.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="mt-16 text-center text-muted-foreground">Loading gallery...</p>
      ) : items.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-4xl">📷</p>
          <p className="mt-4 text-muted-foreground">Gallery coming soon. Check back later.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, i) => (
            <Reveal key={item.id} delay={i * 40}>
              <button onClick={() => setLightbox(item)} className="group relative block aspect-square w-full overflow-hidden border border-border bg-secondary/50 hover:border-gold transition-colors">
                {item.type === "video" || item.type === "reel" ? (
                  <div className="size-full flex items-center justify-center">
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt={item.title ?? "Video"} className="size-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-4xl">🎬</span>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="size-12 rounded-full bg-black/60 flex items-center justify-center">
                        <Play className="size-5 text-white fill-white" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img src={item.url} alt={item.title ?? "Gallery"} className="size-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                )}
                {item.title && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">{item.title}</p>
                  </div>
                )}
              </button>
            </Reveal>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(null)}>
            <X className="size-8" />
          </button>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            {lightbox.type === "video" || lightbox.type === "reel" ? (
              <video src={lightbox.url} controls autoPlay className="w-full rounded-xl max-h-[80vh]" />
            ) : (
              <img src={lightbox.url} alt={lightbox.title ?? "Gallery"} className="w-full rounded-xl max-h-[80vh] object-contain" />
            )}
            {lightbox.title && <p className="mt-3 text-center text-white text-sm">{lightbox.title}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
