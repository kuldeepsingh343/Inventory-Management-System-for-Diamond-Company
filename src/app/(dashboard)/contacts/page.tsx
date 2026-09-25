"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { getContacts, addContact } from "@/lib/actions/contacts";
import type { Contact, ContactFormData } from "@/lib/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Search, Plus, Loader2 } from "lucide-react";
import { ExportButton } from "@/components/export-button";
import { ContactTypeBadge } from "@/components/status-badge";
import { ContactForm } from "@/components/contact-form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter, useSearchParams } from "next/navigation";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { toast } from "sonner";

export default function ContactsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading contacts...</div>}>
      <ContactsPageInner />
    </Suspense>
  );
}

function ContactsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeFromUrl = searchParams.get("type");
  const typeFilter =
    typeFromUrl === "customer" || typeFromUrl === "vendor" || typeFromUrl === "customer_vendor"
      ? typeFromUrl
      : "all";
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { can } = usePermissions();
  const canCreate = can("contacts", "create");

  const loadContacts = useCallback(async () => {
    setLoading(true);
    const { data } = await getContacts(search, typeFilter);
    if (data) setContacts(data);
    setLoading(false);
  }, [search, typeFilter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadContacts();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [loadContacts]);

  const handleAddSubmit = async (formData: ContactFormData) => {
    setIsSubmitting(true);
    const { error } = await addContact(formData);
    setIsSubmitting(false);
    
    if (error) {
      toast.error("Failed to create contact", { description: error });
    } else {
      toast.success("Contact created successfully");
      setIsAddOpen(false);
      loadContacts();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
        <div className="flex items-center gap-2">
          <ExportButton data={contacts as unknown as Record<string, unknown>[]} filename="contacts" sheetName="Contacts" />
          {canCreate && (
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          )}
        </div>
      </div>

      <Tabs
        value={typeFilter}
        onValueChange={(value) => {
          const params = new URLSearchParams(searchParams.toString());
          if (value === "all") params.delete("type");
          else params.set("type", value);
          const qs = params.toString();
          router.replace(qs ? `/contacts?${qs}` : "/contacts");
        }}
      >
        <TabsList>
          <TabsTrigger value="all">All Contacts</TabsTrigger>
          <TabsTrigger value="customer">Customers</TabsTrigger>
          <TabsTrigger value="vendor">Vendors</TabsTrigger>
          <TabsTrigger value="customer_vendor">Both</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="py-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, company, or email..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No contacts found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts.map((contact) => (
                    <TableRow 
                      key={contact.id} 
                      className="table-row-hover cursor-pointer"
                      onClick={() => router.push(`/contacts/${contact.id}`)}
                    >
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>{contact.company_name}</TableCell>
                      <TableCell>
                        <ContactTypeBadge type={contact.type} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{contact.email}</TableCell>
                      <TableCell className="text-muted-foreground">{contact.phone}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Create a new customer, vendor, or general contact.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ContactForm 
              onSubmit={handleAddSubmit} 
              onCancel={() => setIsAddOpen(false)} 
              loading={isSubmitting}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
