"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPurchaseOrders } from "@/lib/actions/purchases";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ExportButton } from "@/components/export-button";
import { OrderStatusBadge } from "@/components/status-badge";

export default function PurchaseBillsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await getPurchaseOrders("bills");
      if (data) setOrders(data);
      setLoading(false);
    }
    load();
  }, []);

  const formatCurrency = (amount: number, currency: string = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount || 0);

  const filtered = orders.filter(
    (o) =>
      o.order_no?.toLowerCase().includes(search.toLowerCase()) ||
      o.vendor?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.vendor?.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Purchase Bills</h1>
        <ExportButton data={filtered} filename="purchase_bills" />
      </div>

      <Card>
        <div className="p-4 border-b">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by bill # or vendor..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Bill #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No purchase bills found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((order) => (
                  <TableRow
                    key={order.id}
                    className="table-row-hover cursor-pointer"
                    onClick={() => router.push(`/purchases/${order.id}`)}
                  >
                    <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{order.order_no}</TableCell>
                    <TableCell>{order.vendor?.company_name || order.vendor?.name}</TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.total_amount, order.currency)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
