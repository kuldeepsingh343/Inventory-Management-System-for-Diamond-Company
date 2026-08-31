"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPurchaseOrder, processPurchaseReturn } from "@/lib/actions/purchases";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Undo2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { PermissionGuard } from "@/components/permission-guard";

export default function PurchaseReturnPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [returnItems, setReturnItems] = useState<Record<string, { pcs: number, qty: number }>>({});

  useEffect(() => {
    async function load() {
      const res = await getPurchaseOrder(id);
      if (res.data) {
        setData(res.data);
        // Initialize return state
        const initialRet: any = {};
        res.data.items.forEach((item: any) => {
          initialRet[item.id] = { pcs: 0, qty: 0 };
        });
        setReturnItems(initialRet);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleReturnChange = (itemId: string, field: 'pcs' | 'qty', value: string) => {
    const num = Number(value) || 0;
    setReturnItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: num }
    }));
  };

  const calculateReturnAmount = (item: any, ret: { pcs: number, qty: number }) => {
    if (!ret.qty) return 0;
    // Calculate proportional amount including discounts/taxes
    const unitPrice = item.amount / item.qty;
    return unitPrice * ret.qty;
  };

  const handleSubmit = async () => {
    // Collect valid returns
    const returnsToProcess = data.items
      .map((item: any) => {
        const ret = returnItems[item.id];
        if (!ret || (ret.qty === 0 && ret.pcs === 0)) return null;
        
        // Validate
        const remainingQty = item.qty - item.returned_qty;
        const remainingPcs = item.pcs - item.returned_pcs;
        
        if (ret.qty > remainingQty || ret.pcs > remainingPcs) {
          toast.error(`Return quantity for ${item.product_name} exceeds remaining amount.`);
          return false;
        }
        
        return {
          poItemId: item.id,
          returnPcs: ret.pcs,
          returnQty: ret.qty,
          returnAmount: calculateReturnAmount(item, ret)
        };
      })
      .filter((i: any) => i !== null);
      
    if (returnsToProcess.includes(false)) return;
    
    if (returnsToProcess.length === 0) {
      return toast.error("Please enter return quantities for at least one item.");
    }
    
    setSubmitting(true);
    const { error } = await processPurchaseReturn(id, returnsToProcess as any[]);
    setSubmitting(false);
    
    if (error) {
      toast.error("Failed to process return", { description: error });
    } else {
      toast.success("Return processed successfully");
      router.push(`/purchases/${id}`);
    }
  };

  if (loading) return <div className="flex p-12 justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!data?.po) return <div className="p-12 text-center text-muted-foreground">Order not found.</div>;

  const { po, items } = data;

  const totalReturnAmt = items.reduce((sum: number, item: any) => {
    return sum + calculateReturnAmount(item, returnItems[item.id]);
  }, 0);

  return (
    <PermissionGuard module="purchases" action="update" fallback={<div>You don't have permission to return purchases.</div>}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/purchases/${id}`}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Return Items</h1>
            <p className="text-muted-foreground mt-1">{po.order_no} • {po.vendor?.name}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Items to Return</CardTitle>
            <CardDescription>
              Enter the quantity you wish to return for each item. You can do partial returns.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Original</TableHead>
                  <TableHead className="text-right">Already Returned</TableHead>
                  <TableHead className="text-right">Return Pcs</TableHead>
                  <TableHead className="text-right">Return Qty</TableHead>
                  <TableHead className="text-right">Return Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => {
                  const ret = returnItems[item.id];
                  const remainingQty = item.qty - item.returned_qty;
                  const remainingPcs = item.pcs - item.returned_pcs;
                  const canReturn = remainingQty > 0 || remainingPcs > 0;
                  
                  return (
                    <TableRow key={item.id} className={!canReturn ? "opacity-50 bg-muted/50" : ""}>
                      <TableCell>
                        <div className="font-medium">{item.sku || item.product_name}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.pcs} pcs<br/>
                        {item.qty} qty
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.returned_pcs} pcs<br/>
                        {item.returned_qty} qty
                      </TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          min="0" 
                          max={remainingPcs}
                          className="w-20 ml-auto"
                          value={ret?.pcs || ''}
                          onChange={(e) => handleReturnChange(item.id, 'pcs', e.target.value)}
                          disabled={!canReturn}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          step="0.001" 
                          min="0" 
                          max={remainingQty}
                          className="w-24 ml-auto"
                          value={ret?.qty || ''}
                          onChange={(e) => handleReturnChange(item.id, 'qty', e.target.value)}
                          disabled={!canReturn}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: po.currency }).format(calculateReturnAmount(item, ret))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            <div className="p-6 bg-muted/30 border-t flex items-center justify-between">
              <div className="text-lg font-bold">
                Total Return Value: <span className="text-red-500">{new Intl.NumberFormat('en-US', { style: 'currency', currency: po.currency }).format(totalReturnAmt)}</span>
              </div>
              <Button onClick={handleSubmit} disabled={submitting || totalReturnAmt === 0}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Undo2 className="w-4 h-4 mr-2" />
                Process Return
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
