import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProductForm } from "../../product-form";

export const metadata = {
  title: "Edit Product",
  description: "Edit an existing product",
};

interface EditProductPageProps {
  params: {
    id: string;
  };
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (
    !["OWNER", "ADMIN", "STOCK_CONTROLLER"].includes(session.user.role)
  ) {
    redirect("/dashboard");
  }

  const product = await db.product.findUnique({
    where: {
      id: params.id,
    },
  });

  if (!product) {
    redirect("/inventory");
  }

  const formattedProduct = {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description || undefined,
    price: Number(product.price),
    stockLevel: product.stockLevel,
    minStockLevel: product.minStockLevel,
    category: product.category || undefined,
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Product</h1>
        <p className="text-muted-foreground">
          Edit the details of an existing product
        </p>
      </div>
      <ProductForm initialData={formattedProduct} />
    </div>
  );
} 