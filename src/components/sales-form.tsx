"use client";

import { useState, useEffect } from "react";
import type { SalesOrderFormData, SalesOrderItemFormData, Contact } from "@/lib/types/database";
import { getContacts } from "@/lib/actions/contacts";
import { getStock } from "@/lib/actions/stock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Loader2 } from "lucide-react";

interface SalesFormProps {
  onSubmit: (data: SalesOrderFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const emptyItem: SalesOrderItemFormData = {
  sku: "",
  product_name: "",
  pcs: 1,
  qty: 1,
  rate: 0,
  tax_pct: 0,
  notes: ""
};

export function SalesForm({ onSubmit, onCancel, loading }: SalesFormProps) {
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  
  const [formData, setFormData] = useState<SalesOrderFormData>({
    customer_id: "",
    branch: "",
    salesperson: "",
    payment_terms: "Net 30",
    date: new Date().toISOString().split('T')[0],
    notes: "",
    items: [{ ...emptyItem }]
  });

  useEffect(() => {
    async function init() {
      const [cRes, pRes] = await Promise.all([
        getContacts(),
        getStock()
      ]);
      if (cRes.data) {
        const allCustomers = cRes.data.filter(
          c => c.type === 'customer' || c.type === 'customer_vendor'
        );
        setCustomers(allCustomers);
      }
      if (pRes.data) setProducts(pRes.data);
      setFetching(false);
    }
    init();
  }, []);

  const handleItemChange = (index: number, field: keyof SalesOrderItemFormData, value: any) => {
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
    let totalTax = 0;

    formData.items.forEach(item => {
      const amount = item.qty * item.rate;
      const tax = amount * (item.tax_pct / 100);
      
      subtotal += amount;
      totalTax += tax;
    });

    return {
      subtotal,
      totalTax,
      grandTotal: subtotal + totalTax
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
          <CardTitle>Sales Memo Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select 
                value={formData.customer_id || ""} 
                onValueChange={(val) => setFormData({...formData, customer_id: val || ""})}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</SelectItem>
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
              <Label>Salesperson</Label>
              <Input 
                value={formData.salesperson} 
                onChange={(e) => setFormData({...formData, salesperson: e.target.value})} 
                placeholder="Sales Rep Name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Select 
                value={formData.payment_terms} 
                onValueChange={(val) => setFormData({...formData, payment_terms: val || "Net 30"})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                  <SelectItem value="Net 15">Net 15</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                </SelectContent>
              </Select>
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
                <TableHead className="w-24">Tax %</TableHead>
                <TableHead className="w-32 text-right">Amount</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formData.items.map((item, index) => {
                const amount = (item.qty * item.rate) * (1 + item.tax_pct / 100);
                
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
                        value={item.tax_pct}
                        onChange={(e) => handleItemChange(index, 'tax_pct', Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell className="text-right align-middle">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}
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
                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Tax:</span>
                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totals.totalTax)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-3 border-t">
                <span>Grand Total:</span>
                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totals.grandTotal)}</span>
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
        <Button type="submit" disabled={loading || !formData.customer_id}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Create Sales Memo
        </Button>
      </div>
    </form>
  );
}
