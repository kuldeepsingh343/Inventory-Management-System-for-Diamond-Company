"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPayments } from "@/lib/actions/sales";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ExportButton } from "@/components/export-button";

export default function CustomerPaymentsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await getPayments();
      if (data) setRows(data);
      setLoading(false);
    }
    load();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);

  const filtered = rows.filter((row) => {
    const haystack = [
      row.payment_no,
      row.invoice?.invoice_no,
      row.customer?.name,
      row.customer?.company_name,
      row.payment_mode,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Customer Payments</h1>
        <ExportButton data={filtered} filename="customer_payments" />
      </div>

      <Card>
        <div className="p-4 border-b">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by payment #, invoice #, or customer..."
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
                <TableHead>Payment #</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No customer payments found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow
                    key={row.id}
                    className="table-row-hover cursor-pointer"
                    onClick={() => {
                      if (row.invoice?.id) router.push(`/invoices/${row.invoice.id}`);
                    }}
                  >
                    <TableCell>
                      {new Date(row.payment_date || row.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">{row.payment_no}</TableCell>
                    <TableCell>{row.invoice?.invoice_no || "—"}</TableCell>
                    <TableCell>
                      {row.customer?.company_name || row.customer?.name}
                    </TableCell>
                    <TableCell className="capitalize">
                      {String(row.payment_mode || "").replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(row.amount_paid ?? row.amount)}
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
