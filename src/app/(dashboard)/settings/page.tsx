"use client";

import { useState, useEffect } from "react";
import {
  getProfiles,
  updatePermissions,
  createUser,
  updateUserRole,
  deleteUser,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Shield,
  Loader2,
  UserCog,
  User,
  Save,
  Crown,
  UserPlus,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/lib/hooks/use-permissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRole } from "@/lib/types/database";

const MODULES = [
  { id: "stock", label: "Stock & Inventory" },
  { id: "contacts", label: "Contacts (Customers/Vendors)" },
  { id: "purchases", label: "Purchases" },
  { id: "sales", label: "Sales & Invoicing" },
  { id: "settings", label: "Settings" },
];

type RoleBadgeProps = { role: string };
function RoleBadge({ role }: RoleBadgeProps) {
  if (role === "super_admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200">
        <Crown className="w-3 h-3" />
        Super Admin
      </span>
    );
  }
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
        <Shield className="w-3 h-3" />
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
      <User className="w-3 h-3" />
      Standard User
    </span>
  );
}

export default function SettingsPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Permissions dialog
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isPermOpen, setIsPermOpen] = useState(false);
  const [currentPerms, setCurrentPerms] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Add user dialog
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "user" as UserRole,
  });
  const [addingUser, setAddingUser] = useState(false);

  // Delete confirmation
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Role update loading state
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const { isAdmin, isSuperAdmin, profile: me } = usePermissions();

  const loadProfiles = async () => {
    if (isAdmin) {
      const { data } = await getProfiles();
      if (data) setProfiles(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isAdmin) {
        const { data } = await getProfiles();
        if (!cancelled && data) setProfiles(data);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // ---- Permissions dialog ----
  const openPermModal = (user: any) => {
    setSelectedUser(user);
    setCurrentPerms(user.permissions || {});
    setIsPermOpen(true);
  };

  const handleToggle = (module: string, action: string, checked: boolean) => {
    setCurrentPerms((prev: any) => ({
      ...prev,
      [module]: {
        ...(prev[module] || {}),
        [action]: checked,
      },
    }));
  };

  const handleSavePerms = async () => {
    if (!selectedUser) return;
    setSaving(true);
    const { error } = await updatePermissions(selectedUser.id, currentPerms);
    setSaving(false);
    if (error) {
      toast.error("Failed to update permissions", { description: error });
    } else {
      toast.success("Permissions updated successfully");
      setIsPermOpen(false);
      loadProfiles();
    }
  };

  // ---- Add user ----
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast.error("Please fill in all fields");
      return;
    }
    setAddingUser(true);
    const { error } = await createUser(newUser);
    setAddingUser(false);
    if (error) {
      toast.error("Failed to create user", { description: error });
    } else {
      toast.success(`User ${newUser.email} created successfully`);
      setIsAddUserOpen(false);
      setNewUser({ full_name: "", email: "", password: "", role: "user" });
      loadProfiles();
    }
  };

  // ---- Role change ----
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingRoleId(userId);
    const { error } = await updateUserRole(userId, newRole);
    setUpdatingRoleId(null);
    if (error) {
      toast.error("Failed to update role", { description: error });
    } else {
      toast.success("Role updated successfully");
      loadProfiles();
    }
  };

  // ---- Delete user ----
  const openDeleteConfirm = (userId: string) => {
    setDeletingUserId(userId);
    setConfirmDeleteOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUserId) return;
    const { error } = await deleteUser(deletingUserId);
    if (error) {
      toast.error("Failed to delete user", { description: error });
    } else {
      toast.success("User deleted successfully");
      setConfirmDeleteOpen(false);
      setDeletingUserId(null);
      loadProfiles();
    }
  };

  // ---- Can manage checks ----
  const canManageUser = (targetProfile: any) => {
    if (!me) return false;
    if (isSuperAdmin) return targetProfile.id !== me.id; // super_admin can manage anyone except self
    if (isAdmin) return targetProfile.role === "user"; // admin can only manage standard users
    return false;
  };

  const canDeleteUser = (targetProfile: any) => {
    if (!me || !isSuperAdmin) return false;
    return targetProfile.id !== me.id; // super_admin can delete anyone except self
  };

  // ---- Role options based on caller ----
  const roleOptions: { value: UserRole; label: string }[] = isSuperAdmin
    ? [
        { value: "user", label: "Standard User" },
        { value: "admin", label: "Administrator" },
        { value: "super_admin", label: "Super Administrator" },
      ]
    : [{ value: "user", label: "Standard User" }];

  if (loading)
    return (
      <div className="flex p-12 justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh]">
        <Shield className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Access Denied
        </h1>
        <p className="text-muted-foreground max-w-md">
          You do not have administrative privileges to view or manage system
          settings. Please contact an administrator if you need access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage users, roles, and application configuration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription className="mt-0.5">
                  Manage access and granular permissions for all staff members.
                </CardDescription>
              </div>
            </div>
            {/* Add User Button — visible to admin and super_admin */}
            <Button
              onClick={() => setIsAddUserOpen(true)}
              className="gap-2"
              size="sm"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => {
                  const isMe = profile.id === me?.id;
                  const canManage = canManageUser(profile);
                  const canDelete = canDeleteUser(profile);

                  return (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                            {profile.role === "super_admin" ? (
                              <Crown className="w-4 h-4 text-violet-600" />
                            ) : profile.role === "admin" ? (
                              <Shield className="w-4 h-4 text-blue-600" />
                            ) : (
                              <User className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <span className="font-medium">
                              {profile.full_name || "Unknown User"}
                            </span>
                            {isMe && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (you)
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {profile.email || "-"}
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={profile.role} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Role change dropdown — super_admin can change any non-self, admin can only manage users */}
                          {canManage && !isMe && (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                    disabled={updatingRoleId === profile.id}
                                  >
                                    {updatingRoleId === profile.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3" />
                                    )}
                                    Change Role
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end">
                                {roleOptions.map((opt) => (
                                  <DropdownMenuItem
                                    key={opt.value}
                                    disabled={profile.role === opt.value}
                                    onClick={() =>
                                      handleRoleChange(profile.id, opt.value)
                                    }
                                    className={
                                      profile.role === opt.value
                                        ? "opacity-50"
                                        : ""
                                    }
                                  >
                                    {opt.value === "super_admin" ? (
                                      <Crown className="w-4 h-4 mr-2 text-violet-600" />
                                    ) : opt.value === "admin" ? (
                                      <Shield className="w-4 h-4 mr-2 text-blue-600" />
                                    ) : (
                                      <User className="w-4 h-4 mr-2 text-muted-foreground" />
                                    )}
                                    {opt.label}
                                    {profile.role === opt.value && (
                                      <span className="ml-auto text-xs text-muted-foreground">
                                        Current
                                      </span>
                                    )}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}

                          {/* Permissions button — visible if can manage and user is standard user */}
                          {canManage && profile.role === "user" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPermModal(profile)}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              Permissions
                            </Button>
                          )}

                          {/* Delete button — super_admin only */}
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                              onClick={() => openDeleteConfirm(profile.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}

                          {/* If nothing is actionable */}
                          {!canManage && !canDelete && (
                            <span className="text-xs text-muted-foreground italic">
                              {isMe ? "Your account" : "No actions"}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ---- Add User Dialog ---- */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Add New User
            </DialogTitle>
            <DialogDescription>
              Create a new staff member account.
              {isSuperAdmin
                ? " As Super Admin, you can create admins and other super admins."
                : " You can create standard user accounts."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddUser} className="mt-2 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-full-name">Full Name</Label>
              <Input
                id="new-full-name"
                placeholder="John Smith"
                value={newUser.full_name}
                onChange={(e) =>
                  setNewUser((p) => ({ ...p, full_name: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-email">Email Address</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="john@company.com"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser((p) => ({ ...p, email: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Temporary Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="At least 8 characters"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser((p) => ({ ...p, password: e.target.value }))
                }
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-role">Role</Label>
              <div className="grid gap-2">
                {roleOptions.map((opt) => (
                  <label
                    key={opt.value}
                    htmlFor={`role-${opt.value}`}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      newUser.role === opt.value
                        ? opt.value === "super_admin"
                          ? "border-violet-400 bg-violet-50"
                          : opt.value === "admin"
                          ? "border-blue-400 bg-blue-50"
                          : "border-primary/40 bg-primary/5"
                        : "border-border hover:border-border/70"
                    }`}
                  >
                    <input
                      id={`role-${opt.value}`}
                      type="radio"
                      name="role"
                      value={opt.value}
                      checked={newUser.role === opt.value}
                      onChange={() =>
                        setNewUser((p) => ({
                          ...p,
                          role: opt.value as UserRole,
                        }))
                      }
                      className="sr-only"
                    />
                    {opt.value === "super_admin" ? (
                      <Crown className="w-4 h-4 text-violet-600 shrink-0" />
                    ) : opt.value === "admin" ? (
                      <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {opt.value === "super_admin"
                          ? "Full system control, can manage all users and create super admins"
                          : opt.value === "admin"
                          ? "Can manage standard users and access all modules"
                          : "Access controlled by permissions"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddUserOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addingUser}>
                {addingUser ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Create User
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---- Permissions Dialog ---- */}
      <Dialog open={isPermOpen} onOpenChange={setIsPermOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Edit Permissions —{" "}
              {selectedUser?.full_name || selectedUser?.email}
            </DialogTitle>
            <DialogDescription>
              Configure granular access controls for this user. Delete
              operations are enforced via Database RLS and override any
              toggle here.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            <div className="grid gap-6">
              {MODULES.map((mod) => (
                <Card key={mod.id} className="shadow-none border-muted">
                  <CardHeader className="py-3 px-4 bg-muted/30">
                    <CardTitle className="text-sm font-medium">
                      {mod.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`${mod.id}-read`}
                        checked={currentPerms[mod.id]?.read ?? false}
                        onCheckedChange={(c) => handleToggle(mod.id, "read", c)}
                      />
                      <Label htmlFor={`${mod.id}-read`} className="text-sm">
                        View (Read)
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`${mod.id}-create`}
                        checked={currentPerms[mod.id]?.create ?? false}
                        onCheckedChange={(c) =>
                          handleToggle(mod.id, "create", c)
                        }
                      />
                      <Label htmlFor={`${mod.id}-create`} className="text-sm">
                        Create
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`${mod.id}-update`}
                        checked={currentPerms[mod.id]?.update ?? false}
                        onCheckedChange={(c) =>
                          handleToggle(mod.id, "update", c)
                        }
                      />
                      <Label htmlFor={`${mod.id}-update`} className="text-sm">
                        Edit (Update)
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsPermOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePerms} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Permissions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirmation Dialog ---- */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. The user will lose
              all access to the system immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
