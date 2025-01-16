import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { OrderStatus, type Prisma } from "@prisma/client";
import { UpdateOrderStatus } from "./update-status";

export const metadata = {
  title: "Sales Order Details",
  description: "View sales order details",
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

async function getSalesOrderData(id: string) {
  const salesOrder = await db.salesOrder.findUnique({
    where: {
      id,
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

  if (!salesOrder) {
    return null;
  }

  return salesOrder;
}

export default async function SalesOrderPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const salesOrder = await getSalesOrderData(params.id);

  if (!salesOrder) {
    redirect("/sales-orders");
  }

  const canUpdateStatus =
    session.user.role === "OWNER" ||
    session.user.role === "ADMIN" ||
    session.user.role === "SALES_OFFICER";

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Sales Order Details</h1>
        <div className="flex items-center gap-4">
          {canUpdateStatus && salesOrder.status !== OrderStatus.CANCELLED && (
            <UpdateOrderStatus
              orderId={salesOrder.id}
              currentStatus={salesOrder.status}
            />
          )}
          <Button variant="outline" asChild>
            <Link href="/sales-orders">Back to List</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Order Number
          </p>
          <p className="font-medium">{salesOrder.orderNumber}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Status</p>
          <p>
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                salesOrder.status === OrderStatus.PENDING
                  ? "bg-yellow-100 text-yellow-800"
                  : salesOrder.status === OrderStatus.PROCESSING
                  ? "bg-blue-100 text-blue-800"
                  : salesOrder.status === OrderStatus.SHIPPED
                  ? "bg-purple-100 text-purple-800"
                  : salesOrder.status === OrderStatus.DELIVERED
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {salesOrder.status}
            </span>
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Created By</p>
          <p className="font-medium">{salesOrder.createdBy.name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Customer</p>
          <p className="font-medium">{salesOrder.customerName}</p>
          {salesOrder.customerEmail && (
            <p className="text-sm text-muted-foreground">
              {salesOrder.customerEmail}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Order Date</p>
          <p className="font-medium">{formatDate(salesOrder.orderDate)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Delivery Date
          </p>
          <p className="font-medium">
            {salesOrder.deliveryDate
              ? formatDate(salesOrder.deliveryDate)
              : "Not scheduled"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Total</p>
          <p className="font-medium">{formatPrice(Number(salesOrder.total))}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Quotation Number
          </p>
          <p className="font-medium">
            <Link
              href={`/quotations/${salesOrder.quotation.id}`}
              className="text-primary hover:underline"
            >
              {salesOrder.quotation.quotationNumber}
            </Link>
          </p>
        </div>
      </div>

      <div className="rounded-md border">
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4">Items</h2>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted">
                <tr>
                  <th scope="col" className="px-6 py-3">Product</th>
                  <th scope="col" className="px-6 py-3">SKU</th>
                  <th scope="col" className="px-6 py-3">Quantity</th>
                  <th scope="col" className="px-6 py-3">Unit Price</th>
                  <th scope="col" className="px-6 py-3">Total</th>
                  <th scope="col" className="px-6 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {salesOrder.items.map((item) => (
                  <tr
                    key={item.id}
                    className="bg-white border-b hover:bg-muted/50"
                  >
                    <td className="px-6 py-4 font-medium">
                      {item.product.name}
                    </td>
                    <td className="px-6 py-4">{item.product.sku}</td>
                    <td className="px-6 py-4">{item.quantity}</td>
                    <td className="px-6 py-4">
                      {formatPrice(Number(item.unitPrice))}
                    </td>
                    <td className="px-6 py-4">
                      {formatPrice(Number(item.total))}
                    </td>
                    <td className="px-6 py-4">{item.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {(salesOrder.notes || salesOrder.terms) && (
        <div className="grid gap-6 md:grid-cols-2 mt-8">
          {salesOrder.notes && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {salesOrder.notes}
              </p>
            </div>
          )}
          {salesOrder.terms && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Terms and Conditions</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {salesOrder.terms}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 