import { MessageCircle } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

export function WhatsAppButton() {
  const settings = useSettings();
  const number = (settings["whatsapp"] || "").replace(/\D/g, "");

  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full border border-primary/50 bg-accent text-primary transition-all duration-300 hover:bg-primary hover:text-primary-foreground"
    >
      <MessageCircle className="size-7" />
    </a>
  );
}
