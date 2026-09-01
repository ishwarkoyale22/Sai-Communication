// Minimal admin CRUD screens for the POS/back-office tables that have no
// bespoke UI yet: staff, sales, sales_items, services, wholesaler_invoices,
// third_party_purchases, emi_finance, repairs. Plain list/add/edit/delete —
// no business logic (no stock deduction on sale, no EMI schedule
// generation, etc.).
import { GenericCrudTab, type FieldConfig } from "./GenericCrudTab";

const STAFF_FIELDS: FieldConfig[] = [
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
  { key: "salary", label: "Salary", type: "number" },
  { key: "joined_date", label: "Joined Date", type: "date" },
  { key: "pin", label: "PIN" },
  { key: "is_active", label: "Active", type: "boolean" },
];
export function StaffTab({ token }: { token: string }) {
  return <GenericCrudTab token={token} table="staff" title="Staff" fields={STAFF_FIELDS} orderBy="name" />;
}

const SALES_FIELDS: FieldConfig[] = [
  { key: "invoice_number", label: "Invoice #" },
  { key: "customer_name", label: "Customer" },
  { key: "customer_phone", label: "Phone" },
  { key: "customer_id", label: "Customer ID (uuid, optional)" },
  { key: "sale_type", label: "Sale Type" },
  { key: "total_amount", label: "Total Amount", type: "number" },
  { key: "discount", label: "Discount", type: "number" },
  { key: "final_amount", label: "Final Amount", type: "number" },
  { key: "payment_method", label: "Payment Method" },
  { key: "payment_status", label: "Payment Status" },
  { key: "staff_id", label: "Staff ID (uuid, optional)" },
  { key: "notes", label: "Notes", type: "textarea" },
];
export function SalesTab({ token }: { token: string }) {
  return <GenericCrudTab token={token} table="sales" title="Sales" fields={SALES_FIELDS} />;
}

const SALES_ITEMS_FIELDS: FieldConfig[] = [
  { key: "sale_id", label: "Sale ID (uuid)" },
  { key: "inventory_id", label: "Inventory ID (uuid, optional)" },
  { key: "item_name", label: "Item Name" },
  { key: "quantity", label: "Quantity", type: "number" },
  { key: "unit_price", label: "Unit Price", type: "number" },
  { key: "total_price", label: "Total Price", type: "number" },
];
export function SalesItemsTab({ token }: { token: string }) {
  return <GenericCrudTab token={token} table="sales_items" title="Sale Items" fields={SALES_ITEMS_FIELDS} orderBy="id" />;
}

const SERVICES_FIELDS: FieldConfig[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "price", label: "Price", type: "number" },
  { key: "is_active", label: "Active", type: "boolean" },
];
export function ServicesTab({ token }: { token: string }) {
  return <GenericCrudTab token={token} table="services" title="Services" fields={SERVICES_FIELDS} orderBy="name" />;
}

const WHOLESALER_FIELDS: FieldConfig[] = [
  { key: "wholesaler_name", label: "Wholesaler" },
  { key: "invoice_number", label: "Invoice #" },
  { key: "items", label: "Items (JSON)", type: "json" },
  { key: "total_amount", label: "Total Amount", type: "number" },
  { key: "paid_amount", label: "Paid Amount", type: "number" },
  { key: "due_amount", label: "Due Amount", type: "number" },
  { key: "payment_status", label: "Payment Status" },
  { key: "invoice_date", label: "Invoice Date", type: "date" },
  { key: "due_date", label: "Due Date", type: "date" },
  { key: "notes", label: "Notes", type: "textarea" },
];
export function WholesalerInvoicesTab({ token }: { token: string }) {
  return <GenericCrudTab token={token} table="wholesaler_invoices" title="Wholesaler Invoices" fields={WHOLESALER_FIELDS} orderBy="invoice_date" />;
}

const THIRD_PARTY_PURCHASE_FIELDS: FieldConfig[] = [
  { key: "vendor_name", label: "Vendor" },
  { key: "item_name", label: "Item" },
  { key: "quantity", label: "Quantity", type: "number" },
  { key: "unit_price", label: "Unit Price", type: "number" },
  { key: "total_price", label: "Total Price", type: "number" },
  { key: "purchase_date", label: "Purchase Date", type: "date" },
  { key: "notes", label: "Notes", type: "textarea" },
];
export function ThirdPartyPurchasesTab({ token }: { token: string }) {
  return <GenericCrudTab token={token} table="third_party_purchases" title="Third-Party Purchases" fields={THIRD_PARTY_PURCHASE_FIELDS} orderBy="purchase_date" />;
}

const EMI_FIELDS: FieldConfig[] = [
  { key: "customer_name", label: "Customer" },
  { key: "phone", label: "Phone" },
  { key: "customer_id", label: "Customer ID (uuid, optional)" },
  { key: "sale_id", label: "Sale ID (uuid, optional)" },
  { key: "product_name", label: "Product" },
  { key: "total_amount", label: "Total Amount", type: "number" },
  { key: "down_payment", label: "Down Payment", type: "number" },
  { key: "loan_amount", label: "Loan Amount", type: "number" },
  { key: "emi_months", label: "EMI Months", type: "number" },
  { key: "emi_amount", label: "EMI Amount", type: "number" },
  { key: "finance_company", label: "Finance Company" },
  { key: "status", label: "Status" },
  { key: "start_date", label: "Start Date", type: "date" },
  { key: "notes", label: "Notes", type: "textarea" },
];
export function EmiFinanceTab({ token }: { token: string }) {
  return <GenericCrudTab token={token} table="emi_finance" title="EMI Finance" fields={EMI_FIELDS} orderBy="start_date" />;
}

const REPAIRS_FIELDS: FieldConfig[] = [
  { key: "customer_name", label: "Customer" },
  { key: "phone", label: "Phone" },
  { key: "customer_id", label: "Customer ID (uuid, optional)" },
  { key: "enquiry_id", label: "Repair Enquiry ID (uuid, optional)" },
  { key: "device_brand", label: "Brand" },
  { key: "device_model", label: "Model" },
  { key: "problem", label: "Problem", type: "textarea" },
  { key: "diagnosis", label: "Diagnosis", type: "textarea" },
  { key: "parts_used", label: "Parts Used", type: "textarea" },
  { key: "repair_cost", label: "Repair Cost", type: "number" },
  { key: "advance_paid", label: "Advance Paid", type: "number" },
  { key: "status", label: "Status" },
  { key: "technician_id", label: "Technician ID (staff uuid, optional)" },
  { key: "notes", label: "Notes", type: "textarea" },
];
export function RepairsTab({ token }: { token: string }) {
  return <GenericCrudTab token={token} table="repairs" title="Repair Jobs" fields={REPAIRS_FIELDS} orderBy="received_at" />;
}
