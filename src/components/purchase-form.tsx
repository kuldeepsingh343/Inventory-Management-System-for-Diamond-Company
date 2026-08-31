"use client";

import { useState, useEffect } from "react";
import type { PurchaseOrderFormData, PurchaseOrderItemFormData, Contact } from "@/lib/types/database";
import { getContacts } from "@/lib/actions/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { getStock } from "@/lib/actions/stock";

interface PurchaseFormProps {
  onSubmit: (data: PurchaseOrderFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const emptyItem: PurchaseOrderItemFormData = {
  sku: "",
  product_name: "",
  sub_product: "",
  pcs: 1,
  qty: 1,
  rate: 0,
  discount_pct: 0,
  tax_pct: 0,
  notes: ""
};

export function PurchaseForm({ onSubmit, onCancel, loading }: PurchaseFormProps) {
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  
  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    vendor_id: "",
    branch: "",
    shipping_address: "",
    date: new Date().toISOString().split('T')[0],
    currency: "USD",
    notes: "",
    items: [{ ...emptyItem }]
  });

  useEffect(() => {
    async function init() {
      const [vRes, pRes] = await Promise.all([
        getContacts("", "vendor"),
        getStock()
      ]);
      if (vRes.data) {
        // Include contacts that are 'vendor' or 'customer_vendor'
        const allVendors = (await getContacts()).data?.filter(
          c => c.type === 'vendor' || c.type === 'customer_vendor'
        ) || [];
        setVendors(allVendors);
      }
      if (pRes.data) setProducts(pRes.data);
      setFetching(false);
    }
    init();
  }, []);

  const handleItemChange = (index: number, field: keyof PurchaseOrderItemFormData, value: any) => {
    const newItems = [...formData.items];
    (newItems[index] as any)[field] = value;
    
    // Auto-fill from product if SKU selected
    if (field === 'sku' && value) {
      const prod = products.find(p => p.sku === value);
      if (prod) {
        newItems[index].product_id = prod.id;
        newItems[index].product_name = prod.name;
        newItems[index].rate = prod.rate || 0;
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { ...emptyItem }] });
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    formData.items.forEach(item => {
      const amount = item.qty * item.rate;
      const discount = amount * (item.discount_pct / 100);
      const discountedAmount = amount - discount;
      const tax = discountedAmount * (item.tax_pct / 100);
      
      subtotal += amount;
      totalDiscount += discount;
      totalTax += tax;
    });

    return {
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal: subtotal - totalDiscount + totalTax
    };
  };

  const totals = calculateTotals();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (fetching) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Purchase Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Vendor *</Label>
              <Select 
                value={formData.vendor_id || ""} 
                onValueChange={(val) => setFormData({...formData, vendor_id: val || ""})}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name} {v.company_name ? `(${v.company_name})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Branch</Label>
              <Input 
                value={formData.branch} 
                onChange={(e) => setFormData({...formData, branch: e.target.value})} 
                placeholder="e.g. New York HQ"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input 
                type="date"
                required
                value={formData.date} 
                onChange={(e) => setFormData({...formData, date: e.target.value})} 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select 
                value={formData.currency} 
                onValueChange={(val) => setFormData({...formData, currency: val || "USD"})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label>Shipping Address</Label>
              <Input 
                value={formData.shipping_address} 
                onChange={(e) => setFormData({...formData, shipping_address: e.target.value})} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="w-4 h-4 mr-2" /> Add Row
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Product/SKU *</TableHead>
                <TableHead className="w-24">Pcs</TableHead>
                <TableHead className="w-24">Qty/Carat *</TableHead>
                <TableHead className="w-32">Rate *</TableHead>
                <TableHead className="w-24">Disc %</TableHead>
                <TableHead className="w-24">Tax %</TableHead>
                <TableHead className="w-32 text-right">Amount</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formData.items.map((item, index) => {
                const amount = (item.qty * item.rate) * (1 - item.discount_pct / 100) * (1 + item.tax_pct / 100);
                
                return (
                  <TableRow key={index}>
                    <TableCell>
                      <Input 
                        placeholder="Name or SKU" 
                        value={item.sku || item.product_name}
                        onChange={(e) => {
                          handleItemChange(index, 'sku', e.target.value);
                          handleItemChange(index, 'product_name', e.target.value);
                        }}
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" min="0" 
                        value={item.pcs}
                        onChange={(e) => handleItemChange(index, 'pcs', Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" step="0.001" min="0" required
                        value={item.qty}
                        onChange={(e) => handleItemChange(index, 'qty', Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" step="0.01" min="0" required
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" step="0.01" min="0" max="100"
                        value={item.discount_pct}
                        onChange={(e) => handleItemChange(index, 'discount_pct', Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" step="0.01" min="0" max="100"
                        value={item.tax_pct}
                        onChange={(e) => handleItemChange(index, 'tax_pct', Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell className="text-right align-middle">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(amount)}
                    </TableCell>
                    <TableCell>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeItem(index)}
                        disabled={formData.items.length <= 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          <div className="flex justify-end mt-6">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Discount:</span>
                <span className="text-red-500">-{new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(totals.totalDiscount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Tax:</span>
                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(totals.totalTax)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-3 border-t">
                <span>Grand Total:</span>
                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(totals.grandTotal)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label>Internal Notes / Terms</Label>
        <Textarea 
          value={formData.notes} 
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Terms and conditions..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !formData.vendor_id}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Create Purchase Memo
        </Button>
      </div>
    </form>
  );
}
