import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { OrderStatus } from "@prisma/client";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

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
      !["OWNER", "ADMIN", "SALES_OFFICER"].includes(session.user.role)
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const json = await req.json();
    const body = updateStatusSchema.parse(json);

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

    const allowedStatuses = statusTransitions[salesOrder.status];
    if (!allowedStatuses.includes(body.status)) {
      return new NextResponse(
        `Invalid status transition from ${salesOrder.status} to ${body.status}`,
        { status: 400 }
      );
    }

    // If cancelling the order, restore stock levels
    if (body.status === OrderStatus.CANCELLED) {
      for (const item of salesOrder.items) {
        await db.product.update({
          where: {
            id: item.productId,
          },
          data: {
            stockLevel: {
              increment: item.quantity,
            },
          },
        });
      }
    }

    // If shipping the order, set delivery date
    const data: any = {
      status: body.status,
      ...(body.status === OrderStatus.SHIPPED && {
        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      }),
    };

    const updatedOrder = await db.salesOrder.update({
      where: {
        id: params.id,
      },
      data,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 422 });
    }

    return new NextResponse("Internal error", { status: 500 });
  }
} 