import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { InvoiceStatus } from "@prisma/client";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (
      !["OWNER", "ADMIN", "FINANCE"].includes(session.user.role)
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const salesOrder = await db.salesOrder.findUnique({
      where: {
        id: params.id,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!salesOrder) {
      return new NextResponse("Sales order not found", { status: 404 });
    }

    // Check if an invoice already exists for this sales order
    const existingInvoice = await db.invoice.findUnique({
      where: {
        salesOrderId: salesOrder.id,
      },
    });

    if (existingInvoice) {
      return new NextResponse("Invoice already exists for this sales order", {
        status: 400,
      });
    }

    // Generate invoice number (you might want to customize this)
    const lastInvoice = await db.invoice.findFirst({
      orderBy: {
        createdAt: "desc",
      },
    });

    const lastNumber = lastInvoice
      ? parseInt(lastInvoice.invoiceNumber.split("-")[1])
      : 0;
    const invoiceNumber = `INV-${(lastNumber + 1).toString().padStart(6, "0")}`;

    // Set due date to 30 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Create the invoice
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        status: "DRAFT" as InvoiceStatus,
        salesOrder: {
          connect: {
            id: salesOrder.id,
          },
        },
        createdBy: {
          connect: {
            id: session.user.id,
          },
        },
        dueDate,
        total: salesOrder.total,
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error generating invoice:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 