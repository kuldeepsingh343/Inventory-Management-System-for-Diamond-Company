"use server";

import { createClient } from "@/lib/supabase/server";
import type { Contact, ContactFormData } from "@/lib/types/database";
import { revalidatePath } from "next/cache";

export async function getContacts(query: string = "", typeFilter: string = "all") {
  try {
    const supabase = await createClient();
    let dbQuery = supabase.from("contacts").select("*").order("name", { ascending: true });

    if (typeFilter && typeFilter !== "all") {
      dbQuery = dbQuery.eq("type", typeFilter);
    }
    
    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,company_name.ilike.%${query}%,email.ilike.%${query}%`);
    }

    const { data, error } = await dbQuery;
    
    if (error) throw error;
    
    return { data: data as Contact[], error: null };
  } catch (error: any) {
    console.error("Fetch contacts error:", error);
    return { data: null, error: error.message };
  }
}

export async function getContact(id: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .single();
      
    if (error) throw error;
    
    return { data: data as Contact, error: null };
  } catch (error: any) {
    console.error("Fetch contact error:", error);
    return { data: null, error: error.message };
  }
}

export async function addContact(contactData: ContactFormData) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        ...contactData,
        created_by: user?.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    
    revalidatePath("/contacts");
    return { data, error: null };
  } catch (error: any) {
    console.error("Add contact error:", error);
    return { data: null, error: error.message };
  }
}

export async function updateContact(id: string, contactData: Partial<ContactFormData>) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("contacts")
      .update(contactData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    
    revalidatePath("/contacts");
    revalidatePath(`/contacts/${id}`);
    return { data, error: null };
  } catch (error: any) {
    console.error("Update contact error:", error);
    return { data: null, error: error.message };
  }
}

export async function getContactTransactions(id: string) {
  try {
    const supabase = await createClient();
    
    // Fetch all related data in parallel
    const [poRes, soRes, invRes, payRes] = await Promise.all([
      supabase.from("purchase_orders").select("id, order_no, date, total_amount, status").eq("vendor_id", id),
      supabase.from("sales_orders").select("id, order_no, date, total_amount, status").eq("customer_id", id),
      supabase.from("invoices").select("id, invoice_no, date, total_amount, balance, status").eq("customer_id", id),
      supabase.from("payments").select("id, payment_no, payment_date, amount_paid, payment_mode").eq("customer_id", id)
    ]);
    
    return {
      data: {
        purchases: poRes.data || [],
        sales: soRes.data || [],
        invoices: invRes.data || [],
        payments: payRes.data || []
      },
      error: null
    };
  } catch (error: any) {
    console.error("Fetch contact transactions error:", error);
    return { data: null, error: error.message };
  }
}
