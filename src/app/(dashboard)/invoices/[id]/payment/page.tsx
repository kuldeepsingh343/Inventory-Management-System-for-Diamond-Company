"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInvoice, addPayment } from "@/lib/actions/sales";
import type { PaymentFormData } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2, DollarSign } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/permission-guard";

export default function RecordPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<Partial<PaymentFormData>>({
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: "bank_transfer",
    payment_type: "customer_payment",
    amount_paid: 0,
    deposit_to: "main_account",
    reference_no: "",
    internal_notes: ""
  });

  useEffect(() => {
    async function load() {
      const res = await getInvoice(id);
      if (res.data) {
        setData(res.data);
        setFormData(prev => ({
          ...prev,
          invoice_id: id,
          customer_id: res.data.invoice.customer_id,
          branch: res.data.invoice.branch,
          amount_paid: res.data.invoice.balance // Default to full balance
        }));
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount_paid || formData.amount_paid <= 0) {
      return toast.error("Please enter a valid payment amount");
    }
    if (formData.amount_paid > data.invoice.balance) {
      return toast.error("Payment amount cannot exceed the remaining balance");
    }

    setSubmitting(true);
    const { error } = await addPayment(formData as PaymentFormData);
    setSubmitting(false);

    if (error) {
      toast.error("Failed to record payment", { description: error });
    } else {
      toast.success("Payment recorded successfully");
      router.push(`/invoices/${id}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (loading) return <div className="flex p-12 justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!data?.invoice) return <div className="p-12 text-center text-muted-foreground">Invoice not found.</div>;

  const { invoice } = data;

  return (
    <PermissionGuard module="sales" action="update" fallback={<div>You don't have permission to record payments.</div>}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/invoices/${id}`}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Record Payment</h1>
            <p className="text-muted-foreground mt-1">Invoice {invoice.invoice_no} • {invoice.customer?.company_name}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>
              Balance Due: <span className="font-bold text-foreground">{formatCurrency(invoice.balance)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Amount Received ($) *</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    max={invoice.balance}
                    required
                    value={formData.amount_paid}
                    onChange={(e) => setFormData({...formData, amount_paid: Number(e.target.value)})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Payment Date *</Label>
                  <Input 
                    type="date"
                    required
                    value={formData.payment_date}
                    onChange={(e) => setFormData({...formData, payment_date: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Payment Mode *</Label>
                  <Select 
                    value={formData.payment_mode} 
                    onValueChange={(val: any) => setFormData({...formData, payment_mode: val})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer / Wire</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Reference Number</Label>
                  <Input 
                    placeholder="Check #, Transaction ID..."
                    value={formData.reference_no || ""}
                    onChange={(e) => setFormData({...formData, reference_no: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Deposit To</Label>
                  <Input 
                    placeholder="Account Name"
                    value={formData.deposit_to || ""}
                    onChange={(e) => setFormData({...formData, deposit_to: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea 
                  placeholder="Optional notes about this payment..."
                  value={formData.internal_notes || ""}
                  onChange={(e) => setFormData({...formData, internal_notes: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" asChild>
                  <Link href={`/invoices/${id}`}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <DollarSign className="w-4 h-4 mr-2" />
                  Save Payment
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
