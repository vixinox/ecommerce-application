"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Eye, RefreshCw, Tag } from 'lucide-react'
import Image from "next/image"
import { API_URL, getProductsAdmin, updateProductStatus } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface Product {
  id: number
  ownerId: number
  name: string
  description: string
  category: string
  defaultImage: string
  minPrice: number
  status: string
  totalStock: number
  ownerUsername: string
}

interface ProductsResponse {
  list: Product[]
  total: number
  pages: number
  pageNum: number
  pageSize: number
}

const container = {
  hidden: {opacity: 0},
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: {opacity: 0, y: 20},
  show: {opacity: 1, y: 0},
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)

  const {token, isLoading} = useAuth()
  const [isFetching, setIsFetching] = useState(false)
  const router = useRouter()

  const fetchProducts = async () => {
    try {
      if (!token) return;
      setIsFetching(true);
      const data: ProductsResponse = await getProductsAdmin(token, currentPage, 10, statusFilter);
      setProducts(data.list);
      setTotalPages(data.pages);
      console.log(data.list)
    } catch (error: any) {
      toast.error("获取商品列表失败", {description: error.message});
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {

    if (!isLoading && token) {
      fetchProducts();
    } else if (!isLoading && !token) {

    }
  }, [currentPage, statusFilter, token, isLoading]);

  const handleStatusChange = async (productId: number, status: string) => {
    try {
      if (!token) {
        toast.error("请先登录");
        router.push("/auth/login");
        return;
      }
      await updateProductStatus(productId, status, token);
      toast.success("商品状态已更新");
      await fetchProducts();
    } catch (error: any) {
      toast.error("更新商品状态失败", {description: error.message});
    }
  };

  const getStatusBadge = (status: string) => {

    switch (status) {
      case "PENDING":
        return (
          <Badge
            className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white">
            待审核
          </Badge>
        );
      case "ACTIVE":
        return (
          <Badge
            className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white">
            已上架
          </Badge>
        );
      case "INACTIVE":
        return (
          <Badge className="bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white">
            已下架
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white">
            未通过
          </Badge>
        );
      case "DELETED":
        return (
          <Badge
            className="bg-stone-500 hover:bg-stone-600 dark:bg-stone-600 dark:hover:bg-stone-700 text-white">
            已删除
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status || "未知状态"}</Badge>;
    }
  }

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "N/A";
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
    }).format(amount);
  };

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="space-y-6 mt-6">
      <motion.div variants={item} className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">商品管理</h1>
          <p className="text-muted-foreground">查看和管理所有商品</p>
        </div>
        <Select value={statusFilter || ""}
                onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="所有状态"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有状态</SelectItem>
            <SelectItem value="ACTIVE">上架中</SelectItem>
            <SelectItem value="INACTIVE">已下架</SelectItem>
            <SelectItem value="DELETED">已删除</SelectItem>
            <SelectItem value="PENDING">待审核</SelectItem>
            <SelectItem value="REJECTED">拒绝上架</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle>商品列表</CardTitle>
            <CardDescription>平台上的所有商品</CardDescription>
          </CardHeader>
          <CardContent>
            {isFetching ? (
              <div className="space-y-2">
                {Array.from({length: 5}).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full"/>
                ))}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>商品图片</TableHead>
                      <TableHead>商品ID</TableHead>
                      <TableHead>商品名称</TableHead>
                      <TableHead>分类</TableHead>
                      <TableHead>价格</TableHead>
                      <TableHead>库存</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>商家ID</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8}
                                   className="text-center py-8 text-muted-foreground">
                          没有找到商品
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="relative w-10 h-10 overflow-hidden rounded-md">
                              <Image
                                src={product.defaultImage ? `${API_URL}/api/image${product.defaultImage}` : "/placeholder.svg"}
                                alt={product.name}
                                fill
                                className="object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg"
                                }}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{product.id}</TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              <Tag className="h-3 w-3 mr-1"/>
                              {product.category}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(product.minPrice)}</TableCell>
                          <TableCell>{product.totalStock}</TableCell>
                          <TableCell>{getStatusBadge(product.status)}</TableCell>
                          <TableCell>{product.ownerId}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  router.push(`/admin/products/${product.id}`);
                                }}
                              >
                                <Eye className="h-4 w-4"/>
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="icon">
                                    <RefreshCw className="h-4 w-4"/>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-40">
                                  <DropdownMenuLabel>更新商品状态</DropdownMenuLabel>
                                  <DropdownMenuSeparator/>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(product.id, "ACTIVE")}>
                                    已上架
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(product.id, "INACTIVE")}>
                                    已下架
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(product.id, "PENDING")}>
                                    待审核
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(product.id, "REJECTED")}>
                                    拒绝上架
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(product.id, "DELETED")}>
                                    已删除
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={`${currentPage === 1 ? "cursor-not-allowed pointer-events-none" : ""}`}
                        />
                      </PaginationItem>
                      {Array.from({length: totalPages}, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink onClick={() => setCurrentPage(page)}
                                          isActive={currentPage === page}>
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          className={`${currentPage === totalPages ? "cursor-not-allowed pointer-events-none" : ""}`}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}