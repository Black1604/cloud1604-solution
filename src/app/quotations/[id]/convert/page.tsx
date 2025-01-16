"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

export default function ConvertQuotationPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function convertQuotation() {
      try {
        const response = await fetch(`/api/quotations/${params.id}/convert`, {
          method: "POST",
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error);
        }

        const salesOrder = await response.json();

        toast({
          title: "Success",
          description: "Quotation converted to sales order successfully",
        });

        router.push(`/sales-orders/${salesOrder.id}`);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error instanceof Error ? error.message : "Something went wrong",
        });
        router.push(`/quotations/${params.id}`);
      }
    }

    convertQuotation();
  }, [params.id, router, toast]);

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Converting Quotation...</h1>
          <p className="text-muted-foreground">Please wait while we process your request.</p>
        </div>
      </div>
    </div>
  );
} 