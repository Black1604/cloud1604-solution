import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { InvoiceStatus, type Prisma } from "@prisma/client";
import { UpdateInvoiceStatus } from "./update-status";

export const metadata = {
  title: "Invoice Details",
  description: "View invoice details",
};

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    createdBy: true;
    salesOrder: true;
  };
}>;

async function getInvoiceData(id: string) {
  const invoice = await db.invoice.findUnique({
    where: {
      id,
    },
    include: {
      createdBy: true,
      salesOrder: {
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    return null;
  }

  return invoice;
}

export default async function InvoicePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const invoice = await getInvoiceData(params.id);

  if (!invoice) {
    redirect("/invoices");
  }

  const canUpdateStatus =
    session.user.role === "OWNER" ||
    session.user.role === "ADMIN" ||
    session.user.role === "FINANCE";

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Invoice Details</h1>
        <div className="flex items-center gap-4">
          {canUpdateStatus && invoice.status !== InvoiceStatus.CANCELLED && (
            <UpdateInvoiceStatus
              invoiceId={invoice.id}
              currentStatus={invoice.status}
            />
          )}
          <Button variant="outline" asChild>
            <Link href="/invoices">Back to List</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Invoice Number
          </p>
          <p className="font-medium">{invoice.invoiceNumber}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Status</p>
          <p>
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                invoice.status === InvoiceStatus.DRAFT
                  ? "bg-gray-100 text-gray-800"
                  : invoice.status === InvoiceStatus.PENDING
                  ? "bg-blue-100 text-blue-800"
                  : invoice.status === InvoiceStatus.PAID
                  ? "bg-green-100 text-green-800"
                  : invoice.status === InvoiceStatus.OVERDUE
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {invoice.status}
            </span>
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Created By</p>
          <p className="font-medium">{invoice.createdBy.name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Customer</p>
          <p className="font-medium">{invoice.salesOrder.customerName}</p>
          {invoice.salesOrder.customerEmail && (
            <p className="text-sm text-muted-foreground">
              {invoice.salesOrder.customerEmail}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Due Date</p>
          <p className="font-medium">{formatDate(invoice.dueDate)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Total</p>
          <p className="font-medium">{formatPrice(Number(invoice.total))}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Sales Order Number
          </p>
          <p className="font-medium">
            <Link
              href={`/sales-orders/${invoice.salesOrder.id}`}
              className="text-primary hover:underline"
            >
              {invoice.salesOrder.orderNumber}
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
                {invoice.salesOrder.items.map((item) => (
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

      {(invoice.notes || invoice.terms) && (
        <div className="grid gap-6 md:grid-cols-2 mt-8">
          {invoice.notes && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {invoice.notes}
              </p>
            </div>
          )}
          {invoice.terms && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Terms and Conditions</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {invoice.terms}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 