import { GenericCrudTab, type FieldConfig } from "./GenericCrudTab";

// Products & Refurbished both live in `inventory`, split by `product_type`.
// Two tabs, two GenericCrudTab instances pointed at the same table — the
// server always stamps product_type on save (see saveProduct/saveRefurbished
// in admin.server.ts), so items created here land in the right bucket.

const PRODUCT_FIELDS: FieldConfig[] = [
  { key: "name", label: "Name" },
  { key: "brand_id", label: "Brand ID (uuid — see Brands tab)" },
  { key: "model", label: "Model" },
  { key: "category", label: "Category" },
  { key: "price", label: "Price", type: "number" },
  { key: "original_price", label: "Original Price", type: "number" },
  { key: "stock", label: "Stock", type: "number" },
  { key: "images", label: "Images (JSON array of URLs)", type: "json" },
  { key: "specs", label: "Specs (JSON object)", type: "json" },
  { key: "warranty_months", label: "Warranty (months)", type: "number" },
  { key: "is_featured", label: "Featured", type: "boolean" },
  { key: "is_active", label: "Active", type: "boolean" },
];

export function ProductsTab({ token }: { token: string }) {
  return (
    <GenericCrudTab
      token={token}
      table="inventory"
      title="Products (New)"
      fields={PRODUCT_FIELDS}
      filter={{ column: "product_type", value: "new" }}
      extraFieldsOnSave={{ product_type: "new" }}
    />
  );
}

const BRAND_FIELDS: FieldConfig[] = [
  { key: "name", label: "Name" },
  { key: "logo_url", label: "Logo URL" },
  { key: "is_active", label: "Active", type: "boolean" },
];

export function BrandsTab({ token }: { token: string }) {
  return <GenericCrudTab token={token} table="brands" title="Brands" fields={BRAND_FIELDS} orderBy="name" />;
}

const REFURBISHED_FIELDS: FieldConfig[] = [
  { key: "name", label: "Name" },
  { key: "brand_id", label: "Brand ID (uuid — see Brands tab)" },
  { key: "model", label: "Model" },
  { key: "category", label: "Category" },
  { key: "condition", label: "Condition (excellent/good/fair)" },
  { key: "grade", label: "Grade (A/B/C)" },
  { key: "battery_health", label: "Battery Health %", type: "number" },
  { key: "price", label: "Price", type: "number" },
  { key: "original_price", label: "Original Price", type: "number" },
  { key: "stock", label: "Stock", type: "number" },
  { key: "warranty_months", label: "Warranty (months)", type: "number" },
  { key: "images", label: "Images (JSON array of URLs)", type: "json" },
  { key: "specs", label: "Specs (JSON object)", type: "json" },
  { key: "is_active", label: "Available", type: "boolean" },
];

export function RefurbishedTab({ token }: { token: string }) {
  return (
    <GenericCrudTab
      token={token}
      table="inventory"
      title="Refurbished Products"
      fields={REFURBISHED_FIELDS}
      filter={{ column: "product_type", value: "refurbished" }}
      extraFieldsOnSave={{ product_type: "refurbished" }}
    />
  );
}

const HAMPER_FIELDS: FieldConfig[] = [
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "price", label: "Price", type: "number" },
  { key: "image", label: "Image URL" },
  { key: "stock", label: "Stock", type: "number" },
  { key: "is_active", label: "Active", type: "boolean" },
];

export function HampersTab({ token }: { token: string }) {
  return <GenericCrudTab token={token} table="hamper_items" title="Gift Hamper Items" fields={HAMPER_FIELDS} orderBy="name" />;
}
