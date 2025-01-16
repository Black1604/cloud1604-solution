import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ProductForm } from "../product-form";

export const metadata = {
  title: "Add Product",
  description: "Add a new product to inventory",
};

export default async function AddProductPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (
    !["OWNER", "ADMIN", "STOCK_CONTROLLER"].includes(session.user.role)
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Add Product</h1>
        <p className="text-muted-foreground">
          Add a new product to your inventory
        </p>
      </div>
      <ProductForm />
    </div>
  );
} 