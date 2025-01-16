"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { QuotationStatus, type Prisma } from "@prisma/client";
import { generateOrderNumber } from "@/lib/utils";

const quotationSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  validUntil: z.string().min(1, "Valid until date is required"),
  items: z.array(
    z.object({
      productId: z.string().min(1, "Product is required"),
      quantity: z.number().min(1, "Quantity must be at least 1"),
      unitPrice: z.number().min(0, "Unit price must be at least 0"),
      notes: z.string().optional(),
    })
  ).min(1, "At least one item is required"),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

type QuotationForm = z.infer<typeof quotationSchema>;

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stockLevel: number;
};

type QuotationItemWithNotes = Prisma.QuotationItemGetPayload<{
  include: {
    product: true;
  };
}> & {
  notes?: string;
};

interface QuotationFormProps {
  products: Product[];
  initialData?: Prisma.QuotationGetPayload<{
    include: {
      items: {
        include: {
          product: true;
        };
      };
    };
  }> & {
    notes?: string;
    terms?: string;
    items: QuotationItemWithNotes[];
  };
}

export function QuotationForm({ products, initialData }: QuotationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<QuotationForm>({
    resolver: zodResolver(quotationSchema),
    defaultValues: initialData
      ? {
          customerName: initialData.customerName,
          customerEmail: initialData.customerEmail || "",
          validUntil: new Date(initialData.validUntil)
            .toISOString()
            .split("T")[0],
          items: initialData.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            notes: item.notes || "",
          })),
          notes: initialData.notes || "",
          terms: initialData.terms || "",
        }
      : {
          items: [
            {
              productId: "",
              quantity: 1,
              unitPrice: 0,
              notes: "",
            },
          ],
        },
  });

  const items = watch("items");

  const addItem = () => {
    setValue("items", [
      ...items,
      {
        productId: "",
        quantity: 1,
        unitPrice: 0,
        notes: "",
      },
    ]);
  };

  const removeItem = (index: number) => {
    setValue(
      "items",
      items.filter((_, i) => i !== index)
    );
  };

  const onSubmit = async (data: QuotationForm) => {
    try {
      setIsLoading(true);

      const total = data.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

      const quotationData = {
        ...data,
        status: initialData ? initialData.status : QuotationStatus.DRAFT,
        quotationNumber: initialData
          ? initialData.quotationNumber
          : generateOrderNumber("QT"),
        total,
      };

      const response = await fetch("/api/quotations", {
        method: initialData ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...quotationData,
          id: initialData?.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save quotation");
      }

      toast({
        title: "Success",
        description: `Quotation ${initialData ? "updated" : "created"} successfully`,
      });

      router.push("/quotations");
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="customerName" className="text-sm font-medium">
            Customer Name
          </label>
          <input
            {...register("customerName")}
            id="customerName"
            placeholder="Enter customer name"
            className="w-full rounded-md border px-3 py-2"
            disabled={isLoading}
          />
          {errors.customerName && (
            <p className="text-sm text-destructive">
              {errors.customerName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="customerEmail" className="text-sm font-medium">
            Customer Email
          </label>
          <input
            {...register("customerEmail")}
            id="customerEmail"
            type="email"
            placeholder="Enter customer email"
            className="w-full rounded-md border px-3 py-2"
            disabled={isLoading}
          />
          {errors.customerEmail && (
            <p className="text-sm text-destructive">
              {errors.customerEmail.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="validUntil" className="text-sm font-medium">
            Valid Until
          </label>
          <input
            {...register("validUntil")}
            id="validUntil"
            type="date"
            className="w-full rounded-md border px-3 py-2"
            disabled={isLoading}
          />
          {errors.validUntil && (
            <p className="text-sm text-destructive">
              {errors.validUntil.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Items</h3>
          <Button
            type="button"
            variant="outline"
            onClick={addItem}
            disabled={isLoading}
          >
            Add Item
          </Button>
        </div>

        {items.map((item, index) => (
          <div
            key={index}
            className="grid gap-4 md:grid-cols-4 items-start border rounded-lg p-4"
          >
            <div className="space-y-2">
              <label
                htmlFor={`items.${index}.productId`}
                className="text-sm font-medium"
              >
                Product
              </label>
              <select
                {...register(`items.${index}.productId`)}
                className="w-full rounded-md border px-3 py-2"
                disabled={isLoading}
                onChange={(e) => {
                  const product = products.find((p) => p.id === e.target.value);
                  if (product) {
                    setValue(`items.${index}.unitPrice`, product.price);
                  }
                }}
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
              {errors.items?.[index]?.productId && (
                <p className="text-sm text-destructive">
                  {errors.items[index]?.productId?.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`items.${index}.quantity`}
                className="text-sm font-medium"
              >
                Quantity
              </label>
              <input
                {...register(`items.${index}.quantity`, {
                  valueAsNumber: true,
                })}
                type="number"
                min="1"
                className="w-full rounded-md border px-3 py-2"
                disabled={isLoading}
              />
              {errors.items?.[index]?.quantity && (
                <p className="text-sm text-destructive">
                  {errors.items[index]?.quantity?.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`items.${index}.unitPrice`}
                className="text-sm font-medium"
              >
                Unit Price
              </label>
              <input
                {...register(`items.${index}.unitPrice`, {
                  valueAsNumber: true,
                })}
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-md border px-3 py-2"
                disabled={isLoading}
              />
              {errors.items?.[index]?.unitPrice && (
                <p className="text-sm text-destructive">
                  {errors.items[index]?.unitPrice?.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`items.${index}.notes`}
                className="text-sm font-medium"
              >
                Notes
              </label>
              <div className="flex gap-2">
                <input
                  {...register(`items.${index}.notes`)}
                  className="w-full rounded-md border px-3 py-2"
                  disabled={isLoading}
                />
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeItem(index)}
                    disabled={isLoading}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}

        {errors.items && (
          <p className="text-sm text-destructive">{errors.items.message}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes
          </label>
          <textarea
            {...register("notes")}
            id="notes"
            rows={3}
            className="w-full rounded-md border px-3 py-2"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="terms" className="text-sm font-medium">
            Terms and Conditions
          </label>
          <textarea
            {...register("terms")}
            id="terms"
            rows={3}
            className="w-full rounded-md border px-3 py-2"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? initialData
              ? "Updating..."
              : "Creating..."
            : initialData
            ? "Update Quotation"
            : "Create Quotation"}
        </Button>
      </div>
    </form>
  );
} 