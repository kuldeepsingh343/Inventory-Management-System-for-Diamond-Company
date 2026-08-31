"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPurchaseOrder } from "@/lib/actions/purchases";
import { PurchaseForm } from "@/components/purchase-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/permission-guard";

export default function NewPurchasePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (formData: any) => {
    setSubmitting(true);
    const { error, data } = await createPurchaseOrder(formData);
    setSubmitting(false);

    if (error) {
      toast.error("Failed to create purchase order", { description: error });
    } else {
      toast.success("Purchase order created successfully");
      router.push(`/purchases/${data.id}`);
    }
  };

  return (
    <PermissionGuard module="purchases" action="create" fallback={<div>You don't have permission to create purchases.</div>}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/purchases">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">New Purchase Memo</h1>
        </div>

        <PurchaseForm 
          onSubmit={handleSubmit} 
          onCancel={() => router.push("/purchases")} 
          loading={submitting} 
        />
      </div>
    </PermissionGuard>
  );
}
