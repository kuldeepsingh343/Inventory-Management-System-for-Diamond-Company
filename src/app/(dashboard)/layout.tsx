"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types/database";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

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
    };

    fetchProfile();
  }, []);

  return (
    <TooltipProvider delay={0}>
      <div className="min-h-screen bg-background">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          userRole={profile?.role}
        />
        <div
          className={cn(
            "transition-sidebar min-h-screen",
            collapsed ? "ml-[68px]" : "ml-[240px]"
          )}
        >
          <Topbar profile={profile} />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
