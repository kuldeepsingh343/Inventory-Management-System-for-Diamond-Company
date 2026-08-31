"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile, UserPermissions } from "@/lib/types/database";

export function usePermissions() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (data) {
          setProfile(data as Profile);
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const isAdmin = profile?.role === "admin";

  const can = (
    module: keyof UserPermissions,
    action: keyof UserPermissions[keyof UserPermissions]
  ): boolean => {
    if (isAdmin) return true;
    if (!profile?.permissions) return false;
    const modulePerms = profile.permissions[module];
    if (!modulePerms) return false;
    return modulePerms[action] === true;
  };

  const canDelete = (module: keyof UserPermissions): boolean => {
    // Only admins can delete — enforced at both UI and RLS level
    return isAdmin;
  };

  return {
    profile,
    loading,
    isAdmin,
    can,
    canDelete,
    permissions: profile?.permissions || null,
  };
}
