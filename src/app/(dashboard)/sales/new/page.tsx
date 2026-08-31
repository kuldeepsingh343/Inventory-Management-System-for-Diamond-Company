"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSalesOrder } from "@/lib/actions/sales";
import { SalesForm } from "@/components/sales-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/permission-guard";

export default function NewSalesPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (formData: any) => {
    setSubmitting(true);
    const { error, data } = await createSalesOrder(formData);
    setSubmitting(false);

    if (error) {
      toast.error("Failed to create sales order", { description: error });
    } else {
      toast.success("Sales order created successfully");
      router.push(`/sales/${data.id}`);
    }
  };

  return (
    <PermissionGuard module="sales" action="create" fallback={<div>You don't have permission to create sales.</div>}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" render={<Link href="/sales" />}>
              <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">New Sales Memo</h1>
        </div>

        <SalesForm 
          onSubmit={handleSubmit} 
          onCancel={() => router.push("/sales")} 
          loading={submitting} 
        />
      </div>
    </PermissionGuard>
  );
}
