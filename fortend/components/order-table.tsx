import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Eye, Loader2, ReceiptText, RefreshCw, ShoppingBagIcon, UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import Link from "next/link";
import { OrderDto } from "@/lib/types";

interface OrdersTableProps {
  orders: OrderDto[];
  isLoading: boolean;
  isInitialLoading: boolean;
  totalOrders: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onStatusChange: (id: number | null | undefined, status: string) => Promise<void>;
  visibleColumns: string[];
  allColumns: { key: string; label: string }[];
  isContentDisabled: boolean;
  isAnyFilterActive: boolean;
}

const item = {
  hidden: {opacity: 0, y: 20},
  show: {opacity: 1, y: 0},
};

const hoverCardContent = {
  id: {icon: <ReceiptText className="h-4 w-4"/>, title: "订单号"},
  userId: {icon: <UserIcon className="h-4 w-4"/>, title: "用户ID"},
  itemsSummary: {icon: <ShoppingBagIcon className="h-4 w-4"/>, title: "商品详情"},
  createdAt: {icon: <CalendarIcon className="h-4 w-4"/>, title: "创建时间"},
};

const getStatusBadge = (status?: string) => {
  switch (status?.toUpperCase()) {
    case "PENDING_PAYMENT":
      return <Badge variant="outline">待支付</Badge>;
    case "PENDING":
      return <Badge variant="outline">待发货</Badge>;
    case "SHIPPED":
      return <Badge className="bg-yellow-500 hover:bg-yellow-500/80">已发货</Badge>;
    case "COMPLETED":
      return <Badge className="bg-green-500 hover:bg-green-500/80">已完成</Badge>;
    case "CANCELED":
      return <Badge variant="destructive">已取消</Badge>;
    default:
      return <Badge variant="secondary">{status || "未知状态"}</Badge>;
  }
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "无效日期";
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return "格式错误";
  }
};

