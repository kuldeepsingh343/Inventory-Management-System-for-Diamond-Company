"use server";

import { createClient } from "@/lib/supabase/server";
import type { PurchaseOrder, PurchaseOrderFormData } from "@/lib/types/database";
import { revalidatePath } from "next/cache";

export async function getPurchaseOrders(statusFilter: string = "all") {
  try {
    const supabase = await createClient();
    let dbQuery = supabase
      .from("purchase_orders")
      .select("*, vendor:contacts(name, company_name)")
      .order("created_at", { ascending: false });

    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "memos") {
        dbQuery = dbQuery.eq("is_bill", false);
      } else if (statusFilter === "bills") {
        dbQuery = dbQuery.eq("is_bill", true);
      } else {
        dbQuery = dbQuery.eq("status", statusFilter);
      }
    }
    
    const { data, error } = await dbQuery;
    if (error) throw error;
    
    return { data: data as any[], error: null };
  } catch (error: any) {
    console.error("Fetch purchase orders error:", error);
    return { data: null, error: error.message };
  }
}

export async function getPurchaseOrder(id: string) {
  try {
    const supabase = await createClient();
    
    // Fetch PO
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("*, vendor:contacts(*)")
      .eq("id", id)
      .single();
      
    if (poError) throw poError;
    
    // Fetch PO items
    const { data: items, error: itemsError } = await supabase
      .from("purchase_order_items")
      .select("*")
      .eq("po_id", id);
      
    if (itemsError) throw itemsError;
    
    return { data: { po, items }, error: null };
  } catch (error: any) {
    console.error("Fetch purchase order error:", error);
    return { data: null, error: error.message };
  }
}

export async function createPurchaseOrder(formData: PurchaseOrderFormData) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    
    // Generate order number
    const { data: seqData, error: seqError } = await supabase.rpc('nextval', { seq_name: 'po_number_seq' });
    const orderNo = `PO-${seqData || Math.floor(Math.random() * 1000000)}`;
    
    // Calculate totals
    const subtotal = formData.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const total_discount = formData.items.reduce((sum, item) => sum + (item.qty * item.rate * (item.discount_pct / 100)), 0);
    const total_tax = formData.items.reduce((sum, item) => {
      const discountedAmt = (item.qty * item.rate) * (1 - item.discount_pct / 100);
      return sum + (discountedAmt * (item.tax_pct / 100));
    }, 0);
    const total_amount = subtotal - total_discount + total_tax;

    // Insert PO
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .insert({
        order_no: orderNo,
        vendor_id: formData.vendor_id,
        branch: formData.branch,
        shipping_address: formData.shipping_address,
        date: formData.date,
        currency: formData.currency,
        status: "active",
        is_bill: false,
        subtotal,
        total_tax,
        total_discount,
        total_amount,
        notes: formData.notes,
        created_by: user?.user?.id
      })
      .select()
      .single();

    if (poError) throw poError;
    
    // Insert PO items
    const poItems = formData.items.map(item => {
      const amount = (item.qty * item.rate) * (1 - item.discount_pct / 100) * (1 + item.tax_pct / 100);
      return {
        po_id: po.id,
        product_id: item.product_id || null, // Will be null if it's a new item not in stock DB yet
        sku: item.sku,
        product_name: item.product_name,
        sub_product: item.sub_product,
        pcs: item.pcs,
        qty: item.qty,
        rate: item.rate,
        discount_pct: item.discount_pct,
        tax_pct: item.tax_pct,
        amount,
        returned_qty: 0,
        returned_pcs: 0,
        notes: item.notes
      };
    });
    
    const { error: itemsError } = await supabase
      .from("purchase_order_items")
      .insert(poItems);
      
    if (itemsError) throw itemsError;
    
    revalidatePath("/purchases");
    return { data: po, error: null };
  } catch (error: any) {
    console.error("Create purchase order error:", error);
    return { data: null, error: error.message };
  }
}

export async function convertToBill(poId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("purchase_orders")
      .update({
        is_bill: true,
        status: "billed"
      })
      .eq("id", poId)
      .select()
      .single();

    if (error) throw error;
    
    // In a real app, this might also trigger updating stock quantities (adding stock to inventory)
    // For this implementation, we'll keep it simple
    
    revalidatePath("/purchases");
    revalidatePath(`/purchases/${poId}`);
    return { data, error: null };
  } catch (error: any) {
    console.error("Convert to bill error:", error);
    return { data: null, error: error.message };
  }
}

export async function processPurchaseReturn(poId: string, returns: any[]) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    
    // 1. Generate return number
    const returnNo = `PR-${Math.floor(Math.random() * 1000000)}`;
    
    const totalReturnAmount = returns.reduce((sum, item) => sum + item.returnAmount, 0);
    
    // 2. Create Purchase Return record
    const { data: pr, error: prError } = await supabase
      .from("purchase_returns")
      .insert({
        po_id: poId,
        return_no: returnNo,
        date: new Date().toISOString().split('T')[0],
        total_amount: totalReturnAmount,
        created_by: user?.user?.id
      })
      .select()
      .single();
      
    if (prError) throw prError;
    
    // 3. Create Return Items and update PO Items
    for (const item of returns) {
      if (item.returnQty > 0 || item.returnPcs > 0) {
        await supabase
          .from("purchase_return_items")
          .insert({
            return_id: pr.id,
            po_item_id: item.poItemId,
            pcs: item.returnPcs,
            qty: item.returnQty,
            amount: item.returnAmount
          });
          
        // Update PO item returned qty
        await supabase.rpc('increment_po_item_returns', {
          p_item_id: item.poItemId,
          p_qty: item.returnQty,
          p_pcs: item.returnPcs
        });
      }
    }
    
    // 4. Update PO status
    // Check if fully returned or partially
    const { data: poItems } = await supabase
      .from("purchase_order_items")
      .select("qty, returned_qty")
      .eq("po_id", poId);
      
    let allReturned = true;
    poItems?.forEach(item => {
      if (item.returned_qty < item.qty) allReturned = false;
    });
    
    await supabase
      .from("purchase_orders")
      .update({
        status: allReturned ? "returned" : "partially_returned"
      })
      .eq("id", poId);
      
    revalidatePath("/purchases");
    revalidatePath(`/purchases/${poId}`);
    return { data: pr, error: null };
  } catch (error: any) {
    console.error("Process purchase return error:", error);
    return { data: null, error: error.message };
  }
}
