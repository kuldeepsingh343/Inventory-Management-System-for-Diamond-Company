"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getProfiles() {
  try {
    const supabase = await createClient();
    
    // Check if current user is admin
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Not authenticated");
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.user.id)
      .single();
      
    if (profile?.role !== 'admin') {
      throw new Error("Unauthorized. Admin access required.");
    }
    
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error: any) {
    console.error("Fetch profiles error:", error);
    return { data: null, error: error.message };
  }
}

export async function updatePermissions(userId: string, permissions: any) {
  try {
    const supabase = await createClient();
    
    // Verify admin
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Not authenticated");
    
    const { data: currentUserProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.user.id)
      .single();
      
    if (currentUserProfile?.role !== 'admin') {
      throw new Error("Unauthorized. Admin access required.");
    }
    
    // Check if target user is superadmin (don't allow removing admin role if they are the only one)
    // For now, just update the json
    
    const { data, error } = await supabase
      .from("profiles")
      .update({ permissions })
      .eq("id", userId)
      .select()
      .single();
      
    if (error) throw error;
    
    revalidatePath("/settings");
    return { data, error: null };
  } catch (error: any) {
    console.error("Update permissions error:", error);
    return { data: null, error: error.message };
  }
}
