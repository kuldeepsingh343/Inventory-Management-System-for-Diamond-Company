-- ============================================================
-- Diamond Trading Stock & Accounting — Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE contact_type AS ENUM ('customer', 'vendor', 'customer_vendor', 'contact');
CREATE TYPE order_status AS ENUM ('draft', 'active', 'billed', 'partially_returned', 'returned', 'cancelled');
CREATE TYPE invoice_status AS ENUM ('open', 'paid', 'partially_paid', 'cancelled');
CREATE TYPE payment_mode AS ENUM ('cash', 'bank_transfer', 'zelle');
CREATE TYPE adjustment_reason AS ENUM ('damage', 'recount', 'transfer', 'return', 'other');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'user',
  permissions JSONB NOT NULL DEFAULT '{
    "stock": {"read": true, "create": true, "update": true, "delete": false},
    "purchases": {"read": true, "create": true, "update": true, "delete": false},
    "sales": {"read": true, "create": true, "update": true, "delete": false},
    "contacts": {"read": true, "create": true, "update": true, "delete": false},
    "settings": {"read": false, "create": false, "update": false, "delete": false}
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- CONTACTS (Vendors, Customers, Both)
-- ============================================================

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company_name TEXT,
  type contact_type NOT NULL DEFAULT 'contact',
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  zip_code TEXT,
  tax_id TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS (Diamond Stock Items)
-- ============================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  sub_category TEXT,
  pcs INTEGER NOT NULL DEFAULT 0,
  qty DECIMAL(12,4) NOT NULL DEFAULT 0,  -- Carat weight
  rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_value DECIMAL(14,2) GENERATED ALWAYS AS (qty * rate) STORED,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PURCHASE ORDERS (Memos / Bills)
-- ============================================================

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_no TEXT NOT NULL UNIQUE,
  vendor_id UUID NOT NULL REFERENCES contacts(id),
  branch TEXT,
  shipping_address TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  currency TEXT NOT NULL DEFAULT 'USD',
  status order_status NOT NULL DEFAULT 'draft',
  is_bill BOOLEAN NOT NULL DEFAULT FALSE,
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_tax DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_discount DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  sku TEXT,
  product_name TEXT NOT NULL,
  sub_product TEXT,
  pcs INTEGER NOT NULL DEFAULT 0,
  qty DECIMAL(12,4) NOT NULL DEFAULT 0,
  rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  tax_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  returned_qty DECIMAL(12,4) NOT NULL DEFAULT 0,
  returned_pcs INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PURCHASE RETURNS
-- ============================================================

CREATE TABLE purchase_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id),
  return_no TEXT NOT NULL UNIQUE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_return_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
  po_item_id UUID NOT NULL REFERENCES purchase_order_items(id),
  pcs INTEGER NOT NULL DEFAULT 0,
  qty DECIMAL(12,4) NOT NULL DEFAULT 0,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DEBIT NOTES (for returns after billing)
-- ============================================================

