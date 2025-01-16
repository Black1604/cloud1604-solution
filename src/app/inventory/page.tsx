import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const metadata = {
  title: "Inventory Management",
  description: "Manage your inventory, stock levels, and products",
};

async function getInventoryData() {
  const products = await db.product.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      sku: true,
      name: true,
      description: true,
      price: true,
      stockLevel: true,
      minStockLevel: true,
      category: true,
    },
  });

  const lowStockProducts = products.filter(
    (product) => product.stockLevel <= product.minStockLevel
  );

  const totalProducts = products.length;
  const totalValue = products.reduce(
    (sum, product) => sum + Number(product.price) * product.stockLevel,
    0
  );

  return {
    products,
    lowStockProducts,
    totalProducts,
    totalValue,
  };
}

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { products, lowStockProducts, totalProducts, totalValue } =
    await getInventoryData();

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        {(session.user.role === "OWNER" ||
          session.user.role === "ADMIN" ||
          session.user.role === "STOCK_CONTROLLER") && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockProducts.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4">Product List</h2>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted">
                <tr>
                  <th scope="col" className="px-6 py-3">SKU</th>
                  <th scope="col" className="px-6 py-3">Name</th>
                  <th scope="col" className="px-6 py-3">Category</th>
                  <th scope="col" className="px-6 py-3">Price</th>
                  <th scope="col" className="px-6 py-3">Stock Level</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  {(session.user.role === "OWNER" ||
                    session.user.role === "ADMIN" ||
                    session.user.role === "STOCK_CONTROLLER") && (
                    <th scope="col" className="px-6 py-3">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="bg-white border-b hover:bg-muted/50"
                  >
                    <td className="px-6 py-4">{product.sku}</td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{product.category}</td>
                    <td className="px-6 py-4">
                      {formatPrice(Number(product.price))}
                    </td>
                    <td className="px-6 py-4">{product.stockLevel}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          product.stockLevel <= product.minStockLevel
                            ? "bg-destructive/20 text-destructive"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {product.stockLevel <= product.minStockLevel
                          ? "Low Stock"
                          : "In Stock"}
                      </span>
                    </td>
                    {(session.user.role === "OWNER" ||
                      session.user.role === "ADMIN" ||
                      session.user.role === "STOCK_CONTROLLER") && (
                      <td className="px-6 py-4">
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 