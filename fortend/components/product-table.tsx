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
import { Eye, Folder, Loader2, RefreshCw, Tag, Text } from "lucide-react";
import Image from "next/image";
import { API_URL } from "@/lib/api";

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
import { Product } from "@/lib/types";

interface ProductTableProps {
  products: Product[];
  isLoading: boolean;
  isInitialLoading: boolean;
  totalProducts: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onStatusChange: (id: number, status: string) => void;
  onViewDetails: (id: number) => void;
  visibleColumns: string[];
  allColumns: { key: string; label: string }[];
  isContentDisabled: boolean;
  isAnyFilterActive: boolean;
}

const hoverCardContent = {
  description: {icon: <Text className="h-4 w-4"/>, title: "描述"},
  name: {icon: <Tag className="h-4 w-4"/>, title: "商品名称"},
  category: {icon: <Folder className="h-4 w-4"/>, title: "商品分类"},
};


const getStatusBadge = (status: string) => {
  switch (status) {
    case "PENDING":
      return <Badge variant="outline">待审核</Badge>;
    case "ACTIVE":
      return <Badge className="bg-green-500">已上架</Badge>;
    case "INACTIVE":
      return <Badge className="bg-gray-500">已下架</Badge>;
    case "REJECTED":
      return <Badge className="bg-red-500">拒绝上架</Badge>;
    case "DELETED":
      return <Badge className="bg-stone-500">已删除</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const formatCurrency = (amount?: number) => {
  if (amount == null) return "N/A";
  return new Intl.NumberFormat("zh-CN", {style: "currency", currency: "CNY"}).format(amount);
};

export default function ProductTable({
                                       products,
                                       isLoading,
                                       isInitialLoading,
                                       totalProducts,
                                       currentPage,
                                       totalPages,
                                       pageSize,
                                       onPageChange,
                                       onStatusChange,
                                       onViewDetails,
                                       visibleColumns,
                                       allColumns,
                                       isContentDisabled,
                                       isAnyFilterActive,
                                     }: ProductTableProps) {

  return (
    <Card>
      <CardHeader>
        <CardTitle>商品列表</CardTitle>
        <CardDescription>{isInitialLoading ? "加载中..." : `共 ${totalProducts} 条商品`}</CardDescription>
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
                  <TableHead key={col.key}>
                    {col.key === "image" ? "" : col.label}
                  </TableHead>
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
                          className={cn("h-6",
                            col.key === "image"
                              ? "h-10 w-10 rounded"
                              : col.key === "id"
                                ? "w-16"
                                : col.key === "name"
                                  ? "w-24"
                                  : col.key === "description"
                                    ? "w-32"
                                    : col.key === "category"
                                      ? "w-16"
                                      : col.key === "minPrice"
                                        ? "w-24"
                                        : col.key === "totalStock"
                                          ? "w-16"
                                          : col.key === "status"
                                            ? "w-20"
                                            : col.key === "ownerId"
                                              ? "w-16"
                                              : "w-20"
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
                !products || products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-muted-foreground">
                      {isAnyFilterActive ? "根据筛选未找到商品" : "没有商品"}
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((prod) => (
                    <TableRow key={prod.id}>
                      {allColumns.filter((col) => visibleColumns.includes(col.key)).map((col) => (
                        <TableCell key={col.key}>
                          {col.key === "image" && (
                            <div className="w-10 h-10 relative rounded overflow-hidden flex-shrink-0">
                              <Image
                                src={`${API_URL}/api/image${prod.defaultImage}` || "/placeholder.svg"}
                                alt={prod.name || "Product Image"}
                                fill
                                sizes="40px"
                                className="object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg";
                                }}
                              />
                            </div>
                          )}
                          {col.key === "id" && <div className="font-medium">{prod.id}</div>}
                          {col.key === "name" && (
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <div className="max-w-[150px] truncate hover:underline cursor-help">
                                  {prod.name || "N/A"}
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-64">
                                <div className="flex gap-2 items-center mb-2">
                                  {hoverCardContent.name.icon}
                                  <h4 className="font-semibold">{hoverCardContent.name.title}</h4>
                                </div>
                                <p className="text-sm">{prod.name || "N/A"}</p>
                              </HoverCardContent>
                            </HoverCard>
                          )}
                          {col.key === "description" && (
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <div className="max-w-[200px] truncate hover:underline cursor-help">
                                  {prod.description || "暂无描述"}
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-64">
                                <div className="flex gap-2 items-center mb-2">
                                  {hoverCardContent.description.icon}
                                  <h4 className="font-semibold">{hoverCardContent.description.title}</h4>
                                </div>
                                <p className="text-sm">{prod.description || "暂无描述"}</p>
                              </HoverCardContent>
                            </HoverCard>
                          )}
                          {col.key === "category" && (
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <div className="max-w-[120px] truncate hover:underline cursor-help">
                                  {prod.category || "N/A"}
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-64">
                                <div className="flex gap-2 items-center mb-2">
                                  {hoverCardContent.category.icon}
                                  <h4 className="font-semibold">{hoverCardContent.category.title}</h4>
                                </div>
                                <p className="text-sm">{prod.category || "N/A"}</p>
                              </HoverCardContent>
                            </HoverCard>
                          )}
                          {col.key === "minPrice" && formatCurrency(prod.minPrice)}
                          {col.key === "totalStock" && (prod.totalStock ?? "N/A")}
                          {col.key === "status" && getStatusBadge(prod.status)}
                          {col.key === "ownerId" && (prod.ownerId ?? "N/A")}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => prod.id != null && onViewDetails(prod.id)}
                            disabled={isContentDisabled || prod.id == null}
                          >
                            <Eye className="h-4 w-4"/>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" disabled={isContentDisabled || prod.id == null}>
                                <RefreshCw className="h-4 w-4"/>
                              </Button>
                            </DropdownMenuTrigger>
                            {!isContentDisabled && prod.id != null && (
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>更新状态</DropdownMenuLabel>
                                <DropdownMenuSeparator/>

                                <DropdownMenuItem onClick={() => onStatusChange(prod.id, "ACTIVE")}>
                                  上架
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onStatusChange(prod.id, "INACTIVE")}>
                                  下架
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onStatusChange(prod.id, "PENDING")}>
                                  待审核
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onStatusChange(prod.id, "REJECTED")}>
                                  拒绝
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => onStatusChange(prod.id, "DELETED")}
                                                  className="text-red-600">
                                  删除
                                </DropdownMenuItem>

                              </DropdownMenuContent>
                            )}
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
            </TableBody>
          </Table>
        </div>
        {totalProducts > 0 && (
          <div className={cn("mt-4 flex flex-col sm:flex-row justify-between items-center gap-4",
          isContentDisabled && 'opacity-50 pointer-events-none')}>
            <div/>
            <Pagination>
              <PaginationContent>
                <PaginationItem className="select-none">
                  <PaginationPrevious
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    className={cn('cursor-pointer', (currentPage === 1 || isContentDisabled) && 'cursor-not-allowed opacity-50')}
                    aria-disabled={currentPage === 1 || isContentDisabled}
                  />
                </PaginationItem>
                {totalPages <= 7 ? (
                  Array.from({length: totalPages}, (_, i) => i + 1).map(page => (
                    <PaginationItem key={page} className="select-none">

                      <PaginationLink
                        onClick={() => onPageChange(page)}
                        isActive={currentPage === page}
                        className={cn('cursor-pointer', isContentDisabled && 'cursor-not-allowed opacity-50')}
                        aria-disabled={isContentDisabled}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))
                ) : (
                  <>
                    <PaginationItem><PaginationLink onClick={() => onPageChange(1)} isActive={currentPage === 1}
                                                    aria-disabled={isContentDisabled}
                                                    className={cn("select-none cursor-pointer", (currentPage === 1 || isContentDisabled) && "cursor-not-allowed opacity-50")}>1</PaginationLink></PaginationItem>
                    {currentPage > 3 && <PaginationItem><span className="px-2">...</span></PaginationItem>}
                    {
                      Array.from({length: 3}, (_, i) => {
                        let page = currentPage - 1 + i;
                        if (currentPage <= 3) page = 2 + i;
                        if (currentPage > totalPages - 3) page = totalPages - 3 + i;
                        return page;
                      }).filter(page => page > 1 && page < totalPages).map(page => (
                        <PaginationItem key={page}>
                          <PaginationLink onClick={() => onPageChange(page)} isActive={currentPage === page}
                                          aria-disabled={isContentDisabled}
                                          className={cn("select-none cursor-pointer", isContentDisabled && "cursor-not-allowed opacity-50")}>
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))
                    }
                    {currentPage < totalPages - 2 &&
                     <PaginationItem><span className="px-2">...</span></PaginationItem>}
                    <PaginationItem><PaginationLink onClick={() => onPageChange(totalPages)}
                                                    isActive={currentPage === totalPages}
                                                    aria-disabled={isContentDisabled}
                                                    className={cn("select-none cursor-pointer", (currentPage === totalPages || isContentDisabled) && "cursor-not-allowed opacity-50")}>{totalPages}</PaginationLink></PaginationItem>
                  </>
                )}

                <PaginationItem className="select-none">
                  <PaginationNext
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    className={cn('cursor-pointer', (currentPage === totalPages || isContentDisabled) && 'cursor-not-allowed opacity-50')}
                    aria-disabled={currentPage === totalPages || isContentDisabled}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <div className="text-sm text-muted-foreground text-nowrap">第 {currentPage} / {totalPages} 页
              ({totalProducts} 条)
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};