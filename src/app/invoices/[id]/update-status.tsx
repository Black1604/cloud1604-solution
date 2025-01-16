"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { InvoiceStatus } from "@prisma/client";

interface UpdateInvoiceStatusProps {
  invoiceId: string;
  currentStatus: InvoiceStatus;
}

const statusTransitions = {
  "DRAFT": ["PENDING", "CANCELLED"] as const,
  "PENDING": ["PAID", "OVERDUE", "CANCELLED"] as const,
  "PAID": [] as const,
  "OVERDUE": ["PAID", "CANCELLED"] as const,
  "CANCELLED": [] as const,
} as const;

type ValidStatus = keyof typeof statusTransitions;
type AllowedTransitions<T extends ValidStatus> = typeof statusTransitions[T][number];

export function UpdateInvoiceStatus({
  invoiceId,
  currentStatus,
}: UpdateInvoiceStatusProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = React.useState<InvoiceStatus>(currentStatus);
  const [isLoading, setIsLoading] = React.useState(false);

  const availableStatuses = statusTransitions[currentStatus as ValidStatus];

  const handleUpdateStatus = async () => {
    if (status === currentStatus) return;

    try {
      setIsLoading(true);

      const response = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast({
        title: "Success",
        description: "Invoice status updated successfully",
      });

      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!availableStatuses.length) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={status}
        onValueChange={(value: string) => setStatus(value as InvoiceStatus)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          {availableStatuses.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        onClick={handleUpdateStatus}
        disabled={status === currentStatus || isLoading}
      >
        {isLoading ? "Updating..." : "Update"}
      </Button>
    </div>
  );
} 