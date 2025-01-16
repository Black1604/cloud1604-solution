import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const productSchema = z.object({
  id: z.string().optional(),
  sku: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  stockLevel: z.number(),
  minStockLevel: z.number(),
  category: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (
      !["OWNER", "ADMIN", "STOCK_CONTROLLER"].includes(session.user.role)
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const json = await req.json();
    const body = productSchema.parse(json);

    const existingProduct = await db.product.findFirst({
      where: {
        sku: body.sku,
      },
    });

    if (existingProduct) {
      return new NextResponse("SKU already exists", { status: 400 });
    }

    const product = await db.product.create({
      data: {
        sku: body.sku,
        name: body.name,
        description: body.description,
        price: body.price,
        stockLevel: body.stockLevel,
        minStockLevel: body.minStockLevel,
        category: body.category,
      },
    });

    return NextResponse.json(product);
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
      !["OWNER", "ADMIN", "STOCK_CONTROLLER"].includes(session.user.role)
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const json = await req.json();
    const body = productSchema.parse(json);

    if (!body.id) {
      return new NextResponse("Product ID is required", { status: 400 });
    }

    const existingProduct = await db.product.findFirst({
      where: {
        sku: body.sku,
        NOT: {
          id: body.id,
        },
      },
    });

    if (existingProduct) {
      return new NextResponse("SKU already exists", { status: 400 });
    }

    const product = await db.product.update({
      where: {
        id: body.id,
      },
      data: {
        sku: body.sku,
        name: body.name,
        description: body.description,
        price: body.price,
        stockLevel: body.stockLevel,
        minStockLevel: body.minStockLevel,
        category: body.category,
      },
    });

    return NextResponse.json(product);
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
    const sku = searchParams.get("sku");
    const category = searchParams.get("category");

    const products = await db.product.findMany({
      where: {
        ...(sku ? { sku: { contains: sku } } : {}),
        ...(category ? { category: { contains: category } } : {}),
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(products);
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
    const productId = searchParams.get("id");

    if (!productId) {
      return new NextResponse("Product ID is required", { status: 400 });
    }

    await db.product.delete({
      where: {
        id: productId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return new NextResponse("Internal error", { status: 500 });
  }
} 