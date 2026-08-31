"use server";

import { createClient } from "@/lib/supabase/server";
import { DashboardSummary } from "@/lib/types/database";
import { startOfMonth, endOfMonth, format } from "date-fns";

export async function getDashboardSummary(): Promise<{ data: DashboardSummary | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const now = new Date();
    const startOfCurrentMonth = format(startOfMonth(now), 'yyyy-MM-dd');
    const endOfCurrentMonth = format(endOfMonth(now), 'yyyy-MM-dd');

    // 1. Monthly Sales (Current month sales orders converted to invoices or sales orders total?)
    // Let's use invoices for monthly sales
    const { data: invoices, error: invoicesError } = await supabase
      .from("invoices")
      .select("total_amount")
      .gte("date", startOfCurrentMonth)
      .lte("date", endOfCurrentMonth)
      .neq("status", "cancelled");

    if (invoicesError) throw invoicesError;
    const monthlySales = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

    // 2. Receivables (Unpaid invoice balances)
    const { data: openInvoices, error: openInvoicesError } = await supabase
      .from("invoices")
      .select("balance")
      .in("status", ["open", "partially_paid"]);

    if (openInvoicesError) throw openInvoicesError;
    const totalReceivables = openInvoices?.reduce((sum, inv) => sum + Number(inv.balance), 0) || 0;

    // 3. Payables (Unpaid purchase bills)
    // Assuming unpaid amount is total_amount - (any payments if we had purchase payments, but we don't have purchase payments in schema yet.
    // Let's assume for this schema, if it's billed and not paid, we need to know. 
    // Wait, the schema doesn't have purchase payments. So let's just sum all 'billed' purchase orders? Or just rely on status.
    // For now, let's just sum all 'active' or 'billed' purchase orders.
    const { data: payables, error: payablesError } = await supabase
      .from("purchase_orders")
      .select("total_amount")
      .eq("status", "billed");

    if (payablesError) throw payablesError;
    const totalPayables = payables?.reduce((sum, po) => sum + Number(po.total_amount), 0) || 0;

    // 4. Recent Transactions
    // Combine recent invoices, payments, purchases, sales
    // Since we need to join across multiple tables, we'll fetch them separately and sort in memory
    
    // Recent Sales
    const { data: recentSales } = await supabase
      .from("sales_orders")
      .select("id, order_no, total_amount, date, status, customer_id")
      .order("created_at", { ascending: false })
      .limit(5);
      
    // Recent Purchases
    const { data: recentPurchases } = await supabase
      .from("purchase_orders")
      .select("id, order_no, total_amount, date, status, vendor_id")
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch contacts for names
    const contactIds = [
      ...(recentSales?.map(s => s.customer_id) || []),
      ...(recentPurchases?.map(p => p.vendor_id) || [])
    ];
    
    let contactsMap: Record<string, string> = {};
    if (contactIds.length > 0) {
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, name, company_name")
        .in("id", contactIds);
        
      if (contacts) {
        contactsMap = contacts.reduce((acc, c) => {
          acc[c.id] = c.company_name || c.name;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    const transactions = [
      ...(recentSales || []).map(s => ({
        id: s.id,
        type: "sale" as const,
        reference: s.order_no,
        contact_name: contactsMap[s.customer_id] || "Unknown",
        amount: Number(s.total_amount),
        date: s.date,
        status: s.status,
      })),
      ...(recentPurchases || []).map(p => ({
        id: p.id,
        type: "purchase" as const,
        reference: p.order_no,
        contact_name: contactsMap[p.vendor_id] || "Unknown",
        amount: Number(p.total_amount),
        date: p.date,
        status: p.status,
      }))
    ];

    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return {
      data: {
        monthlySales,
        totalReceivables,
        totalPayables,
        recentTransactions: transactions.slice(0, 10),
      },
      error: null
    };

  } catch (error: any) {
    console.error("Dashboard error:", error);
    return { data: null, error: error.message };
  }
}
