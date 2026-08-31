"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStock, adjustStock } from "@/lib/actions/stock";
import type { Product, AdjustmentReason } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/permission-guard";

export default function AdjustStockPage() {
  const router = useRouter();
  const [stock, setStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedProductId, setSelectedProductId] = useState("");
  const [pcsChange, setPcsChange] = useState<number>(0);
  const [qtyChange, setQtyChange] = useState<number>(0);
  const [reason, setReason] = useState<AdjustmentReason>("other");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await getStock();
      if (data) setStock(data);
      setLoading(false);
    }
    load();
  }, []);

  const selectedProduct = stock.find(p => p.id === selectedProductId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return toast.error("Please select a product");
    
    if (pcsChange === 0 && qtyChange === 0) {
      return toast.error("Please enter a valid change amount");
    }

    setSubmitting(true);
    
    const { error } = await adjustStock(
      selectedProductId, 
      pcsChange, 
      qtyChange, 
      reason, 
      notes
    );
    
    setSubmitting(false);
    
    if (error) {
      toast.error("Failed to adjust stock", { description: error });
    } else {
      toast.success("Stock adjusted successfully");
      router.push("/stock");
    }
  };

  return (
    <PermissionGuard module="stock" action="update" fallback={<div>You don't have permission to adjust stock.</div>}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" render={<Link href="/stock" />}>
              <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Adjust Stock</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Adjustment Form</CardTitle>
            <CardDescription>
              Record an increase or decrease in stock quantities. Use negative numbers to reduce stock.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>Select Product</Label>
                  <Select value={selectedProductId} onValueChange={(val) => setSelectedProductId(val || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Search SKU or Name..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stock.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.sku} - {item.name} (Current: {item.pcs} pcs / {Number(item.qty).toFixed(2)} qty)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProduct && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div className="space-y-2">
                      <Label>Pieces Change (+/-)</Label>
                      <Input 
                        type="number"
                        value={pcsChange}
                        onChange={(e) => setPcsChange(Number(e.target.value))}
                        placeholder="e.g. -1 or 2"
                      />
                      <p className="text-xs text-muted-foreground">
                        New total: {selectedProduct.pcs + pcsChange}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Qty/Carat Change (+/-)</Label>
                      <Input 
                        type="number"
                        step="0.001"
                        value={qtyChange}
                        onChange={(e) => setQtyChange(Number(e.target.value))}
                        placeholder="e.g. -0.5 or 1.2"
                      />
                      <p className="text-xs text-muted-foreground">
                        New total: {(Number(selectedProduct.qty) + qtyChange).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Select value={reason} onValueChange={(val: any) => setReason(val as AdjustmentReason)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="damage">Damage/Loss</SelectItem>
                        <SelectItem value="recount">Inventory Recount</SelectItem>
                        <SelectItem value="transfer">Branch Transfer</SelectItem>
                        <SelectItem value="return">Manual Return</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional explanation..."
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={submitting || !selectedProductId}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Adjustment
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
