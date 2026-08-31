"use client";

import { useState } from "react";
import type { ContactFormData, ContactType } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface ContactFormProps {
  initialData?: Partial<ContactFormData>;
  onSubmit: (data: ContactFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ContactForm({ initialData, onSubmit, onCancel, loading }: ContactFormProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: initialData?.name || "",
    company_name: initialData?.company_name || "",
    type: initialData?.type || "contact",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    address: initialData?.address || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    country: initialData?.country || "",
    zip_code: initialData?.zip_code || "",
    tax_id: initialData?.tax_id || "",
    notes: initialData?.notes || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Contact Name *</Label>
          <Input 
            id="name" 
            required 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company_name">Company Name</Label>
          <Input 
            id="company_name" 
            value={formData.company_name || ""}
            onChange={(e) => setFormData({...formData, company_name: e.target.value})}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Contact Type *</Label>
          <Select 
            value={formData.type} 
            onValueChange={(val: any) => setFormData({...formData, type: val as ContactType})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
              <SelectItem value="customer_vendor">Customer & Vendor</SelectItem>
              <SelectItem value="contact">Other Contact</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email"
            value={formData.email || ""}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input 
            id="phone" 
            value={formData.phone || ""}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="tax_id">Tax ID / VAT No.</Label>
          <Input 
            id="tax_id" 
            value={formData.tax_id || ""}
            onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input 
          id="address" 
          value={formData.address || ""}
          onChange={(e) => setFormData({...formData, address: e.target.value})}
        />
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input 
            id="city" 
            value={formData.city || ""}
            onChange={(e) => setFormData({...formData, city: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State/Region</Label>
          <Input 
            id="state" 
            value={formData.state || ""}
            onChange={(e) => setFormData({...formData, state: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip_code">ZIP Code</Label>
          <Input 
            id="zip_code" 
            value={formData.zip_code || ""}
            onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input 
            id="country" 
            value={formData.country || ""}
            onChange={(e) => setFormData({...formData, country: e.target.value})}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea 
          id="notes" 
          value={formData.notes || ""}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          rows={3}
        />
      </div>

      <div className="pt-4 flex justify-end gap-2 border-t border-border mt-6">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Contact
        </Button>
      </div>
    </form>
  );
}
