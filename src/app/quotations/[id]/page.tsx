import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { QuotationStatus, type Prisma } from "@prisma/client";

export const metadata = {
  title: "Quotation Details",
  description: "View quotation details",
};

type QuotationWithRelations = Prisma.QuotationGetPayload<{
  include: {
    createdBy: true;
    items: {
      include: {
        product: true;
      };
    };
  };
}>;

async function getQuotationData(id: string) {
  const quotation = await db.quotation.findUnique({
    where: {
      id,
    },
    include: {
      createdBy: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!quotation) {
    return null;
  }

  return quotation;
}

export default async function QuotationPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const quotation = await getQuotationData(params.id);

  if (!quotation) {
    redirect("/quotations");
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Quotation Details</h1>
        <div className="flex items-center gap-4">
          {quotation.status === QuotationStatus.APPROVED &&
            (session.user.role === "OWNER" ||
              session.user.role === "ADMIN" ||
              session.user.role === "SALES_OFFICER") && (
              <Button
                variant="default"
                asChild
              >
                <Link href={`/api/quotations/${quotation.id}/convert`}>
                  Convert to Sales Order
                </Link>
              </Button>
            )}
          <Button variant="outline" asChild>
            <Link href="/quotations">Back to List</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Quotation Number
          </p>
          <p className="font-medium">{quotation.quotationNumber}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Status</p>
          <p>
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                quotation.status === QuotationStatus.APPROVED
                  ? "bg-green-100 text-green-800"
                  : quotation.status === QuotationStatus.PENDING
                  ? "bg-yellow-100 text-yellow-800"
                  : quotation.status === QuotationStatus.REJECTED
                  ? "bg-red-100 text-red-800"
                  : quotation.status === QuotationStatus.EXPIRED
                  ? "bg-gray-100 text-gray-800"
                  : quotation.status === QuotationStatus.CONVERTED
                  ? "bg-blue-100 text-blue-800"
                  : "bg-purple-100 text-purple-800"
              }`}
            >
              {quotation.status}
            </span>
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Created By</p>
          <p className="font-medium">{quotation.createdBy.name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Customer</p>
          <p className="font-medium">{quotation.customerName}</p>
          {quotation.customerEmail && (
            <p className="text-sm text-muted-foreground">
              {quotation.customerEmail}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Valid Until</p>
          <p className="font-medium">{formatDate(quotation.validUntil)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Total</p>
          <p className="font-medium">{formatPrice(Number(quotation.total))}</p>
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
                {quotation.items.map((item) => (
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

      {(quotation.notes || quotation.terms) && (
        <div className="grid gap-6 md:grid-cols-2 mt-8">
          {quotation.notes && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {quotation.notes}
              </p>
            </div>
          )}
          {quotation.terms && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Terms and Conditions</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {quotation.terms}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 