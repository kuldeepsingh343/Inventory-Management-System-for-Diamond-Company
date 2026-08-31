"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPurchaseOrder, convertToBill } from "@/lib/actions/purchases";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, FileText, Undo2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { OrderStatusBadge } from "@/components/status-badge";
import { usePermissions } from "@/lib/hooks/use-permissions";

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  const { can } = usePermissions();
  const canUpdate = can("purchases", "update");

  useEffect(() => {
    async function load() {
      const res = await getPurchaseOrder(id);
      if (res.data) setData(res.data);
      setLoading(false);
    }
    load();
  }, [id]);

  const handleConvert = async () => {
    if (!confirm("Are you sure you want to convert this Memo into a Bill? This action cannot be undone.")) return;
    
    setConverting(true);
    const { error } = await convertToBill(id);
    setConverting(false);
    
    if (error) {
      toast.error("Failed to convert", { description: error });
    } else {
      toast.success("Memo successfully converted to Bill");
      // Reload data
      const res = await getPurchaseOrder(id);
      if (res.data) setData(res.data);
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  if (loading) return <div className="flex p-12 justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!data?.po) return <div className="p-12 text-center text-muted-foreground">Order not found.</div>;

  const { po, items } = data;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/purchases">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{po.order_no}</h1>
              <OrderStatusBadge status={po.status} />
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${po.is_bill ? 'bg-indigo-100 text-indigo-700' : 'bg-zinc-100 text-zinc-700'}`}>
                {po.is_bill ? 'Purchase Bill' : 'Purchase Memo'}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              {new Date(po.date).toLocaleDateString()} • {po.vendor?.company_name || po.vendor?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canUpdate && po.status === 'active' && !po.is_bill && (
            <Button onClick={handleConvert} disabled={converting}>
              {converting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <FileText className="w-4 h-4 mr-2" />
              Convert to Bill
            </Button>
          )}
          
          {canUpdate && (po.status === 'active' || po.status === 'partially_returned' || po.status === 'billed') && (
            <Button variant="outline" asChild>
              <Link href={`/purchases/${id}/return`}>
                <Undo2 className="w-4 h-4 mr-2" />
                Return Items
              </Link>
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
                  <TableHead className="text-right">Returned</TableHead>
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
                    <TableCell className="text-right">{formatCurrency(item.rate, po.currency)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.amount, po.currency)}</TableCell>
                    <TableCell className="text-right text-red-500">
                      {item.returned_qty > 0 ? `${item.returned_qty} qty (${item.returned_pcs} pcs)` : '-'}
                    </TableCell>
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
                <span>{formatCurrency(po.subtotal, po.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount:</span>
                <span className="text-red-500">-{formatCurrency(po.total_discount, po.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax:</span>
                <span>{formatCurrency(po.total_tax, po.currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-3 border-t">
                <span>Total:</span>
                <span>{formatCurrency(po.total_amount, po.currency)}</span>
              </div>
            </CardContent>
          </Card>
          
          {(po.branch || po.shipping_address) && (
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {po.branch && (
                  <div>
                    <span className="font-medium">Branch: </span>
                    <span className="text-muted-foreground">{po.branch}</span>
                  </div>
                )}
                {po.shipping_address && (
                  <div>
                    <span className="font-medium block mb-1">Shipping Address: </span>
                    <span className="text-muted-foreground whitespace-pre-wrap">{po.shipping_address}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {po.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{po.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
