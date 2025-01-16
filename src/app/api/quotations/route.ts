import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { QuotationStatus } from "@prisma/client";

const quotationSchema = z.object({
  id: z.string().optional(),
  quotationNumber: z.string(),
  customerName: z.string(),
  customerEmail: z.string().optional(),
  validUntil: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      notes: z.string().optional(),
    })
  ),
  notes: z.string().optional(),
  terms: z.string().optional(),
  status: z.nativeEnum(QuotationStatus),
  total: z.number(),
});

export async function POST(req: Request) {
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

    const json = await req.json();
    const body = quotationSchema.parse(json);

    const existingQuotation = await db.quotation.findFirst({
      where: {
        quotationNumber: body.quotationNumber,
      },
    });

    if (existingQuotation) {
      return new NextResponse("Quotation number already exists", { status: 400 });
    }

    const quotation = await db.quotation.create({
      data: {
        quotationNumber: body.quotationNumber,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        validUntil: new Date(body.validUntil),
        status: body.status,
        total: body.total,
        notes: body.notes,
        terms: body.terms,
        createdBy: {
          connect: {
            id: session.user.id,
          },
        },
        items: {
          create: body.items.map((item) => ({
            product: {
              connect: {
                id: item.productId,
              },
            },
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
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

    return NextResponse.json(quotation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 422 });
    }

    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PUT(req: Request) {
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

    const json = await req.json();
    const body = quotationSchema.parse(json);

    if (!body.id) {
      return new NextResponse("Quotation ID is required", { status: 400 });
    }

    const existingQuotation = await db.quotation.findFirst({
      where: {
        quotationNumber: body.quotationNumber,
        NOT: {
          id: body.id,
        },
      },
    });

    if (existingQuotation) {
      return new NextResponse("Quotation number already exists", { status: 400 });
    }

    // Delete existing items
    await db.quotationItem.deleteMany({
      where: {
        quotationId: body.id,
      },
    });

    const quotation = await db.quotation.update({
      where: {
        id: body.id,
      },
      data: {
        quotationNumber: body.quotationNumber,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        validUntil: new Date(body.validUntil),
        status: body.status,
        total: body.total,
        notes: body.notes,
        terms: body.terms,
        items: {
          create: body.items.map((item) => ({
            product: {
              connect: {
                id: item.productId,
              },
            },
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
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

    return NextResponse.json(quotation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 422 });
    }

    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const customerName = searchParams.get("customerName");

    const quotations = await db.quotation.findMany({
      where: {
        ...(status ? { status: status as QuotationStatus } : {}),
        ...(customerName
          ? { customerName: { contains: customerName, mode: "insensitive" } }
          : {}),
      },
      include: {
        createdBy: {
          select: {
            name: true,
            username: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(quotations);
  } catch (error) {
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!["OWNER", "ADMIN"].includes(session.user.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const quotationId = searchParams.get("id");

    if (!quotationId) {
      return new NextResponse("Quotation ID is required", { status: 400 });
    }

    const quotation = await db.quotation.findUnique({
      where: {
        id: quotationId,
      },
    });

    if (!quotation) {
      return new NextResponse("Quotation not found", { status: 404 });
    }

    if (quotation.status !== QuotationStatus.DRAFT) {
      return new NextResponse(
        "Only draft quotations can be deleted",
        { status: 400 }
      );
    }

    await db.quotation.delete({
      where: {
        id: quotationId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return new NextResponse("Internal error", { status: 500 });
  }
} 