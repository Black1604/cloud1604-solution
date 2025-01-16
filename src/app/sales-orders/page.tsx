import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderStatus, type Prisma } from "@prisma/client";

export const metadata = {
  title: "Sales Orders",
  description: "Manage your sales orders",
};

type SalesOrderWithRelations = Prisma.SalesOrderGetPayload<{
  include: {
    createdBy: true;
    quotation: true;
    items: {
      include: {
        product: true;
      };
    };
  };
}>;

async function getSalesOrdersData() {
  const salesOrders = await db.salesOrder.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      createdBy: true,
      quotation: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  const totalOrders = salesOrders.length;
  const pendingOrders = salesOrders.filter(
    (order) => order.status === OrderStatus.PENDING
  ).length;
  const processingOrders = salesOrders.filter(
    (order) => order.status === OrderStatus.PROCESSING
  ).length;
  const shippedOrders = salesOrders.filter(
    (order) => order.status === OrderStatus.SHIPPED
  ).length;

  const totalValue = salesOrders.reduce(
    (sum, order) => sum + Number(order.total),
    0
  );

  return {
    salesOrders,
    totalOrders,
    pendingOrders,
    processingOrders,
    shippedOrders,
    totalValue,
  };
}

export default async function SalesOrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const {
    salesOrders,
    totalOrders,
    pendingOrders,
    processingOrders,
    shippedOrders,
    totalValue,
  } = await getSalesOrdersData();

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Sales Orders</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processingOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shippedOrders}</div>
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
      </div>

      <div className="rounded-md border">
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4">Sales Order List</h2>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted">
                <tr>
                  <th scope="col" className="px-6 py-3">Order #</th>
                  <th scope="col" className="px-6 py-3">Customer</th>
                  <th scope="col" className="px-6 py-3">Created By</th>
                  <th scope="col" className="px-6 py-3">Order Date</th>
                  <th scope="col" className="px-6 py-3">Delivery Date</th>
                  <th scope="col" className="px-6 py-3">Total</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(salesOrders as SalesOrderWithRelations[]).map((order) => (
                  <tr
                    key={order.id}
                    className="bg-white border-b hover:bg-muted/50"
                  >
                    <td className="px-6 py-4">{order.orderNumber}</td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-xs text-muted-foreground">
                          {order.customerEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {order.createdBy.name}
                    </td>
                    <td className="px-6 py-4">
                      {formatDate(order.orderDate)}
                    </td>
                    <td className="px-6 py-4">
                      {order.deliveryDate ? formatDate(order.deliveryDate) : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {formatPrice(Number(order.total))}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          order.status === OrderStatus.PENDING
                            ? "bg-yellow-100 text-yellow-800"
                            : order.status === OrderStatus.PROCESSING
                            ? "bg-blue-100 text-blue-800"
                            : order.status === OrderStatus.SHIPPED
                            ? "bg-purple-100 text-purple-800"
                            : order.status === OrderStatus.DELIVERED
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link href={`/sales-orders/${order.id}`}>
                            View
                          </Link>
                        </Button>
                        {order.status === OrderStatus.PENDING &&
                          (session.user.role === "OWNER" ||
                            session.user.role === "ADMIN" ||
                            session.user.role === "SALES_OFFICER") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <Link href={`/sales-orders/${order.id}/edit`}>
                                Edit
                              </Link>
                            </Button>
                          )}
                      </div>
                    </td>
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