"use client";

import { useState, useEffect } from "react";
import { getProfiles, updatePermissions } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, Loader2, UserCog, User, Save } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/lib/hooks/use-permissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MODULES = [
  { id: "stock", label: "Stock & Inventory" },
  { id: "contacts", label: "Contacts (Customers/Vendors)" },
  { id: "purchases", label: "Purchases" },
  { id: "sales", label: "Sales & Invoicing" },
  { id: "reports", label: "Reports" },
];

export default function SettingsPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isPermOpen, setIsPermOpen] = useState(false);
  const [currentPerms, setCurrentPerms] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const { isAdmin } = usePermissions();

  useEffect(() => {
    async function load() {
      if (isAdmin) {
        const { data } = await getProfiles();
        if (data) setProfiles(data);
      }
      setLoading(false);
    }
    load();
  }, [isAdmin]);

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
        [action]: checked
      }
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
      // Reload
      const { data } = await getProfiles();
      if (data) setProfiles(data);
    }
  };

  if (loading) return <div className="flex p-12 justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh]">
        <Shield className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h1 className="text-2xl font-bold tracking-tight mb-2">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          You do not have administrative privileges to view or manage system settings.
          Please contact an administrator if you need access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground mt-1">Manage users, roles, and application configuration.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" />
            <CardTitle>User Management</CardTitle>
          </div>
          <CardDescription>
            Manage access and granular permissions for all staff members.
          </CardDescription>
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
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{profile.full_name || 'Unknown User'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{profile.email || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        profile.role === 'admin' 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-zinc-100 text-zinc-700'
                      }`}>
                        {profile.role === 'admin' ? 'Administrator' : 'Standard User'}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openPermModal(profile)}
                        disabled={profile.role === 'admin'}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Permissions
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPermOpen} onOpenChange={setIsPermOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit User Permissions</DialogTitle>
            <DialogDescription>
              Configure granular access controls for {selectedUser?.full_name || selectedUser?.email}. 
              Note: Delete operations are completely disabled for all non-admin users via Database RLS.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-6">
            <div className="grid gap-6">
              {MODULES.map((mod) => (
                <Card key={mod.id} className="shadow-none border-muted">
                  <CardHeader className="py-3 px-4 bg-muted/30">
                    <CardTitle className="text-sm font-medium">{mod.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id={`${mod.id}-read`} 
                        checked={currentPerms[mod.id]?.read !== false} // Default true
                        onCheckedChange={(c) => handleToggle(mod.id, 'read', c)}
                      />
                      <Label htmlFor={`${mod.id}-read`} className="text-sm">View (Read)</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id={`${mod.id}-create`} 
                        checked={currentPerms[mod.id]?.create !== false} // Default true
                        onCheckedChange={(c) => handleToggle(mod.id, 'create', c)}
                      />
                      <Label htmlFor={`${mod.id}-create`} className="text-sm">Create</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id={`${mod.id}-update`} 
                        checked={currentPerms[mod.id]?.update !== false} // Default true
                        onCheckedChange={(c) => handleToggle(mod.id, 'update', c)}
                      />
                      <Label htmlFor={`${mod.id}-update`} className="text-sm">Edit (Update)</Label>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsPermOpen(false)}>Cancel</Button>
              <Button onClick={handleSavePerms} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Permissions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
