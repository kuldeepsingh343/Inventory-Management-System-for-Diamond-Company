"use client";

import { useState, useEffect } from "react";
import { getStock, getCategories } from "@/lib/actions/stock";
import type { Product } from "@/lib/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, SlidersHorizontal, Loader2 } from "lucide-react";
import { ExportButton } from "@/components/export-button";
import Link from "next/link";
import { usePermissions } from "@/lib/hooks/use-permissions";

export default function StockPage() {
  const [stock, setStock] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  const { can } = usePermissions();
  const canCreate = can("stock", "create");
  const canUpdate = can("stock", "update");

  useEffect(() => {
    async function loadCategories() {
      const { data } = await getCategories();
      if (data) setCategories(data);
    }
    loadCategories();
  }, []);

  useEffect(() => {
    async function loadStock() {
      setLoading(true);
      const { data } = await getStock(search, selectedCategory);
      if (data) setStock(data);
      setLoading(false);
    }

    const delayDebounceFn = setTimeout(() => {
      loadStock();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, selectedCategory]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Stock Inventory</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButton data={stock as unknown as Record<string, unknown>[]} filename="diamond_stock" sheetName="Stock" />
          {canUpdate && (
            <Button variant="secondary" render={<Link href="/stock/adjust" />}>
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Adjust Stock
            </Button>
          )}
          {canCreate && (
            <Button render={<Link href="/stock/upload" />}>
                <Plus className="w-4 h-4 mr-2" />
                Upload Stock
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex w-full sm:w-auto items-center gap-2">
              <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val || "")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search SKU or Name..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Pcs</TableHead>
                  <TableHead className="text-right">Carat/Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : stock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No stock found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  stock.map((item) => (
                    <TableRow key={item.id} className="table-row-hover cursor-pointer">
                      <TableCell className="font-medium">{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right">{item.pcs}</TableCell>
                      <TableCell className="text-right">{Number(item.qty).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.rate))}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(Number(item.total_value))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
