import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@tanstack/react-router";

// Single opt-in checkbox for one consent purpose. Always starts unticked — never
// pre-check this, and never treat form submission itself as implied consent.
export function ConsentCheckbox({
  id,
  checked,
  onCheckedChange,
  children,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-0.5"
      />
      <label htmlFor={id} className="text-xs leading-relaxed text-muted-foreground cursor-pointer">
        {children}
      </label>
    </div>
  );
}

export function PrivacyPolicyLink() {
  return (
    <Link to="/privacy-policy" className="font-medium text-primary hover:underline">
      Privacy Policy
    </Link>
  );
}
