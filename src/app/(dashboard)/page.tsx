"use client";

import { useEffect, useState } from "react";
import { getDashboardSummary } from "@/lib/actions/dashboard";
import type { DashboardSummary } from "@/lib/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ArrowUpRight, ArrowDownRight, Activity, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data, error } = await getDashboardSummary();
      if (error) setError(error);
      else setSummary(data);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error loading dashboard: {error}</div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Monthly Sales */}
        <Card className="card-hover relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-16 h-16" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.monthlySales || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Current month invoices
            </p>
          </CardContent>
        </Card>

        {/* Receivables */}
        <Card className="card-hover relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ArrowUpRight className="w-16 h-16" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receivables</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary?.totalReceivables || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pending from customers
            </p>
          </CardContent>
        </Card>

        {/* Payables */}
        <Card className="card-hover relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ArrowDownRight className="w-16 h-16" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Payables</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(summary?.totalPayables || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pending to vendors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary?.recentTransactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No recent transactions found.
            </div>
          ) : (
            <div className="space-y-4">
              {summary?.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{tx.contact_name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{tx.reference}</span>
                      <span>•</span>
                      <span>{tx.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={tx.type === 'sale' ? 'default' : 'outline'} className="capitalize">
                      {tx.type}
                    </Badge>
                    <span className={`font-semibold ${tx.type === 'sale' ? 'text-green-600' : 'text-orange-600'}`}>
                      {tx.type === 'sale' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
