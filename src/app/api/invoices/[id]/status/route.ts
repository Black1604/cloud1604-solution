import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { InvoiceStatus } from "@prisma/client";
import { z } from "zod";
import { sendEmail, generateInvoiceStatusEmail } from "@/lib/email";

const updateStatusSchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
});

const statusTransitions = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["PAID", "OVERDUE", "CANCELLED"],
  PAID: [],
  OVERDUE: ["PAID", "CANCELLED"],
  CANCELLED: [],
} as const;

type ValidStatus = keyof typeof statusTransitions;
type AllowedTransitions<T extends ValidStatus> = (typeof statusTransitions)[T][number];

function isValidTransition(
  currentStatus: ValidStatus,
  newStatus: InvoiceStatus
): newStatus is AllowedTransitions<typeof currentStatus> {
  return statusTransitions[currentStatus].includes(newStatus as any);
}

export async function PATCH(
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

    const json = await req.json();
    const body = updateStatusSchema.parse(json);

    const invoice = await db.invoice.findUnique({
      where: {
        id: params.id,
      },
      include: {
        salesOrder: true,
      },
    });

    if (!invoice) {
      return new NextResponse("Invoice not found", { status: 404 });
    }

    const currentStatus = invoice.status as ValidStatus;

    if (!isValidTransition(currentStatus, body.status)) {
      return new NextResponse(
        `Invalid status transition from ${currentStatus} to ${body.status}`,
        { status: 400 }
      );
    }

    const updatedInvoice = await db.invoice.update({
      where: {
        id: params.id,
      },
      data: {
        status: body.status,
      },
    });

    // Send email notification if customer email exists
    if (invoice.salesOrder.customerEmail) {
      const { subject, text, html } = generateInvoiceStatusEmail(
        invoice.invoiceNumber,
        body.status,
        invoice.salesOrder.customerName,
        Number(invoice.total),
        invoice.dueDate
      );

      await sendEmail({
        to: invoice.salesOrder.customerEmail,
        subject,
        text,
        html,
      });
    }

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 422 });
    }

    console.error("Error updating invoice status:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 