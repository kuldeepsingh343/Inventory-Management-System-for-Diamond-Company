"use server";

import { createClient } from "@/lib/supabase/server";
import type { SalesOrderFormData, PaymentFormData } from "@/lib/types/database";
import { revalidatePath } from "next/cache";

export async function getSalesOrders(statusFilter: string = "all") {
  try {
    const supabase = await createClient();
    let dbQuery = supabase
      .from("sales_orders")
      .select("*, customer:contacts(name, company_name)")
      .order("created_at", { ascending: false });

    if (statusFilter && statusFilter !== "all") {
      dbQuery = dbQuery.eq("status", statusFilter);
    }
    
    const { data, error } = await dbQuery;
    if (error) throw error;
    
    return { data: data as any[], error: null };
  } catch (error: any) {
    console.error("Fetch sales orders error:", error);
    return { data: null, error: error.message };
  }
}

export async function getSalesOrder(id: string) {
  try {
    const supabase = await createClient();
    
    const { data: so, error: soError } = await supabase
      .from("sales_orders")
      .select("*, customer:contacts(*)")
      .eq("id", id)
      .single();
      
    if (soError) throw soError;
    
    const { data: items, error: itemsError } = await supabase
      .from("sales_order_items")
      .select("*")
      .eq("so_id", id);
      
    if (itemsError) throw itemsError;
    
    return { data: { so, items }, error: null };
  } catch (error: any) {
    console.error("Fetch sales order error:", error);
    return { data: null, error: error.message };
  }
}

export async function createSalesOrder(formData: SalesOrderFormData) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    
    // Generate order number
    const { data: seqData, error: seqError } = await supabase.rpc('nextval', { seq_name: 'so_number_seq' });
    const orderNo = `SO-${seqData || Math.floor(Math.random() * 1000000)}`;
    
    // Calculate totals
    const subtotal = formData.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const total_tax = formData.items.reduce((sum, item) => sum + ((item.qty * item.rate) * (item.tax_pct / 100)), 0);
    const total_amount = subtotal + total_tax;

    // Insert SO
    const { data: so, error: soError } = await supabase
      .from("sales_orders")
      .insert({
        order_no: orderNo,
        customer_id: formData.customer_id,
        branch: formData.branch,
        salesperson: formData.salesperson,
        payment_terms: formData.payment_terms,
        date: formData.date,
        status: "active",
        subtotal,
        total_tax,
        total_amount,
        notes: formData.notes,
        created_by: user?.user?.id
      })
      .select()
      .single();

    if (soError) throw soError;
    
    // Insert SO items
    const soItems = formData.items.map(item => {
      const amount = (item.qty * item.rate) * (1 + item.tax_pct / 100);
      return {
        so_id: so.id,
        product_id: item.product_id || null,
        sku: item.sku,
        product_name: item.product_name,
        pcs: item.pcs,
        qty: item.qty,
        rate: item.rate,
        tax_pct: item.tax_pct,
        amount,
        returned_qty: 0,
        returned_pcs: 0,
        notes: item.notes
      };
    });
    
    const { error: itemsError } = await supabase
      .from("sales_order_items")
      .insert(soItems);
      
    if (itemsError) throw itemsError;
    
    // Optional: deduct from stock (simple implementation)
    for (const item of formData.items) {
      if (item.product_id) {
        await supabase.rpc('decrement_stock', {
          p_id: item.product_id,
          p_qty: item.qty,
          p_pcs: item.pcs
        });
      }
    }
    
    revalidatePath("/sales");
    return { data: so, error: null };
  } catch (error: any) {
    console.error("Create sales order error:", error);
    return { data: null, error: error.message };
  }
}

