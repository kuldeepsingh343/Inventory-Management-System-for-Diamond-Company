"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSalesOrder, convertToInvoice } from "@/lib/actions/sales";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, FileText, Undo2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { OrderStatusBadge } from "@/components/status-badge";
import { usePermissions } from "@/lib/hooks/use-permissions";

export default function SalesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  const { can } = usePermissions();
  const canUpdate = can("sales", "update");

  useEffect(() => {
    async function load() {
      const res = await getSalesOrder(id);
      if (res.data) setData(res.data);
      setLoading(false);
    }
    load();
  }, [id]);

  const handleConvert = async () => {
    if (!confirm("Are you sure you want to convert this Memo into an Invoice? This action cannot be undone.")) return;
    
    setConverting(true);
    const { error, data: inv } = await convertToInvoice(id);
    setConverting(false);
    
    if (error) {
      toast.error("Failed to convert", { description: error });
    } else {
      toast.success("Memo successfully converted to Invoice");
      // Redirect to new invoice
      router.push(`/invoices/${inv.id}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (loading) return <div className="flex p-12 justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!data?.so) return <div className="p-12 text-center text-muted-foreground">Order not found.</div>;

  const { so, items } = data;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/sales">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{so.order_no}</h1>
              <OrderStatusBadge status={so.status} />
              <span className={`text-xs font-medium px-2 py-1 rounded-full bg-zinc-100 text-zinc-700`}>
                Sales Memo
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              {new Date(so.date).toLocaleDateString()} • {so.customer?.company_name || so.customer?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canUpdate && so.status === 'active' && (
            <Button onClick={handleConvert} disabled={converting}>
              {converting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <FileText className="w-4 h-4 mr-2" />
              Convert to Invoice
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
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

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(so.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax:</span>
                <span>{formatCurrency(so.total_tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-3 border-t">
                <span>Total:</span>
                <span>{formatCurrency(so.total_amount)}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="font-medium">Salesperson: </span>
                <span className="text-muted-foreground">{so.salesperson || '-'}</span>
              </div>
              <div>
                <span className="font-medium">Payment Terms: </span>
                <span className="text-muted-foreground">{so.payment_terms || '-'}</span>
              </div>
              {so.branch && (
                <div>
                  <span className="font-medium">Branch: </span>
                  <span className="text-muted-foreground">{so.branch}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {so.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{so.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