CREATE TABLE debit_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debit_note_no TEXT NOT NULL UNIQUE,
  po_id UUID NOT NULL REFERENCES purchase_orders(id),
  return_id UUID REFERENCES purchase_returns(id),
  vendor_id UUID NOT NULL REFERENCES contacts(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SALES ORDERS (Memos)
-- ============================================================

CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_no TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES contacts(id),
  branch TEXT,
  salesperson TEXT,
  payment_terms TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status order_status NOT NULL DEFAULT 'draft',
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_tax DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sales_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  so_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  sku TEXT,
  product_name TEXT NOT NULL,
  pcs INTEGER NOT NULL DEFAULT 0,
  qty DECIMAL(12,4) NOT NULL DEFAULT 0,
  rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  returned_qty DECIMAL(12,4) NOT NULL DEFAULT 0,
  returned_pcs INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SALES RETURNS
-- ============================================================

CREATE TABLE sales_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  so_id UUID NOT NULL REFERENCES sales_orders(id),
  return_no TEXT NOT NULL UNIQUE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sales_return_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
  so_item_id UUID NOT NULL REFERENCES sales_order_items(id),
  pcs INTEGER NOT NULL DEFAULT 0,
  qty DECIMAL(12,4) NOT NULL DEFAULT 0,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INVOICES
-- ============================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_no TEXT NOT NULL UNIQUE,
  so_id UUID REFERENCES sales_orders(id),
  customer_id UUID NOT NULL REFERENCES contacts(id),
  branch TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status invoice_status NOT NULL DEFAULT 'open',
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_tax DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(14,2) NOT NULL DEFAULT 0,
  balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  sku TEXT,
  product_name TEXT NOT NULL,
  pcs INTEGER NOT NULL DEFAULT 0,
  qty DECIMAL(12,4) NOT NULL DEFAULT 0,
  rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_no TEXT NOT NULL UNIQUE,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  customer_id UUID NOT NULL REFERENCES contacts(id),
  branch TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode payment_mode NOT NULL DEFAULT 'cash',
  payment_type TEXT,
  amount_paid DECIMAL(14,2) NOT NULL DEFAULT 0,
  deposit_to TEXT,
  reference_no TEXT,
  internal_notes TEXT,
  file_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CREDIT NOTES (for sales returns after invoicing)
-- ============================================================

CREATE TABLE credit_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credit_note_no TEXT NOT NULL UNIQUE,
  so_id UUID REFERENCES sales_orders(id),
  invoice_id UUID REFERENCES invoices(id),
  return_id UUID REFERENCES sales_returns(id),
  customer_id UUID NOT NULL REFERENCES contacts(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STOCK ADJUSTMENTS (Audit Log)
-- ============================================================

CREATE TABLE stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  pcs_change INTEGER NOT NULL DEFAULT 0,
  qty_change DECIMAL(12,4) NOT NULL DEFAULT 0,
  reason adjustment_reason NOT NULL DEFAULT 'other',
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================

CREATE INDEX idx_contacts_type ON contacts(type);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_items_po ON purchase_order_items(po_id);
CREATE INDEX idx_so_customer ON sales_orders(customer_id);
CREATE INDEX idx_so_status ON sales_orders(status);
CREATE INDEX idx_so_items_so ON sales_order_items(so_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_stock_adj_product ON stock_adjustments(product_id);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE debit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- PROFILES RLS
-- ============================================================

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT USING (is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT WITH CHECK (is_admin());

-- ============================================================
-- GENERAL RLS POLICIES (applied to all data tables)
-- ============================================================

-- Macro for applying standard policies to a table
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'contacts', 'products',
    'purchase_orders', 'purchase_order_items',
    'purchase_returns', 'purchase_return_items', 'debit_notes',
    'sales_orders', 'sales_order_items',
    'sales_returns', 'sales_return_items',
    'invoices', 'invoice_items',
    'payments', 'credit_notes', 'stock_adjustments'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Authenticated users can SELECT
    EXECUTE format(
      'CREATE POLICY "Authenticated users can view %1$s" ON %1$s FOR SELECT USING (auth.uid() IS NOT NULL)',
      tbl
    );

    -- Authenticated users can INSERT
    EXECUTE format(
      'CREATE POLICY "Authenticated users can insert %1$s" ON %1$s FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)',
      tbl
    );

    -- Authenticated users can UPDATE
    EXECUTE format(
      'CREATE POLICY "Authenticated users can update %1$s" ON %1$s FOR UPDATE USING (auth.uid() IS NOT NULL)',
      tbl
    );

    -- ONLY Admins can DELETE
    EXECUTE format(
      'CREATE POLICY "Only admins can delete %1$s" ON %1$s FOR DELETE USING (is_admin())',
      tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'profiles', 'contacts', 'products',
    'purchase_orders', 'sales_orders', 'invoices'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- SEQUENCE GENERATORS for order numbers
-- ============================================================

CREATE SEQUENCE po_number_seq START 1001;
CREATE SEQUENCE so_number_seq START 2001;
CREATE SEQUENCE inv_number_seq START 3001;
CREATE SEQUENCE pay_number_seq START 4001;
CREATE SEQUENCE pr_number_seq START 5001;
CREATE SEQUENCE sr_number_seq START 6001;
CREATE SEQUENCE dn_number_seq START 7001;
CREATE SEQUENCE cn_number_seq START 8001;
