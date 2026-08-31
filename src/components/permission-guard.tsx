"use client";

import { usePermissions } from "@/lib/hooks/use-permissions";
import type { UserPermissions } from "@/lib/types/database";

interface PermissionGuardProps {
  module: keyof UserPermissions;
  action: keyof UserPermissions[keyof UserPermissions];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  module,
  action,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { can, loading } = usePermissions();

  if (loading) return null;
  if (!can(module, action)) return <>{fallback}</>;
  return <>{children}</>;
}
