import { User, Product, Quotation, SalesOrder, Invoice } from "@prisma/client";

export type ExtendedUser = User & {
  quotations: Quotation[];
  salesOrders: SalesOrder[];
  invoices: Invoice[];
};

export type DashboardStats = {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  lowStockProducts: number;
};

export type SidebarNavItem = {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
};

export type Option = {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
};

export type TableFilter = {
  column?: string;
  operator?: string;
  value?: string;
};

export type SortOrder = "asc" | "desc";

export type TableSort = {
  column: string;
  order: SortOrder;
};

export type ProductWithStock = Product & {
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
};

export type QuotationWithItems = Quotation & {
  items: {
    product: Product;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
};

export type SalesOrderWithItems = SalesOrder & {
  items: {
    product: Product;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  quotation: Quotation;
};

export type InvoiceWithOrder = Invoice & {
  salesOrder: SalesOrderWithItems;
}; 