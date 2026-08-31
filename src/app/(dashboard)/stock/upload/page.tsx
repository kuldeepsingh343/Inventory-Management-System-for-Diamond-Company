"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addStockBulk, addStock } from "@/lib/actions/stock";
import type { ProductFormData } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/permission-guard";

export default function UploadStockPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Single form state
  const [formData, setFormData] = useState<ProductFormData>({
    sku: "",
    name: "",
    category: "General",
    sub_category: "",
    pcs: 0,
    qty: 0,
    rate: 0,
    description: ""
  });

  // Bulk form state
  const [parsedData, setParsedData] = useState<any[]>([]);

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await addStock(formData);
    
    setLoading(false);
    if (error) {
      toast.error("Failed to add stock", { description: error });
    } else {
      toast.success("Stock added successfully");
      router.push("/stock");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const bstr = event.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      setParsedData(data);
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkSubmit = async () => {
    if (parsedData.length === 0) return;
    
    setLoading(true);
    
    try {
      const mappedData: ProductFormData[] = parsedData.map((row: any) => ({
        sku: row.sku || row.SKU || "",
        name: row.name || row.Name || "",
        category: row.category || row.Category || "General",
        sub_category: row.sub_category || row.SubCategory || "",
        pcs: Number(row.pcs || row.Pcs || 0),
        qty: Number(row.qty || row.Qty || row.Carat || 0),
        rate: Number(row.rate || row.Rate || 0),
        description: row.description || row.Description || ""
      })).filter(row => row.sku && row.name); // Basic validation
      
      if (mappedData.length === 0) {
        toast.error("No valid data found. Ensure 'sku' and 'name' columns exist.");
        setLoading(false);
        return;
      }
      
      const { error } = await addStockBulk(mappedData);
      
      if (error) {
        toast.error("Bulk upload failed", { description: error });
      } else {
        toast.success(`Successfully uploaded ${mappedData.length} items`);
        router.push("/stock");
      }
    } catch (err: any) {
      toast.error("Error processing file", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PermissionGuard module="stock" action="create" fallback={<div>You don't have permission to add stock.</div>}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" render={<Link href="/stock" />}>
              <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Add Stock</h1>
        </div>

        <Tabs defaultValue="single">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="single">Single Item</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="single" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Manual Entry</CardTitle>
                <CardDescription>Add a single diamond stock item manually.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSingleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU *</Label>
                      <Input 
                        id="sku" 
                        required 
                        value={formData.sku}
                        onChange={(e) => setFormData({...formData, sku: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input 
                        id="name" 
                        required 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input 
                        id="category" 
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sub_category">Sub Category</Label>
                      <Input 
                        id="sub_category" 
                        value={formData.sub_category || ""}
                        onChange={(e) => setFormData({...formData, sub_category: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pcs">Pieces</Label>
                      <Input 
                        id="pcs" 
                        type="number" 
                        min="0"
                        value={formData.pcs}
                        onChange={(e) => setFormData({...formData, pcs: Number(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qty">Qty / Carat *</Label>
                      <Input 
                        id="qty" 
                        type="number" 
                        step="0.001" 
                        min="0"
                        required
                        value={formData.qty}
                        onChange={(e) => setFormData({...formData, qty: Number(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rate">Rate *</Label>
                      <Input 
                        id="rate" 
                        type="number" 
                        step="0.01" 
                        min="0"
                        required
                        value={formData.rate}
                        onChange={(e) => setFormData({...formData, rate: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Item
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="bulk" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Excel/CSV Upload</CardTitle>
                <CardDescription>Upload an Excel or CSV file to import multiple stock items at once.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
                  <div className="rounded-full bg-primary/10 p-3 mb-4">
                    <FileSpreadsheet className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Click to upload file</h3>
                  <p className="text-sm text-muted-foreground mb-4">Supports .xlsx, .xls, .csv</p>
                  
                  <Input 
                    id="file-upload" 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    className="max-w-xs"
                    onChange={handleFileUpload}
                  />
                  
                  <p className="text-xs text-muted-foreground mt-4">
                    Required columns: sku, name, qty, rate
                  </p>
                </div>
                
                {parsedData.length > 0 && (
                  <div className="space-y-4">
                    <div className="text-sm font-medium">
                      Found {parsedData.length} rows to import.
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleBulkSubmit} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Upload className="mr-2 h-4 w-4" />
                        Import {parsedData.length} Items
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
