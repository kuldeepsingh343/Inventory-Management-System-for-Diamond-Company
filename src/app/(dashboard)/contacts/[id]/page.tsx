"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getContact, getContactTransactions, updateContact } from "@/lib/actions/contacts";
import type { Contact, ContactFormData } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Edit, Building, Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ContactTypeBadge, OrderStatusBadge, InvoiceStatusBadge } from "@/components/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContactForm } from "@/components/contact-form";
import { usePermissions } from "@/lib/hooks/use-permissions";

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [contact, setContact] = useState<Contact | null>(null);
  const [transactions, setTransactions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { can } = usePermissions();
  const canUpdate = can("contacts", "update");

  useEffect(() => {
    async function load() {
      const [{ data: cData }, { data: tData }] = await Promise.all([
        getContact(id),
        getContactTransactions(id)
      ]);
      if (cData) setContact(cData);
      if (tData) setTransactions(tData);
      setLoading(false);
    }
    load();
  }, [id]);

  const handleEditSubmit = async (formData: ContactFormData) => {
    setIsSubmitting(true);
    const { data, error } = await updateContact(id, formData);
    setIsSubmitting(false);
    
    if (error) {
      toast.error("Failed to update contact", { description: error });
    } else if (data) {
      toast.success("Contact updated successfully");
      setContact(data as Contact);
      setIsEditOpen(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Contact not found.
      </div>
    );
  }

  // Combine and sort all transactions chronologically for the ledger view
  const allTransactions = [
    ...(transactions?.purchases || []).map((t: any) => ({ ...t, kind: 'Purchase', dateObj: new Date(t.date) })),
    ...(transactions?.sales || []).map((t: any) => ({ ...t, kind: 'Sale', dateObj: new Date(t.date) })),
    ...(transactions?.invoices || []).map((t: any) => ({ ...t, kind: 'Invoice', dateObj: new Date(t.date) })),
    ...(transactions?.payments || []).map((t: any) => ({ ...t, kind: 'Payment', dateObj: new Date(t.payment_date), date: t.payment_date }))
  ].sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contacts">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{contact.name}</h1>
            <p className="text-muted-foreground">{contact.company_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canUpdate && (
            <Button onClick={() => setIsEditOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Contact
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overview Panel */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="pb-4 border-b">
                <ContactTypeBadge type={contact.type} />
              </div>
              
              <div className="space-y-3">
                {contact.company_name && (
                  <div className="flex items-start gap-3 text-sm">
                    <Building className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Company</p>
                      <p className="text-muted-foreground">{contact.company_name}</p>
                    </div>
                  </div>
                )}
                
                {contact.email && (
                  <div className="flex items-start gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Email</p>
                      <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  </div>
                )}
                
                {contact.phone && (
                  <div className="flex items-start gap-3 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Phone</p>
                      <a href={`tel:${contact.phone}`} className="text-muted-foreground hover:text-foreground">
                        {contact.phone}
                      </a>
                    </div>
                  </div>
                )}
                
                {(contact.address || contact.city || contact.country) && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Address</p>
                      <p className="text-muted-foreground">
                        {contact.address}<br />
                        {[contact.city, contact.state, contact.zip_code].filter(Boolean).join(", ")}<br />
                        {contact.country}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {contact.tax_id && (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium">Tax ID / VAT No.</p>
                  <p className="text-sm text-muted-foreground">{contact.tax_id}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Details & Transactions */}
        <div className="md:col-span-2">
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="details">Additional Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="transactions" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allTransactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No transactions recorded for this contact.
                            </TableCell>
                          </TableRow>
                        ) : (
                          allTransactions.map((tx: any, i) => (
                            <TableRow key={`${tx.kind}-${tx.id}-${i}`}>
                              <TableCell>{tx.date}</TableCell>
                              <TableCell className="font-medium text-muted-foreground">{tx.kind}</TableCell>
                              <TableCell>{tx.order_no || tx.invoice_no || tx.payment_no}</TableCell>
                              <TableCell>
                                {tx.kind === 'Invoice' ? (
                                  <InvoiceStatusBadge status={tx.status} />
                                ) : tx.status ? (
                                  <OrderStatusBadge status={tx.status} />
                                ) : null}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(Number(tx.total_amount || tx.amount_paid))}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="details" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Notes & Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Internal Notes</h3>
                    <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap">
                      {contact.notes || <span className="text-muted-foreground italic">No notes added.</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">Added On</p>
                      <p>{new Date(contact.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Last Updated</p>
                      <p>{new Date(contact.updated_at).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <ContactForm 
              initialData={contact}
              onSubmit={handleEditSubmit} 
              onCancel={() => setIsEditOpen(false)} 
              loading={isSubmitting}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
