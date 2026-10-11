import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/data-rights-request")({
  head: () => ({
    meta: [
      { title: "Data Rights Request — Sai Communication" },
      {
        name: "description",
        content:
          "Request access to, correction of, or erasure of your personal data held by Sai Communication, or withdraw your consent, under the Digital Personal Data Protection Act, 2023.",
      },
    ],
  }),
  component: DataRightsRequestPage,
});

const REQUEST_TYPES = [
  { value: "access", label: "Access — send me a copy of my data" },
  { value: "correction", label: "Correction — fix inaccurate/incomplete data" },
  { value: "erasure", label: "Erasure — delete my data" },
  { value: "withdraw_consent", label: "Withdraw a consent I previously gave" },
  { value: "nominate", label: "Register a nominee for my account" },
  { value: "grievance", label: "Grievance — report a concern about how my data is handled" },
] as const;

const requestSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your name").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  email: z.string().trim().email("Enter a valid email").max(255).optional().or(z.literal("")),
  request_type: z.enum([
    "access",
    "correction",
    "erasure",
    "withdraw_consent",
    "nominate",
    "grievance",
  ]),
  details: z.string().trim().max(2000).optional(),
});

function DataRightsRequestPage() {
  const settings = useSettings();
  const [values, setValues] = useState({
    full_name: "",
    phone: "",
    email: "",
    request_type: "" as string,
    details: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = requestSchema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    const { error } = await supabase.from("data_rights_requests").insert({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      request_type: parsed.data.request_type,
      details: parsed.data.details || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not submit your request. Please call us instead.");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <ShieldCheck className="mx-auto mb-4 size-10 text-gold" />
        <h1 className="font-serif text-2xl font-medium">Request received</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We've logged your request. Our Grievance Officer will respond within{" "}
          <strong className="text-foreground">30 days</strong>, as required under the Digital Personal
          Data Protection Act, 2023. For an urgent matter, call us directly.
        </p>
        {settings["phone"] && (
          <a href={`tel:${settings["phone"]}`} className="mt-4 inline-block font-medium text-primary hover:underline">
            {settings["phone"]}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <header className="mb-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-gold">
          <ShieldCheck className="size-3.5" />
          Your Data Rights
        </div>
        <TextReveal as="h1" trigger="mount" className="font-serif text-3xl font-medium sm:text-4xl">
          Data Rights Request
        </TextReveal>
        <p className="mt-4 text-sm leading-relaxed text-foreground/80">
          Under the Digital Personal Data Protection Act, 2023, you may ask us to let you access,
          correct or erase your personal data, withdraw a consent you previously gave, or raise a
          grievance about how we handle your data. See our{" "}
          <a href="/privacy-policy" className="font-medium text-primary hover:underline">
            Privacy Policy
          </a>{" "}
          for details.
        </p>
      </header>

      <Reveal>
        <form onSubmit={submit} className="card-surface space-y-4 rounded-2xl p-6">
          <div className="space-y-2">
            <Label htmlFor="dr-name">Full Name *</Label>
            <Input
              id="dr-name"
              value={values.full_name}
              maxLength={100}
              onChange={(e) => setValues({ ...values, full_name: e.target.value })}
              placeholder="Your full name"
            />
            {errors["full_name"] && <p className="text-xs text-destructive">{errors["full_name"]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dr-phone">Mobile Number *</Label>
            <Input
              id="dr-phone"
              inputMode="numeric"
              maxLength={10}
              value={values.phone}
              onChange={(e) => setValues({ ...values, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
              placeholder="10-digit mobile number used with us"
            />
            {errors["phone"] && <p className="text-xs text-destructive">{errors["phone"]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dr-email">Email (optional)</Label>
            <Input
              id="dr-email"
              type="email"
              maxLength={255}
              value={values.email}
              onChange={(e) => setValues({ ...values, email: e.target.value })}
              placeholder="you@example.com"
            />
            {errors["email"] && <p className="text-xs text-destructive">{errors["email"]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dr-type">What would you like to do? *</Label>
            <Select value={values.request_type} onValueChange={(v) => setValues({ ...values, request_type: v })}>
              <SelectTrigger id="dr-type">
                <SelectValue placeholder="Select a request type" />
              </SelectTrigger>
              <SelectContent>
                {REQUEST_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors["request_type"] && <p className="text-xs text-destructive">{errors["request_type"]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dr-details">Details (optional)</Label>
            <Textarea
              id="dr-details"
              rows={4}
              maxLength={2000}
              value={values.details}
              onChange={(e) => setValues({ ...values, details: e.target.value })}
              placeholder="Tell us more about your request, e.g. which order or account this concerns."
            />
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Submitting..." : "Submit Request"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            We verify your identity using the phone/email on file before acting on a request.
          </p>
        </form>
      </Reveal>
    </div>
  );
}
