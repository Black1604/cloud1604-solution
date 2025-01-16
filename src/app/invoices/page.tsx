import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { InvoiceStatus, type Prisma } from "@prisma/client";

export const metadata = {
  title: "Invoices",
  description: "Manage invoices and payments",
};

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    createdBy: true;
    salesOrder: true;
  };
}>;

async function getInvoicesData() {
  const invoices = await db.invoice.findMany({
    include: {
      createdBy: true,
      salesOrder: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalInvoices = invoices.length;
  const pendingInvoices = invoices.filter(
    (invoice) => invoice.status === InvoiceStatus.PENDING
  ).length;
  const overdueInvoices = invoices.filter(
    (invoice) => invoice.status === InvoiceStatus.OVERDUE
  ).length;
  const totalValue = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total),
    0
  );

  return {
    invoices,
    totalInvoices,
    pendingInvoices,
    overdueInvoices,
    totalValue,
  };
}

export default async function InvoicesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { invoices, totalInvoices, pendingInvoices, overdueInvoices, totalValue } =
    await getInvoicesData();

  const canCreateInvoice =
    session.user.role === "OWNER" ||
    session.user.role === "ADMIN" ||
    session.user.role === "FINANCE";

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Invoices</h1>
        {canCreateInvoice && (
          <Button asChild>
            <Link href="/invoices/create">Create Invoice</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="font-medium text-gray-500">Total Invoices</h3>
          <p className="text-2xl font-bold">{totalInvoices}</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="font-medium text-gray-500">Pending Invoices</h3>
          <p className="text-2xl font-bold">{pendingInvoices}</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="font-medium text-gray-500">Overdue Invoices</h3>
          <p className="text-2xl font-bold text-red-600">{overdueInvoices}</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="font-medium text-gray-500">Total Value</h3>
          <p className="text-2xl font-bold">{formatPrice(totalValue)}</p>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3">Invoice Number</th>
                <th scope="col" className="px-6 py-3">Customer</th>
                <th scope="col" className="px-6 py-3">Created By</th>
                <th scope="col" className="px-6 py-3">Issue Date</th>
                <th scope="col" className="px-6 py-3">Due Date</th>
                <th scope="col" className="px-6 py-3">Total</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="px-6 py-4 font-medium">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="text-primary hover:underline"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4">{invoice.customerName}</td>
                  <td className="px-6 py-4">{invoice.createdBy.name}</td>
                  <td className="px-6 py-4">{formatDate(invoice.issueDate)}</td>
                  <td className="px-6 py-4">{formatDate(invoice.dueDate)}</td>
                  <td className="px-6 py-4">
                    {formatPrice(Number(invoice.total))}
                  </td>
                  <td className="px-6 py-4">
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
                          : invoice.status === InvoiceStatus.VOID
                          ? "bg-gray-100 text-gray-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/invoices/${invoice.id}`}>View</Link>
                      </Button>
                      {canCreateInvoice && invoice.status === InvoiceStatus.DRAFT && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/invoices/${invoice.id}/edit`}>Edit</Link>
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
  );
} 