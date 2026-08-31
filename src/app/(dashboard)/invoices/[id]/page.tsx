"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInvoice } from "@/lib/actions/sales";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, DollarSign } from "lucide-react";
import Link from "next/link";
import { InvoiceStatusBadge } from "@/components/status-badge";
import { usePermissions } from "@/lib/hooks/use-permissions";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { can } = usePermissions();
  const canUpdate = can("sales", "update");

  useEffect(() => {
    async function load() {
      const res = await getInvoice(id);
      if (res.data) setData(res.data);
      setLoading(false);
    }
    load();
  }, [id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (loading) return <div className="flex p-12 justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!data?.invoice) return <div className="p-12 text-center text-muted-foreground">Invoice not found.</div>;

  const { invoice, items, payments } = data;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/invoices">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{invoice.invoice_no}</h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-muted-foreground mt-1">
              {new Date(invoice.date).toLocaleDateString()} • {invoice.customer?.company_name || invoice.customer?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canUpdate && invoice.balance > 0 && invoice.status !== 'cancelled' && (
            <Button asChild>
              <Link href={`/invoices/${id}/payment`}>
                <DollarSign className="w-4 h-4 mr-2" />
                Record Payment
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Pcs</TableHead>
                    <TableHead className="text-right">Qty/Carat</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.sku || item.product_name}</div>
                        {item.sku && <div className="text-xs text-muted-foreground">{item.product_name}</div>}
                      </TableCell>
                      <TableCell className="text-right">{item.pcs}</TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {payments && payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment #</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{payment.payment_no}</TableCell>
                        <TableCell className="capitalize">{payment.payment_mode}</TableCell>
                        <TableCell>{payment.reference_no || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(payment.amount_paid)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax:</span>
                <span>{formatCurrency(invoice.total_tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-3 border-t">
                <span>Total Amount:</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
              
              <div className="pt-4 mt-4 border-t space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="text-green-600 font-medium">{formatCurrency(invoice.amount_paid)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold">
                  <span>Balance Due:</span>
                  <span className={invoice.balance > 0 ? "text-red-500" : "text-green-500"}>
                    {formatCurrency(invoice.balance)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="font-medium">Original Order: </span>
                <span className="text-muted-foreground">
                  <Link href={`/sales/${invoice.so_id}`} className="hover:underline text-primary">
                    View Sales Memo
                  </Link>
                </span>
              </div>
              {invoice.branch && (
                <div>
                  <span className="font-medium">Branch: </span>
                  <span className="text-muted-foreground">{invoice.branch}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
