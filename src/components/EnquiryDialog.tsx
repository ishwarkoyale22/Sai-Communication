import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/lib/types";

export const enquirySchema = z.object({
  customer_name: z.string().trim().min(2, "Please enter your name").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  email: z.string().trim().email("Enter a valid email").max(255).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional(),
});

export function EnquiryForm({
  product,
  onDone,
}: {
  product?: Product | null;
  onDone?: () => void;
}) {
  const [values, setValues] = useState({
    customer_name: "",
    phone: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = enquirySchema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    const { error } = await supabase.from("enquiries").insert({
      customer_name: parsed.data.customer_name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      product_id: product?.id ?? null,
      product_name: product ? `${product.brand} ${product.name}` : null,
      message: parsed.data.message || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not send enquiry. Please try again.");
      return;
    }
    toast.success("Thank you! We'll call you shortly.");
    setValues({ customer_name: "", phone: "", email: "", message: "" });
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="enq-name">Your Name *</Label>
        <Input
          id="enq-name"
          value={values.customer_name}
          maxLength={100}
          onChange={(e) => setValues({ ...values, customer_name: e.target.value })}
          placeholder="Rahul Sharma"
        />
        {errors["customer_name"] && (
          <p className="text-xs text-destructive">{errors["customer_name"]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="enq-phone">Phone Number *</Label>
        <Input
          id="enq-phone"
          inputMode="numeric"
          maxLength={10}
          value={values.phone}
          onChange={(e) =>
            setValues({ ...values, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
          }
          placeholder="9876543210"
        />
        {errors["phone"] && <p className="text-xs text-destructive">{errors["phone"]}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="enq-email">Email (optional)</Label>
        <Input
          id="enq-email"
          type="email"
          maxLength={255}
          value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
          placeholder="you@example.com"
        />
        {errors["email"] && <p className="text-xs text-destructive">{errors["email"]}</p>}
      </div>
      {product && (
        <div className="space-y-2">
          <Label htmlFor="enq-product">Product</Label>
          <Input id="enq-product" readOnly value={`${product.brand} ${product.name}`} />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="enq-msg">Message (optional)</Label>
        <Textarea
          id="enq-msg"
          rows={3}
          maxLength={1000}
          value={values.message}
          onChange={(e) => setValues({ ...values, message: e.target.value })}
          placeholder="Is EMI available? What's the best price?"
        />
      </div>
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Sending..." : "Submit Enquiry"}
      </Button>
    </form>
  );
}

export function EnquiryDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enquire Now</DialogTitle>
          <DialogDescription>
            Share your details and our team will call you back with the best in-store price.
          </DialogDescription>
        </DialogHeader>
        <EnquiryForm product={product} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
