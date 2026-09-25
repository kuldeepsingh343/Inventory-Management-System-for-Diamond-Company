"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { UserRole, UserPermissions } from "@/lib/types/database";

// Default permissions for new users
const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  stock: { read: true, create: true, update: true, delete: false },
  purchases: { read: true, create: true, update: true, delete: false },
  sales: { read: true, create: true, update: true, delete: false },
  contacts: { read: true, create: true, update: true, delete: false },
  settings: { read: false, create: false, update: false, delete: false },
};

// Full permissions for admins
const ADMIN_PERMISSIONS: UserPermissions = {
  stock: { read: true, create: true, update: true, delete: true },
  purchases: { read: true, create: true, update: true, delete: true },
  sales: { read: true, create: true, update: true, delete: true },
  contacts: { read: true, create: true, update: true, delete: true },
  settings: { read: true, create: true, update: true, delete: true },
};

// -------------------------
// Helper: get current user profile
// -------------------------
async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.user.id)
    .single();
  return data;
}

// -------------------------
// Get all profiles (admin/super_admin only)
// -------------------------
export async function getProfiles() {
  try {
    const supabase = await createClient();
    const me = await getCurrentProfile();
    if (!me || (me.role !== "admin" && me.role !== "super_admin")) {
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

// -------------------------
// Create a new user
// -------------------------
export async function createUser({
  email,
  password,
  full_name,
  role,
}: {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}) {
  try {
    const me = await getCurrentProfile();
    if (!me || (me.role !== "admin" && me.role !== "super_admin")) {
      throw new Error("Unauthorized. Admin access required.");
    }

    // Admins can only create standard users; super_admin can create any role
    if (me.role === "admin" && (role === "admin" || role === "super_admin")) {
      throw new Error("Admins can only create standard users.");
    }

    // Use service role key if available (bypasses email confirmation)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    if (!serviceRoleKey) {
      throw new Error(
        "User creation requires SUPABASE_SERVICE_ROLE_KEY on the server. Sign-up fallback is disabled because it would replace the current admin session."
      );
    }

    const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: newUser, error: createError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

    if (createError) throw createError;

    const permissions =
      role === "admin" || role === "super_admin"
        ? ADMIN_PERMISSIONS
        : DEFAULT_USER_PERMISSIONS;

    const { error: profileError } = await adminSupabase
      .from("profiles")
      .upsert({
        id: newUser.user!.id,
        email,
        full_name,
        role,
        permissions,
      });

    if (profileError) throw profileError;

    revalidatePath("/settings");
    return { error: null };
  } catch (error: any) {
    console.error("Create user error:", error);
    return { error: error.message };
  }
}

// -------------------------
// Update a user's role
// -------------------------
export async function updateUserRole(userId: string, newRole: UserRole) {
  try {
    const supabase = await createClient();
    const me = await getCurrentProfile();

    if (!me || (me.role !== "admin" && me.role !== "super_admin")) {
      throw new Error("Unauthorized. Admin access required.");
    }

    // Cannot change own role
    if (me.id === userId) {
      throw new Error("You cannot change your own role.");
    }

    // Get target user's current role
    const { data: target } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!target) throw new Error("User not found.");

    // Admins cannot manage other admins or super_admins
    if (
      me.role === "admin" &&
      (target.role === "admin" ||
        target.role === "super_admin" ||
        newRole === "admin" ||
        newRole === "super_admin")
    ) {
      throw new Error("Admins cannot promote or manage admin-level users.");
    }

    // Prevent removing last super_admin
    if (target.role === "super_admin" && newRole !== "super_admin") {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "super_admin");
      if ((count ?? 0) <= 1) {
        throw new Error(
          "Cannot demote the last Super Admin. Promote another user first."
        );
      }
    }

    const permissions =
      newRole === "admin" || newRole === "super_admin"
        ? ADMIN_PERMISSIONS
        : DEFAULT_USER_PERMISSIONS;

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole, permissions })
      .eq("id", userId);

    if (error) throw error;

    revalidatePath("/settings");
    return { error: null };
  } catch (error: any) {
    console.error("Update role error:", error);
    return { error: error.message };
  }
}

// -------------------------
// Update a user's module permissions
// -------------------------
export async function updatePermissions(userId: string, permissions: any) {
  try {
    const supabase = await createClient();
    const me = await getCurrentProfile();

    if (!me || (me.role !== "admin" && me.role !== "super_admin")) {
      throw new Error("Unauthorized. Admin access required.");
    }

    // Get target user's role
    const { data: target } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!target) throw new Error("User not found.");

    // Admins cannot touch admin/super_admin permissions
    if (
      me.role === "admin" &&
      (target.role === "admin" || target.role === "super_admin")
    ) {
      throw new Error("Admins cannot modify permissions of admin-level users.");
    }

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

// -------------------------
// Delete a user (super_admin only)
// -------------------------
export async function deleteUser(userId: string) {
  try {
    const me = await getCurrentProfile();

    if (!me || me.role !== "super_admin") {
      throw new Error("Unauthorized. Super Admin access required.");
    }

    if (me.id === userId) {
      throw new Error("You cannot delete your own account.");
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    if (serviceRoleKey) {
      const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = await adminSupabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    } else {
      // Fallback: just delete profile (auth user stays but can't login to app data)
      const supabase = await createClient();
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);
      if (error) throw error;
    }

    revalidatePath("/settings");
    return { error: null };
  } catch (error: any) {
    console.error("Delete user error:", error);
    return { error: error.message };
  }
}
