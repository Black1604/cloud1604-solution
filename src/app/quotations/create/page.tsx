import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { QuotationForm } from "../quotation-form";

export const metadata = {
  title: "Create Quotation",
  description: "Create a new quotation",
};

export default async function CreateQuotationPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (
    !["OWNER", "ADMIN", "SALES_OFFICER"].includes(session.user.role)
  ) {
    redirect("/dashboard");
  }

  const products = await db.product.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      stockLevel: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Quotation</h1>
        <p className="text-muted-foreground">
          Create a new quotation for your customer
        </p>
      </div>
      <QuotationForm products={products.map(product => ({
        ...product,
        price: Number(product.price),
      }))} />
    </div>
  );
} 