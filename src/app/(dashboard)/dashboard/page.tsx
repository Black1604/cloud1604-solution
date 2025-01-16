import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Package,
  ClipboardList,
  FileText,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import { Prisma } from "@prisma/client";

async function getStats(userId: string, role: string) {
  const isAdmin = role === "OWNER" || role === "ADMIN";
  const whereClause = isAdmin ? undefined : { userId };

  const [
    totalProducts,
    totalQuotations,
    totalSalesOrders,
    totalInvoices,
    lowStockProducts,
  ] = await Promise.all([
    db.product.count(),
    db.quotation.count({
      where: whereClause,
    }),
    db.salesOrder.count({
      where: whereClause,
    }),
    db.invoice.count({
      where: whereClause,
    }),
    db.product.count({
      where: {
        stockLevel: {
          lte: db.product.fields.minStockLevel,
        },
      },
    }),
  ]);

  return {
    totalProducts,
    totalQuotations,
    totalSalesOrders,
    totalInvoices,
    lowStockProducts,
  };
}

async function getRecentActivity(userId: string, role: string) {
  const isAdmin = role === "OWNER" || role === "ADMIN";
  const whereClause = isAdmin ? undefined : { userId };

  const [recentQuotations, recentOrders] = await Promise.all([
    db.quotation.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    }),
    db.salesOrder.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  return {
    recentQuotations,
    recentOrders,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [stats, activity] = await Promise.all([
    getStats(session.user.id, session.user.role),
    getRecentActivity(session.user.id, session.user.role),
  ]);

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Quotations
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuotations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSalesOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Outstanding Invoices
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
          </CardContent>
        </Card>
      </div>
      {(stats.lowStockProducts > 0 &&
        (session.user.role === "OWNER" ||
          session.user.role === "ADMIN" ||
          session.user.role === "STOCK_CONTROLLER")) && (
        <Card className="border-destructive">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <AlertTriangle className="mr-2 h-4 w-4 text-destructive" />
            <CardTitle className="text-sm font-medium text-destructive">
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-destructive">
              {stats.lowStockProducts} products are running low on stock
            </CardDescription>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Quotations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activity.recentQuotations.map((quotation) => (
                <div
                  key={quotation.id}
                  className="flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {quotation.customerName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Created by {quotation.createdBy.name}
                    </p>
                  </div>
                  <div className="text-sm font-medium">
                    {formatPrice(Number(quotation.total))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activity.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{order.customerName}</p>
                    <p className="text-sm text-muted-foreground">
                      Created by {order.createdBy.name}
                    </p>
                  </div>
                  <div className="text-sm font-medium">
                    {formatPrice(Number(order.total))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 