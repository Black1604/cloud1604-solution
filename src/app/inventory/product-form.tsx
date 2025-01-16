"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const productSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required"),
  stockLevel: z.string().min(1, "Stock level is required"),
  minStockLevel: z.string().min(1, "Minimum stock level is required"),
  category: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: {
    id: string;
    sku: string;
    name: string;
    description?: string;
    price: number;
    stockLevel: number;
    minStockLevel: number;
    category?: string;
  };
}

export function ProductForm({ initialData }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          price: initialData.price.toString(),
          stockLevel: initialData.stockLevel.toString(),
          minStockLevel: initialData.minStockLevel.toString(),
        }
      : undefined,
  });

  const onSubmit = async (data: ProductForm) => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/products", {
        method: initialData ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          id: initialData?.id,
          price: parseFloat(data.price),
          stockLevel: parseInt(data.stockLevel),
          minStockLevel: parseInt(data.minStockLevel),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save product");
      }

      toast({
        title: "Success",
        description: `Product ${initialData ? "updated" : "created"} successfully`,
      });

      router.push("/inventory");
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
          <label htmlFor="sku" className="text-sm font-medium">
            SKU
          </label>
          <input
            {...register("sku")}
            id="sku"
            placeholder="Enter SKU"
            className="w-full rounded-md border px-3 py-2"
            disabled={isLoading}
          />
          {errors.sku && (
            <p className="text-sm text-destructive">{errors.sku.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            {...register("name")}
            id="name"
            placeholder="Enter product name"
            className="w-full rounded-md border px-3 py-2"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            {...register("description")}
            id="description"
            placeholder="Enter product description"
            className="w-full rounded-md border px-3 py-2"
            disabled={isLoading}
          />
          {errors.description && (
            <p className="text-sm text-destructive">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="category" className="text-sm font-medium">
            Category
          </label>
          <input
            {...register("category")}
            id="category"
            placeholder="Enter category"
            className="w-full rounded-md border px-3 py-2"
            disabled={isLoading}
          />
          {errors.category && (
            <p className="text-sm text-destructive">{errors.category.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="price" className="text-sm font-medium">
            Price
          </label>
          <input
            {...register("price")}
            id="price"
            type="number"
            step="0.01"
            placeholder="Enter price"
            className="w-full rounded-md border px-3 py-2"
            disabled={isLoading}
          />
          {errors.price && (
            <p className="text-sm text-destructive">{errors.price.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="stockLevel" className="text-sm font-medium">
            Stock Level
          </label>
          <input
            {...register("stockLevel")}
            id="stockLevel"
            type="number"
            placeholder="Enter stock level"
            className="w-full rounded-md border px-3 py-2"
            disabled={isLoading}
          />
          {errors.stockLevel && (
            <p className="text-sm text-destructive">{errors.stockLevel.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="minStockLevel" className="text-sm font-medium">
            Minimum Stock Level
          </label>
          <input
            {...register("minStockLevel")}
            id="minStockLevel"
            type="number"
            placeholder="Enter minimum stock level"
            className="w-full rounded-md border px-3 py-2"
            disabled={isLoading}
          />
          {errors.minStockLevel && (
            <p className="text-sm text-destructive">
              {errors.minStockLevel.message}
            </p>
          )}
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
            ? "Update Product"
            : "Create Product"}
        </Button>
      </div>
    </form>
  );
} 