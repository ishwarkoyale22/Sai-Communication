import { createFileRoute } from "@tanstack/react-router";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import { EnquiryForm } from "@/components/EnquiryDialog";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { useSettings } from "@/hooks/useSettings";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Store Location | Sai Communication Mobile Shop" },
      {
        name: "description",
        content:
          "Call, WhatsApp or visit Sai Communication. Find our address, business hours and send us a message — we reply the same day.",
      },
      { property: "og:title", content: "Contact Sai Communication" },
      {
        property: "og:description",
        content: "Store address, hours, phone and WhatsApp for quick answers.",
      },
    ],
  }),
  component: ContactPage,
});

const HOURS = [
  { day: "Monday", time: "10:00 AM - 10:00 PM" },
  { day: "Tuesday", time: "10:00 AM - 10:00 PM" },
  { day: "Wednesday", time: "10:00 AM - 10:00 PM" },
  { day: "Thursday", time: "10:00 AM - 10:00 PM" },
  { day: "Friday", time: "10:00 AM - 10:00 PM" },
  { day: "Saturday", time: "10:00 AM - 10:00 PM" },
  { day: "Sunday", time: "10:00 AM - 10:00 PM" },
];


function ContactPage() {
  const settings = useSettings();
  const whatsapp = (settings["whatsapp"] || "").replace(/\D/g, "");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Contact Us</h1>
        <p className="mt-3 text-muted-foreground">
          Questions about a phone, a repair or EMI? Send a message and we'll call you back.
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Reveal>
          <div className="card-surface rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Send us a message</h2>
            <div className="mt-4">
              <EnquiryForm />
            </div>
          </div>
        </Reveal>

        <div className="space-y-6">
          <Reveal delay={80}>
            <div className="card-surface rounded-2xl p-6">
              <h2 className="text-lg font-semibold">Store Details</h2>
              <p className="mt-4 flex gap-2 text-sm text-foreground/85">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                {settings["address"]}
              </p>
              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="text-right font-medium">
                    <a href={`tel:${settings["phone"]}`} className="hover:text-primary">
                      {settings["phone"]}
                    </a>
                    {settings["phone_alt"] ? (
                      <>
                        {" / "}
                        <a href={`tel:${settings["phone_alt"]}`} className="hover:text-primary">
                          {settings["phone_alt"]}
                        </a>
                      </>
                    ) : null}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Established</dt>
                  <dd className="font-medium">{settings["established"]}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Rating</dt>
                  <dd className="font-medium">
                    {settings["rating"]} / 5 ({settings["total_ratings"]}+ ratings)
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Verification</dt>
                  <dd className="font-medium">{settings["verification"]}</dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild>
                  <a href={`tel:${settings["phone"]}`}>
                    <Phone className="size-4" /> Call Now
                  </a>
                </Button>
                <Button asChild variant="secondary">
                  <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="size-4" /> WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className="card-surface rounded-2xl p-6">

              <h2 className="text-lg font-semibold">Business Hours</h2>
              <table className="mt-4 w-full text-sm">
                <tbody>
                  {HOURS.map((row) => (
                    <tr key={row.day} className="border-b border-border last:border-0">
                      <td className="py-2 text-muted-foreground">{row.day}</td>
                      <td className="py-2 text-right font-medium">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="h-64 overflow-hidden rounded-2xl border border-border">
              <iframe
                title="Store location map"
                src={settings["maps_embed"]}
                loading="lazy"
                className="size-full"
                style={{ border: 0 }}
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
