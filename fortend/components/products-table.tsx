"use client"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Edit, Eye, MoreHorizontal, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { formatPrice } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Product } from "@/lib/types";
import { API_URL } from "@/lib/api";

interface ProductsTableProps {
  products: Product[];
  isLoading: boolean;
}

export function ProductsTable({products, isLoading}: ProductsTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (productToDelete) {
      // TODO: 调用删除 API
      // 注意：实际删除应向上层传递 productToDelete 并由父组件触发 API 调用和数据更新
      // 这里仅模拟 UI 反馈和对话框关闭
      toast.success("产品删除请求已发送 (实际删除需调用 API)");
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="搜索产品..."
          className="max-w-sm"
          value={searchQuery}
          onChange={handleSearch}
          disabled={isLoading}
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">图片</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>类别</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">价格</TableHead>
              <TableHead className="text-right">库存</TableHead>
              <TableHead className="w-[100px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({length: 5}).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-10 w-10 rounded-md"/>
                  </TableCell>
                  <TableCell className="font-medium"><Skeleton className="h-4 w-[150px]"/></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]"/></TableCell>
                  <TableCell><Skeleton className="h-6 w-[80px]"/></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-[80px] float-right"/></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-[50px] float-right"/></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto"/></TableCell>
                </TableRow>
              ))
            ) : (
              filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="relative h-10 w-10 overflow-hidden rounded-md">
                        <Image
                          src={`${API_URL}/api/image${product.defaultImage}` || "/placeholder.svg"}
                          alt={product.name}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>
                      <Badge
                        variant={product.status === "ACTIVE" ? "default" : "secondary"}
                        className={
                          product.status === "ACTIVE"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 hover:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100 hover:text-green-200"
                        }
                      >
                        {product.status === "ACTIVE" ? "上架" : "下架"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatPrice(product.minPrice)}</TableCell>
                    <TableCell className="text-right">
                      <span className={product.totalStock === 0 ? "text-red-500" : ""}>{product.totalStock}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4"/>
                            <span className="sr-only">操作</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>操作</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/product/${product.id}`}>
                              <Eye className="mr-2 h-4 w-4"/>
                              查看
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/account/merchant/products/${product.id}`)}>
                            <Edit className="mr-2 h-4 w-4"/>
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuSeparator/>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleDeleteClick(product.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4"/>
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    {searchQuery ? "未找到匹配的产品。" : "未找到产品。"}
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销，将永久从您的商店中删除该产品。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}