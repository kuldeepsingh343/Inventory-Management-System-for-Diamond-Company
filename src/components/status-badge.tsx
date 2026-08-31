import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus, InvoiceStatus } from "@/lib/types/database";

const orderStatusConfig: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-zinc-100 text-zinc-700 border-zinc-200",
  },
  active: {
    label: "Active",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  billed: {
    label: "Billed",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  partially_returned: {
    label: "Partial Return",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  returned: {
    label: "Returned",
    className: "bg-orange-50 text-orange-700 border-orange-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

const invoiceStatusConfig: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  open: {
    label: "Open",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  paid: {
    label: "Paid",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  partially_paid: {
    label: "Partially Paid",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = orderStatusConfig[status];
  return (
    <Badge variant="outline" className={cn("font-medium text-xs", config.className)}>
      {config.label}
    </Badge>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config = invoiceStatusConfig[status];
  return (
    <Badge variant="outline" className={cn("font-medium text-xs", config.className)}>
      {status === "open" && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-dot mr-1" />
      )}
      {config.label}
    </Badge>
  );
}

export function ContactTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; className: string }> = {
    customer: {
      label: "Customer",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    vendor: {
      label: "Vendor",
      className: "bg-orange-50 text-orange-700 border-orange-200",
    },
    customer_vendor: {
      label: "Customer & Vendor",
      className: "bg-purple-50 text-purple-700 border-purple-200",
    },
    contact: {
      label: "Contact",
      className: "bg-zinc-100 text-zinc-700 border-zinc-200",
    },
  };

  const c = config[type] || config.contact;
  return (
    <Badge variant="outline" className={cn("font-medium text-xs", c.className)}>
      {c.label}
    </Badge>
  );
}