const formatCurrency = (amount?: number) => {
  if (amount == null || isNaN(amount)) return "N/A";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const getItemSummary = (items?: OrderDto["items"]) => {
  if (!items || items.length === 0) return "无商品";
  const names = items.map((item) => item.snapshotProductName).join(", ");
  return `${names} (${items.length}种商品)`;
};

const getAllItemNames = (items?: OrderDto["items"]) => {
  if (!items || items.length === 0) return "无商品详情";
  return items.map((item) => `${item.snapshotProductName} x${item.quantity} (${formatCurrency(item.purchasedPrice)})`).join(";\n");
};

const OrdersTable: React.FC<OrdersTableProps> = ({
                                                   orders,
                                                   isLoading,
                                                   isInitialLoading,
                                                   totalOrders,
                                                   currentPage,
                                                   totalPages,
                                                   pageSize,
                                                   onPageChange,
                                                   onStatusChange,
                                                   visibleColumns,
                                                   allColumns,
                                                   isContentDisabled,
                                                   isAnyFilterActive,
                                                 }) => {

  return (
    <motion.div variants={item}>
      <Card>
        <CardHeader>
          <CardTitle>订单列表</CardTitle>
          <CardDescription>{isInitialLoading ? "加载中..." : `共 ${totalOrders} 条订单`}</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          {isLoading && (
            <div
              className="absolute inset-0 flex items-center justify-center z-10 bg-background/80 rounded-md transition-opacity">
              <Loader2 className="h-8 w-8 text-primary animate-spin"/>
            </div>
          )}
          <div className={cn("overflow-x-auto", isContentDisabled && "opacity-50 pointer-events-none")}>
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  {allColumns.filter((col) => visibleColumns.includes(col.key)).map((col) => (
                    <TableHead key={col.key}>{col.label}</TableHead>
                  ))}
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>

                {isInitialLoading ? (
                    Array.from({length: pageSize}).map((_, i) => (
                      <TableRow key={i}>
                        {allColumns.filter((col) => visibleColumns.includes(col.key)).map((col) => (
                          <TableCell key={col.key}>
                            <Skeleton
                              className={cn(
                                "h-6",
                                col.key === "itemsSummary"
                                  ? "w-40"
                                  : col.key === "totalAmount"
                                    ? "w-24"
                                    : col.key === "createdAt" || col.key === "updatedAt"
                                      ? "w-32"
                                      : "w-16"
                              )}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Skeleton className="h-7 w-7"/>
                            <Skeleton className="h-7 w-7"/>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) :
                  orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length + 1}
                                 className="text-center py-8 text-muted-foreground">
                        {isAnyFilterActive ? "根据当前筛选条件未找到订单" : "暂无订单"}
                      </TableCell>
                    </TableRow>
                  ) : (

                    orders.map((apiOrderDto, index) => {
                      const order = apiOrderDto.order;
                      return (
                        <TableRow key={order?.id ?? `order-row-${index}`}>
                          {allColumns.filter((col) => visibleColumns.includes(col.key)).map((col) => (
                            <TableCell key={col.key}>
                              {col.key === "id" && (
                                <HoverCard>
                                  <HoverCardTrigger asChild>
                                    <div
                                      className="max-w-[100px] truncate font-medium hover:underline hover:cursor-help">
                                      {order?.id ?? "N/A"}
                                    </div>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-auto max-w-[300px]">
                                    <div className="flex gap-2 items-center mb-1">
                                      {hoverCardContent.id.icon}
                                      <h4 className="font-semibold">{hoverCardContent.id.title}</h4>
                                    </div>
                                    <p className="text-sm break-words">{order?.id ?? "N/A"}</p>
                                  </HoverCardContent>
                                </HoverCard>
                              )}
                              {col.key === "userId" && (
                                <HoverCard>
                                  <HoverCardTrigger asChild>
                                    <div
                                      className="max-w-[100px] truncate font-medium hover:underline hover:cursor-help">
                                      {order?.userId ?? "N/A"}
                                    </div>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-auto max-w-[300px]">
                                    <div className="flex gap-2 items-center mb-1">
                                      {hoverCardContent.userId.icon}
                                      <h4 className="font-semibold">{hoverCardContent.userId.title}</h4>
                                    </div>
                                    <p className="text-sm break-words">{order?.userId ?? "N/A"}</p>
                                  </HoverCardContent>
                                </HoverCard>
                              )}
                              {col.key === "itemsSummary" && (
                                <HoverCard>
                                  <HoverCardTrigger asChild>
                                    <div className="max-w-[250px] truncate hover:underline hover:cursor-help">
                                      {getItemSummary(apiOrderDto.items)}
                                    </div>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-auto max-w-[400px] whitespace-pre-wrap">
                                    <div className="flex gap-2 items-center mb-1">
                                      {hoverCardContent.itemsSummary.icon}
                                      <h4 className="font-semibold">{hoverCardContent.itemsSummary.title}</h4>
                                    </div>
                                    <p className="text-sm leading-relaxed">{getAllItemNames(apiOrderDto.items)}</p>
                                  </HoverCardContent>
                                </HoverCard>
                              )}
                              {col.key === "totalAmount" && formatCurrency(order?.totalAmount)}
                              {col.key === "status" && getStatusBadge(order?.status)}
                              {col.key === "createdAt" && formatDate(order?.createdAt)}
                              {col.key === "updatedAt" && formatDate(order?.updatedAt)}
                            </TableCell>
                          ))}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Link href={`/admin/orders/${order?.id}`} passHref legacyBehavior>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  disabled={isContentDisabled || order?.id == null}
                                >
                                  <Eye className="h-4 w-4"/>
                                </Button>
                              </Link>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="icon"
                                          disabled={isContentDisabled || order?.id == null}>
                                    <RefreshCw className="h-4 w-4"/>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>更新订单状态</DropdownMenuLabel>
                                  <DropdownMenuSeparator/>
                                  <DropdownMenuItem onClick={() => onStatusChange(order?.id, "PENDING")}>
                                    待发货
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onStatusChange(order?.id, "SHIPPED")}>
                                    已发货
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onStatusChange(order?.id, "COMPLETED")}>
                                    已完成
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onStatusChange(order?.id, "CANCELED")}>
                                    已取消
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
              </TableBody>
            </Table>
          </div>

          {totalOrders > 0 && (
            <div
              className={cn("mt-4 flex flex-col sm:flex-row justify-between items-center gap-4",
           isContentDisabled && "opacity-50 pointer-events-none")}
            >
              <div/>
              <Pagination className="sm:mx-0 w-full sm:w-auto ml-12">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                      className={cn("select-none cursor-pointer", (currentPage === 1 || isContentDisabled) && "cursor-not-allowed opacity-50")}
                      aria-disabled={currentPage === 1 || isContentDisabled}
                    />
                  </PaginationItem>
                  {totalPages <= 7 ? (
                    Array.from({length: totalPages}, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => onPageChange(page)}
                          isActive={currentPage === page}
                          className={cn(
                            "select-none cursor-pointer",
                            isContentDisabled && "cursor-not-allowed opacity-50"
                          )}
                          aria-disabled={isContentDisabled}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))
                  ) : (
                    <>
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => onPageChange(1)}
                          isActive={currentPage === 1}
                          aria-disabled={isContentDisabled}
                          className={cn(
                            "select-none cursor-pointer",
                            (currentPage === 1 || isContentDisabled) && "cursor-not-allowed opacity-50"
                          )}
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>
                      {currentPage > 3 && <PaginationItem><span className="px-2">...</span></PaginationItem>}
                      {Array.from({length: 3}, (_, i) => {
                        let page = currentPage - 1 + i;
                        if (currentPage <= 3) page = 2 + i;
                        if (currentPage > totalPages - 3) page = totalPages - 3 + i;
                        return page;
                      }).filter((page) => page > 1 && page < totalPages).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => onPageChange(page)}
                            isActive={currentPage === page}
                            aria-disabled={isContentDisabled}
                            className={cn(
                              "select-none cursor-pointer",
                              isContentDisabled && "cursor-not-allowed opacity-50"
                            )}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      {currentPage < totalPages - 2 &&
                       <PaginationItem><span className="px-2">...</span></PaginationItem>}
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => onPageChange(totalPages)}
                          isActive={currentPage === totalPages}
                          aria-disabled={isContentDisabled}
                          className={cn(
                            "select-none cursor-pointer",
                            (currentPage === totalPages || isContentDisabled) && "cursor-not-allowed opacity-50"
                          )}
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                      className={cn("select-none cursor-pointer", (currentPage === totalPages || isContentDisabled) && "cursor-not-allowed opacity-50")}
                      aria-disabled={currentPage === totalPages || isContentDisabled}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              <div className="text-sm text-muted-foreground">
                第 {currentPage} / {totalPages} 页 ({totalOrders} 条)
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default OrdersTable;