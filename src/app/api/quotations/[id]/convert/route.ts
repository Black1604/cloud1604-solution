import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { QuotationStatus, OrderStatus } from "@prisma/client";
import { generateOrderNumber } from "@/lib/utils";

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
      !["OWNER", "ADMIN", "SALES_OFFICER"].includes(session.user.role)
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const quotation = await db.quotation.findUnique({
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

    if (!quotation) {
      return new NextResponse("Quotation not found", { status: 404 });
    }

    if (quotation.status !== QuotationStatus.APPROVED) {
      return new NextResponse(
        "Only approved quotations can be converted to sales orders",
        { status: 400 }
      );
    }

    // Check if quotation is already converted
    const existingSalesOrder = await db.salesOrder.findUnique({
      where: {
        quotationId: quotation.id,
      },
    });

    if (existingSalesOrder) {
      return new NextResponse(
        "Quotation is already converted to a sales order",
        { status: 400 }
      );
    }

    // Check stock levels
    for (const item of quotation.items) {
      if (item.quantity > item.product.stockLevel) {
        return new NextResponse(
          `Insufficient stock for product ${item.product.name}`,
          { status: 400 }
        );
      }
    }

    // Create sales order
    const salesOrder = await db.salesOrder.create({
      data: {
        orderNumber: generateOrderNumber("SO"),
        status: OrderStatus.PENDING,
        customerName: quotation.customerName,
        customerEmail: quotation.customerEmail,
        total: quotation.total,
        notes: quotation.notes,
        terms: quotation.terms,
        quotation: {
          connect: {
            id: quotation.id,
          },
        },
        createdBy: {
          connect: {
            id: session.user.id,
          },
        },
        items: {
          create: quotation.items.map((item) => ({
            product: {
              connect: {
                id: item.productId,
              },
            },
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            notes: item.notes,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Update quotation status
    await db.quotation.update({
      where: {
        id: quotation.id,
      },
      data: {
        status: QuotationStatus.CONVERTED,
      },
    });

    // Update stock levels
    for (const item of quotation.items) {
      await db.product.update({
        where: {
          id: item.productId,
        },
        data: {
          stockLevel: {
            decrement: item.quantity,
          },
        },
      });
    }

    return NextResponse.json(salesOrder);
  } catch (error) {
    console.error("Error converting quotation to sales order:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 