"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSalesReturns } from "@/lib/actions/sales";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ExportButton } from "@/components/export-button";
import { OrderStatusBadge } from "@/components/status-badge";

export default function SalesMemoReturnsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [fromOrders, setFromOrders] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, fromOrders: usedOrders } = await getSalesReturns();
      if (data) setRows(data);
      setFromOrders(Boolean(usedOrders));
      setLoading(false);
    }
    load();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);

  const filtered = rows.filter((row) => {
    const haystack = [
      row.return_no,
      row.order_no,
      row.sales_order?.order_no,
      row.customer?.name,
      row.customer?.company_name,
      row.sales_order?.customer?.name,
      row.sales_order?.customer?.company_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Sales Memo Returns</h1>
        <ExportButton data={filtered} filename="sales_memo_returns" />
      </div>

      <Card>
        <div className="p-4 border-b">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by return #, order #, or customer..."
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
                <TableHead>{fromOrders ? "Order #" : "Return #"}</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
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
                    No sales memo returns found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => {
                  const soId = row.sales_order?.id || row.id;
                  return (
                    <TableRow
                      key={row.id}
                      className="table-row-hover cursor-pointer"
                      onClick={() => router.push(`/sales/${soId}`)}
                    >
                      <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">
                        {row.return_no || row.order_no || row.sales_order?.order_no}
                      </TableCell>
                      <TableCell>
                        {row.sales_order?.customer?.company_name ||
                          row.sales_order?.customer?.name ||
                          row.customer?.company_name ||
                          row.customer?.name}
                      </TableCell>
                      <TableCell>
                        {row.status ? <OrderStatusBadge status={row.status} /> : "Returned"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.total_amount)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
