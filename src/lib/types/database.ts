// ============================================================
// TypeScript types mirroring the Supabase database schema
// ============================================================

export type UserRole = "admin" | "user";
export type ContactType = "customer" | "vendor" | "customer_vendor" | "contact";
export type OrderStatus = "draft" | "active" | "billed" | "partially_returned" | "returned" | "cancelled";
export type InvoiceStatus = "open" | "paid" | "partially_paid" | "cancelled";
export type PaymentMode = "cash" | "bank_transfer" | "zelle";
export type AdjustmentReason = "damage" | "recount" | "transfer" | "return" | "other";

export interface ModulePermissions {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface UserPermissions {
  stock: ModulePermissions;
  purchases: ModulePermissions;
  sales: ModulePermissions;
  contacts: ModulePermissions;
  settings: ModulePermissions;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  permissions: UserPermissions;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  company_name: string | null;
  type: ContactType;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
  tax_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  sub_category: string | null;
  pcs: number;
  qty: number;
  rate: number;
  total_value: number;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  order_no: string;
  vendor_id: string;
  branch: string | null;
  shipping_address: string | null;
  date: string;
  currency: string;
  status: OrderStatus;
  is_bill: boolean;
  subtotal: number;
  total_tax: number;
  total_discount: number;
  total_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  vendor?: Contact;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  product_id: string | null;
  sku: string | null;
  product_name: string;
  sub_product: string | null;
  pcs: number;
  qty: number;
  rate: number;
  discount_pct: number;
  tax_pct: number;
  amount: number;
  returned_qty: number;
  returned_pcs: number;
  notes: string | null;
  created_at: string;
}

export interface PurchaseReturn {
  id: string;
  po_id: string;
  return_no: string;
  date: string;
  total_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PurchaseReturnItem {
  id: string;
  return_id: string;
  po_item_id: string;
  pcs: number;
  qty: number;
  amount: number;
  created_at: string;
}

export interface DebitNote {
  id: string;
  debit_note_no: string;
  po_id: string;
  return_id: string | null;
  vendor_id: string;
  date: string;
  total_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SalesOrder {
  id: string;
  order_no: string;
  customer_id: string;
  branch: string | null;
  salesperson: string | null;
  payment_terms: string | null;
  date: string;
  status: OrderStatus;
  subtotal: number;
  total_tax: number;
  total_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer?: Contact;
}

export interface SalesOrderItem {
  id: string;
  so_id: string;
  product_id: string | null;
  sku: string | null;
  product_name: string;
  pcs: number;
  qty: number;
  rate: number;
  tax_pct: number;
  amount: number;
  returned_qty: number;
  returned_pcs: number;
  notes: string | null;
  created_at: string;
}

export interface SalesReturn {
  id: string;
  so_id: string;
  return_no: string;
  date: string;
  total_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SalesReturnItem {
  id: string;
  return_id: string;
  so_item_id: string;
  pcs: number;
  qty: number;
  amount: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_no: string;
  so_id: string | null;
  customer_id: string;
  branch: string | null;
  date: string;
  due_date: string | null;
  status: InvoiceStatus;
  subtotal: number;
  total_tax: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer?: Contact;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  sku: string | null;
  product_name: string;
  pcs: number;
  qty: number;
  rate: number;
  tax_pct: number;
  amount: number;
  created_at: string;
}

export interface Payment {
  id: string;
  payment_no: string;
  invoice_id: string;
  customer_id: string;
  branch: string | null;
  payment_date: string;
  payment_mode: PaymentMode;
  payment_type: string | null;
  amount_paid: number;
  deposit_to: string | null;
  reference_no: string | null;
  internal_notes: string | null;
  file_url: string | null;
  created_by: string | null;
  created_at: string;
  // Joined fields
  invoice?: Invoice;
  customer?: Contact;
}

export interface CreditNote {
  id: string;
  credit_note_no: string;
  so_id: string | null;
  invoice_id: string | null;
  return_id: string | null;
  customer_id: string;
  date: string;
  total_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface StockAdjustment {
  id: string;
  product_id: string;
  pcs_change: number;
  qty_change: number;
  reason: AdjustmentReason;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // Joined fields
  product?: Product;
}

// ============================================================
// Form types (for creating/updating)
// ============================================================

export type ContactFormData = Omit<Contact, "id" | "created_at" | "updated_at" | "created_by">;
export type ProductFormData = Omit<Product, "id" | "total_value" | "created_at" | "updated_at" | "created_by">;

export interface PurchaseOrderFormData {
  vendor_id: string;
  branch: string;
  shipping_address: string;
  date: string;
  currency: string;
  notes: string;
  items: PurchaseOrderItemFormData[];
}

export interface PurchaseOrderItemFormData {
  product_id?: string;
  sku: string;
  product_name: string;
  sub_product: string;
  pcs: number;
  qty: number;
  rate: number;
  discount_pct: number;
  tax_pct: number;
  notes: string;
}

export interface SalesOrderFormData {
  customer_id: string;
  branch: string;
  salesperson: string;
  payment_terms: string;
  date: string;
  notes: string;
  items: SalesOrderItemFormData[];
}

export interface SalesOrderItemFormData {
  product_id?: string;
  sku: string;
  product_name: string;
  pcs: number;
  qty: number;
  rate: number;
  tax_pct: number;
  notes: string;
}

export interface PaymentFormData {
  invoice_id: string;
  customer_id: string;
  branch: string;
  payment_date: string;
  payment_mode: PaymentMode;
  payment_type: string;
  amount_paid: number;
  deposit_to: string;
  reference_no: string;
  internal_notes: string;
}

// ============================================================
// Dashboard summary types
// ============================================================

export interface DashboardSummary {
  monthlySales: number;
  totalReceivables: number;
  totalPayables: number;
  recentTransactions: RecentTransaction[];
}

export interface RecentTransaction {
  id: string;
  type: "purchase" | "sale" | "payment" | "invoice";
  reference: string;
  contact_name: string;
  amount: number;
  date: string;
  status: string;
}