export async function convertToInvoice(soId: string) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    
    // Fetch SO details
    const { data: so, error: soError } = await supabase
      .from("sales_orders")
      .select("*")
      .eq("id", soId)
      .single();
      
    if (soError) throw soError;
    
    // Generate Invoice number
    const { data: seqData } = await supabase.rpc('nextval', { seq_name: 'inv_number_seq' });
    const invoiceNo = `INV-${seqData || Math.floor(Math.random() * 1000000)}`;
    
    // Create Invoice
    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .insert({
        invoice_no: invoiceNo,
        so_id: so.id,
        customer_id: so.customer_id,
        branch: so.branch,
        date: new Date().toISOString().split('T')[0],
        status: "open",
        subtotal: so.subtotal,
        total_tax: so.total_tax,
        total_amount: so.total_amount,
        amount_paid: 0,
        balance: so.total_amount,
        notes: so.notes,
        created_by: user?.user?.id
      })
      .select()
      .single();
      
    if (invError) throw invError;
    
    // Copy items
    const { data: soItems } = await supabase
      .from("sales_order_items")
      .select("*")
      .eq("so_id", soId);
      
    if (soItems && soItems.length > 0) {
      const invItems = soItems.map(item => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        sku: item.sku,
        product_name: item.product_name,
        pcs: item.pcs,
        qty: item.qty,
        rate: item.rate,
        tax_pct: item.tax_pct,
        amount: item.amount
      }));
      
      await supabase.from("invoice_items").insert(invItems);
    }
    
    // Update SO status
    await supabase
      .from("sales_orders")
      .update({ status: "billed" })
      .eq("id", soId);
      
    revalidatePath("/sales");
    revalidatePath("/invoices");
    return { data: invoice, error: null };
  } catch (error: any) {
    console.error("Convert to invoice error:", error);
    return { data: null, error: error.message };
  }
}

export async function getInvoices(statusFilter: string = "all") {
  try {
    const supabase = await createClient();
    let dbQuery = supabase
      .from("invoices")
      .select("*, customer:contacts(name, company_name)")
      .order("created_at", { ascending: false });

    if (statusFilter && statusFilter !== "all") {
      dbQuery = dbQuery.eq("status", statusFilter);
    }
    
    const { data, error } = await dbQuery;
    if (error) throw error;
    
    return { data: data as any[], error: null };
  } catch (error: any) {
    console.error("Fetch invoices error:", error);
    return { data: null, error: error.message };
  }
}

export async function getInvoice(id: string) {
  try {
    const supabase = await createClient();
    
    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .select("*, customer:contacts(*)")
      .eq("id", id)
      .single();
      
    if (invError) throw invError;
    
    const { data: items, error: itemsError } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id);
      
    if (itemsError) throw itemsError;
    
    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", id)
      .order("payment_date", { ascending: false });
      
    return { data: { invoice, items, payments: payments || [] }, error: null };
  } catch (error: any) {
    console.error("Fetch invoice error:", error);
    return { data: null, error: error.message };
  }
}

export async function addPayment(formData: PaymentFormData) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    
    // Generate payment number
    const { data: seqData } = await supabase.rpc('nextval', { seq_name: 'pay_number_seq' });
    const paymentNo = `PAY-${seqData || Math.floor(Math.random() * 1000000)}`;
    
    // Fetch invoice to check balance
    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .select("balance, amount_paid")
      .eq("id", formData.invoice_id)
      .single();
      
    if (invError) throw invError;
    
    if (formData.amount_paid > invoice.balance) {
      throw new Error(`Payment amount (${formData.amount_paid}) cannot exceed remaining balance (${invoice.balance}).`);
    }
    
    // Create payment
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .insert({
        payment_no: paymentNo,
        invoice_id: formData.invoice_id,
        customer_id: formData.customer_id,
        branch: formData.branch,
        payment_date: formData.payment_date,
        payment_mode: formData.payment_mode,
        payment_type: formData.payment_type,
        amount_paid: formData.amount_paid,
        deposit_to: formData.deposit_to,
        reference_no: formData.reference_no,
        internal_notes: formData.internal_notes,
        created_by: user?.user?.id
      })
      .select()
      .single();
      
    if (payError) throw payError;
    
    // Update invoice balance & status
    const newPaid = Number(invoice.amount_paid) + formData.amount_paid;
    const newBalance = Number(invoice.balance) - formData.amount_paid;
    const newStatus = newBalance <= 0 ? "paid" : "partially_paid";
    
    await supabase
      .from("invoices")
      .update({
        amount_paid: newPaid,
        balance: newBalance,
        status: newStatus
      })
      .eq("id", formData.invoice_id);
      
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${formData.invoice_id}`);
    return { data: payment, error: null };
  } catch (error: any) {
    console.error("Add payment error:", error);
    return { data: null, error: error.message };
  }
}
