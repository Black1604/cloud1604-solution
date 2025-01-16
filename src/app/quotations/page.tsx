import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { QuotationStatus, type Prisma } from "@prisma/client";

export const metadata = {
  title: "Quotations",
  description: "Manage your quotations and proposals",
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

async function getQuotationsData() {
  const quotations = await db.quotation.findMany({
    orderBy: {
      updatedAt: "desc",
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

  const totalQuotations = quotations.length;
  const pendingQuotations = quotations.filter(
    (quotation) => quotation.status === "PENDING" as QuotationStatus
  ).length;
  const approvedQuotations = quotations.filter(
    (quotation) => quotation.status === "APPROVED" as QuotationStatus
  ).length;

  const totalValue = quotations.reduce(
    (sum, quotation) => sum + Number(quotation.total),
    0
  );

  return {
    quotations,
    totalQuotations,
    pendingQuotations,
    approvedQuotations,
    totalValue,
  };
}

export default async function QuotationsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const {
    quotations,
    totalQuotations,
    pendingQuotations,
    approvedQuotations,
    totalValue,
  } = await getQuotationsData();

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Quotations</h1>
        {(session.user.role === "OWNER" ||
          session.user.role === "ADMIN" ||
          session.user.role === "SALES_OFFICER") && (
          <Button asChild>
            <Link href="/quotations/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Quotation
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuotations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingQuotations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedQuotations}</div>
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
          <h2 className="text-xl font-semibold mb-4">Quotation List</h2>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted">
                <tr>
                  <th scope="col" className="px-6 py-3">Quotation #</th>
                  <th scope="col" className="px-6 py-3">Customer</th>
                  <th scope="col" className="px-6 py-3">Created By</th>
                  <th scope="col" className="px-6 py-3">Date</th>
                  <th scope="col" className="px-6 py-3">Valid Until</th>
                  <th scope="col" className="px-6 py-3">Total</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(quotations as QuotationWithRelations[]).map((quotation) => (
                  <tr
                    key={quotation.id}
                    className="bg-white border-b hover:bg-muted/50"
                  >
                    <td className="px-6 py-4">{quotation.quotationNumber}</td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{quotation.customerName}</div>
                        <div className="text-xs text-muted-foreground">
                          {quotation.customerEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {quotation.createdBy.name}
                    </td>
                    <td className="px-6 py-4">
                      {formatDate(quotation.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      {formatDate(quotation.validUntil)}
                    </td>
                    <td className="px-6 py-4">
                      {formatPrice(Number(quotation.total))}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          quotation.status === ("APPROVED" as QuotationStatus)
                            ? "bg-green-100 text-green-800"
                            : quotation.status === ("PENDING" as QuotationStatus)
                            ? "bg-yellow-100 text-yellow-800"
                            : quotation.status === ("REJECTED" as QuotationStatus)
                            ? "bg-red-100 text-red-800"
                            : quotation.status === ("EXPIRED" as QuotationStatus)
                            ? "bg-gray-100 text-gray-800"
                            : quotation.status === ("CONVERTED" as QuotationStatus)
                            ? "bg-blue-100 text-blue-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {quotation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link href={`/quotations/${quotation.id}`}>
                            View
                          </Link>
                        </Button>
                        {quotation.status === ("DRAFT" as QuotationStatus) &&
                          (session.user.role === "OWNER" ||
                            session.user.role === "ADMIN" ||
                            session.user.role === "SALES_OFFICER") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <Link href={`/quotations/${quotation.id}/edit`}>
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