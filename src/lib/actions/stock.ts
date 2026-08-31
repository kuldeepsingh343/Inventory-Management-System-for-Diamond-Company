"use server";

import { createClient } from "@/lib/supabase/server";
import type { Product, ProductFormData, AdjustmentReason } from "@/lib/types/database";
import { revalidatePath } from "next/cache";

export async function getStock(query: string = "", category: string = "") {
  try {
    const supabase = await createClient();
    let dbQuery = supabase.from("products").select("*").order("created_at", { ascending: false });

    if (category && category !== "All") {
      dbQuery = dbQuery.eq("category", category);
    }
    
    if (query) {
      dbQuery = dbQuery.or(`sku.ilike.%${query}%,name.ilike.%${query}%`);
    }

    const { data, error } = await dbQuery;
    
    if (error) throw error;
    
    return { data: data as Product[], error: null };
  } catch (error: any) {
    console.error("Fetch stock error:", error);
    return { data: null, error: error.message };
  }
}

export async function getCategories() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("products").select("category");
    
    if (error) throw error;
    
    const categories = Array.from(new Set(data.map((item) => item.category)));
    return { data: categories, error: null };
  } catch (error: any) {
    console.error("Fetch categories error:", error);
    return { data: null, error: error.message };
  }
}

export async function addStock(productData: ProductFormData) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("products")
      .insert({
        ...productData,
        created_by: user?.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    
    revalidatePath("/stock");
    return { data, error: null };
  } catch (error: any) {
    console.error("Add stock error:", error);
    return { data: null, error: error.message };
  }
}

export async function addStockBulk(products: ProductFormData[]) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    
    const productsWithUser = products.map(p => ({
      ...p,
      created_by: user?.user?.id
    }));

    const { data, error } = await supabase
      .from("products")
      .insert(productsWithUser)
      .select();

    if (error) throw error;
    
    revalidatePath("/stock");
    return { data, error: null };
  } catch (error: any) {
    console.error("Bulk add stock error:", error);
    return { data: null, error: error.message };
  }
}

export async function adjustStock(
  productId: string, 
  pcsChange: number, 
  qtyChange: number, 
  reason: AdjustmentReason, 
  notes?: string
) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    
    // First, verify product exists and get current values
    const { data: currentProduct, error: fetchError } = await supabase
      .from("products")
      .select("pcs, qty")
      .eq("id", productId)
      .single();
      
    if (fetchError) throw fetchError;
    if (!currentProduct) throw new Error("Product not found");

    // Perform adjustment in a transaction-like way using RPC or just two separate calls
    // Since we don't have an RPC function set up for this, we'll do sequential updates.
    
    // 1. Log the adjustment
    const { error: logError } = await supabase
      .from("stock_adjustments")
      .insert({
        product_id: productId,
        pcs_change: pcsChange,
        qty_change: qtyChange,
        reason,
        notes,
        created_by: user?.user?.id
      });
      
    if (logError) throw logError;
    
    // 2. Update product
    const { data, error: updateError } = await supabase
      .from("products")
      .update({
        pcs: currentProduct.pcs + pcsChange,
        qty: Number(currentProduct.qty) + qtyChange
      })
      .eq("id", productId)
      .select()
      .single();
      
    if (updateError) throw updateError;
    
    revalidatePath("/stock");
    return { data, error: null };
  } catch (error: any) {
    console.error("Adjust stock error:", error);
    return { data: null, error: error.message };
  }
}
