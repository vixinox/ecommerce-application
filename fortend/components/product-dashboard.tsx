"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
import { Eye, FilterIcon, Folder, Loader2, Tag, Text, Edit, Trash2, MoreHorizontal, ChevronDown, ChevronUp } from "lucide-react"
import Image from "next/image"
import { API_URL, deleteMyProduct, searchMyProducts } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@radix-ui/react-hover-card";
import { Product } from "@/lib/types";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { ProductsStats } from "@/components/products-stats";

interface ProductFilters {
  name?: string
  category?: string
  description?: string
  status?: string
  priceFrom?: number
  priceTo?: number
  stockFrom?: number
  stockTo?: number
}


const allColumns = [
  { key: 'image', label: '图片' },
  { key: 'id', label: '商品ID' },
  { key: 'name', label: '商品名称' },
  { key: 'description', label: '描述' },
  { key: 'category', label: '分类' },
  { key: 'minPrice', label: '价格' },
  { key: 'totalStock', label: '库存' },
  { key: 'status', label: '状态' },
]


const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export default function ProductDashboard() {
  const router = useRouter()
  const { token, isLoading: isAuthLoading } = useAuth()

  const [products, setProducts] = useState<Product[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalFilteredProducts, setTotalFilteredProducts] = useState(0)

  const [filters, setFilters] = useState<ProductFilters>({})
  const [tempFilters, setTempFilters] = useState<ProductFilters>({})
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    ['image', 'name', 'category', 'status', 'minPrice', 'totalStock']
  )

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<number | null>(null)
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);

  const fetchProductsWithFiltersAndPagination = useCallback(async () => {
    setIsFetching(true)
    try {
      if (!token) {
        if (!isAuthLoading) {
          toast.error('请先登录')
          router.push('/auth/login')
        }
        return
      }

      const queryParams = new URLSearchParams();
      queryParams.append('page', currentPage.toString());
      queryParams.append('limit', pageSize.toString());

      if (filters.name) queryParams.append('name', filters.name);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.description) queryParams.append('description', filters.description);
      if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status);
      if (typeof filters.priceFrom === 'number') queryParams.append('priceFrom', filters.priceFrom.toString());
      if (typeof filters.priceTo === 'number') queryParams.append('priceTo', filters.priceTo.toString());
      if (typeof filters.stockFrom === 'number') queryParams.append('stockFrom', filters.stockFrom.toString());
      if (typeof filters.stockTo === 'number') queryParams.append('stockTo', filters.stockTo.toString());

      const data: { products: Product[]; totalCount: number } = await searchMyProducts(token, queryParams.toString());

      setProducts(data.products);
      setTotalFilteredProducts(data.totalCount);

      const newTotalPages = Math.max(1, Math.ceil(data.totalCount / pageSize));
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      } else if (currentPage < 1 && newTotalPages > 0) {
        setCurrentPage(1);
      }
    } catch (e: any) {
      console.error(e)
      toast.error('获取商品列表失败', { description: e.message || '未知错误'})
      setProducts([])
      setTotalFilteredProducts(0)
    } finally {
      setIsFetching(false)
    }
  }, [token, isAuthLoading, router, currentPage, pageSize, filters]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchProductsWithFiltersAndPagination();
    }
  }, [isAuthLoading, fetchProductsWithFiltersAndPagination]);

  useEffect(() => {
    if (isFilterOpen) {
      setTempFilters({ ...filters });
    }
  }, [isFilterOpen, filters]);

  const handleApplyFilters = () => {
    const cleanedFilters: ProductFilters = Object.fromEntries(
      Object.entries(tempFilters).filter(([_, v]) => v !== undefined && v !== '' && (typeof v !== 'number' || !isNaN(v)))
    );
    setFilters(cleanedFilters);
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const handleResetFilters = () => {
    setTempFilters({});
    setFilters({});
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const isAnyFilterActive = () => Object.entries(filters).some(([_, v]) => v !== undefined && v !== '' && (typeof v !== 'number' || !isNaN(v)));
  const showSkeletons = isFetching && products.length === 0 && !isAnyFilterActive();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">待审核</Badge>
      case 'ACTIVE':
        return <Badge className="bg-green-500 text-white hover:bg-green-600">已上架</Badge>
      case 'INACTIVE':
        return <Badge className="bg-gray-500 text-white hover:bg-gray-600">已下架</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-500 text-white hover:bg-red-600">拒绝上架</Badge>
      case 'DELETED':
        return <Badge className="bg-stone-500 text-white hover:bg-stone-600">已删除</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatCurrency = (amount?: number) => {
    if (amount == null) return 'N/A'
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  }

  const handleDeleteClick = (productId: number) => {
    setProductToDelete(productId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (productToDelete === null) return;

    setIsFetching(true);
    setDeleteDialogOpen(false);

    try {
      if (!token) {
        toast.error('请先登录');
        router.push('/auth/login');
        return;
      }
      await deleteMyProduct(productToDelete, token);
      toast.success('商品删除成功！');

      fetchProductsWithFiltersAndPagination();
    } catch (e: any) {
      console.error("Delete failed:", e);
      toast.error('删除商品失败', { description: e.message || '未知错误' });
      setIsFetching(false);
    }
  };

  const hoverCardContent = {
    description: { icon: <Text className="h-4 w-4" />, title: '描述' },
    name: { icon: <Tag className="h-4 w-4" />, title: '商品名称' },
    category: { icon: <Folder className="h-4 w-4" />, title: '商品分类' }
  };

  const totalPages = Math.max(1, Math.ceil(totalFilteredProducts / pageSize));

  if (isAuthLoading) {
    return (
      <div className="flex flex-col space-y-6 mt-6">
        <Skeleton className="h-[40px] w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-[100px]" />
          <Skeleton className="h-[100px]" />
          <Skeleton className="h-[100px]" />
          <Skeleton className="h-[100px]" />
        </div>
        <Skeleton className="h-[40px] w-64" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="space-y-6 mt-6">
      <motion.div variants={item} className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">商品统计概览</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
            className="h-8 w-8"
          >
            {isStatsCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            <span className="sr-only">{isStatsCollapsed ? '展开统计' : '折叠统计'}</span>
          </Button>
        </CardHeader>
        <AnimatePresence initial={false}>
          {!isStatsCollapsed && (
            <motion.div
              key="stats-content"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >

              <CardContent className="pt-0"><ProductsStats products={products}/></CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>



      <motion.div variants={item} className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">我的商品</h1>
          <p className="text-muted-foreground">管理您的所有商品 ({totalFilteredProducts} 条)</p>
        </div>
        <div className="flex items-center gap-2">

          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2" disabled={isFetching}>
                <FilterIcon className="h-4 w-4"/><span>搜索和筛选</span>
                {isAnyFilterActive() && <Badge variant="secondary" className="h-5 w-5 p-0">●</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-4 space-y-3" align="end">

              <div className="grid gap-2">
                <Label htmlFor="name">商品名称</Label>
                <Input id="name" placeholder="模糊匹配"
                       value={tempFilters.name || ''}
                       onChange={e => setTempFilters(prev => ({...prev, name: e.target.value}))}
                       disabled={isFetching}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">分类</Label>
                <Input id="category" placeholder="模糊匹配"
                       value={tempFilters.category || ''}
                       onChange={e => setTempFilters(prev => ({...prev, category: e.target.value}))}
                       disabled={isFetching}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">描述</Label>
                <Input id="description" placeholder="模糊匹配"
                       value={tempFilters.description || ''}
                       onChange={e => setTempFilters(prev => ({...prev, description: e.target.value}))}
                       disabled={isFetching}
                />
              </div>

              <div className="grid gap-2">
                <Label>状态</Label>
                <Select value={tempFilters.status || 'all'}
                        onValueChange={val => setTempFilters(prev => ({
                          ...prev,
                          status: val === 'all' ? undefined : val
                        }))}
                        disabled={isFetching}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="所有状态"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有状态</SelectItem>
                    <SelectItem value="PENDING">待审核</SelectItem>
                    <SelectItem value="ACTIVE">已上架</SelectItem>
                    <SelectItem value="INACTIVE">已下架</SelectItem>
                    <SelectItem value="REJECTED">拒绝上架</SelectItem>
                    <SelectItem value="DELETED">已删除</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>价格范围 (CNY)</Label>
                <div className="flex space-x-2">
                  <Input type="number" placeholder="最低"
                         value={tempFilters.priceFrom ?? ''}
                         onChange={e => setTempFilters(prev => ({
                           ...prev,
                           priceFrom: e.target.value ? Number(e.target.value) : undefined
                         }))}
                         disabled={isFetching}
                  />
                  <Input type="number" placeholder="最高"
                         value={tempFilters.priceTo ?? ''}
                         onChange={e => setTempFilters(prev => ({
                           ...prev,
                           priceTo: e.target.value ? Number(e.target.value) : undefined
                         }))}
                         disabled={isFetching}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>库存范围</Label>
                <div className="flex space-x-2">
                  <Input type="number" placeholder="最低"
                         value={tempFilters.stockFrom ?? ''}
                         onChange={e => setTempFilters(prev => ({
                           ...prev,
                           stockFrom: e.target.value ? Number(e.target.value) : undefined
                         }))}
                         disabled={isFetching}
                  />
                  <Input type="number" placeholder="最高"
                         value={tempFilters.stockTo ?? ''}
                         onChange={e => setTempFilters(prev => ({
                           ...prev,
                           stockTo: e.target.value ? Number(e.target.value) : undefined
                         }))}
                         disabled={isFetching}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <Button variant="outline" onClick={handleResetFilters} disabled={isFetching}>重置</Button>
                <Button onClick={handleApplyFilters} disabled={isFetching}>
                  {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}应用
                </Button>
              </div>
            </PopoverContent>
          </Popover>


          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={isFetching}>
                <Tag className="h-4 w-4"/>
                <span className="sr-only">显示栏目</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>显示栏目</DropdownMenuLabel>
              <DropdownMenuSeparator/>
              {allColumns.map(col => (
                <DropdownMenuCheckboxItem
                  key={col.key} className="flex items-center"
                  checked={visibleColumns.includes(col.key)}
                  onCheckedChange={(checked) => {
                    setVisibleColumns(prev => {
                      if (checked) return [...prev, col.key];
                      return prev.filter(c => c !== col.key);
                    });
                  }}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>


      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle>商品列表</CardTitle>
            <CardDescription>
              {isAuthLoading ? '加载中...' : totalFilteredProducts > 0 ? `显示第 ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, totalFilteredProducts)} 条，共 ${totalFilteredProducts} 条商品` : '没有商品符合条件'}
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">

            {isFetching && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 rounded-md">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                <span className="sr-only">加载中...</span>
              </div>
            )}

            <div className={cn(isFetching ? 'opacity-50 pointer-events-none' : '')}>
              <Table>
                <TableHeader>
                  <TableRow>

                    {allColumns.filter(col => visibleColumns.includes(col.key)).map(col => (
                      <TableHead key={col.key} className={col.key === 'minPrice' || col.key === 'totalStock' ? 'text-right' : ''}>
                        {col.label}
                      </TableHead>
                    ))}

                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showSkeletons ? (
                    Array.from({length: pageSize}).map((_, i) => (
                      <TableRow key={i}>
                        {allColumns.filter(col => visibleColumns.includes(col.key)).map(col => (
                          <TableCell key={col.key}>
                            {col.key === 'image' ? (
                              <Skeleton className="h-10 w-10 rounded-md"/>
                            ) : col.key === 'status' ? (
                              <Skeleton className="h-6 w-20"/>
                            ) : col.key === 'minPrice' || col.key === 'totalStock' ? (
                              <Skeleton className="h-6 w-16 float-right"/>
                            ) : (
                              <Skeleton className="h-6 w-24"/>
                            )}
                          </TableCell>
                        ))}

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2"><Skeleton className="h-8 w-8"/></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={visibleColumns.length + 1}
                                   className="text-center py-8 text-muted-foreground">
                          {isAnyFilterActive() ? '根据筛选未找到商品' : '您还没有任何商品。'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map(prod => (
                        <TableRow key={prod.id}>
                          {visibleColumns.includes('image') && (
                            <TableCell>
                              <div className="w-10 h-10 relative rounded overflow-hidden">
                                <Image src={`${API_URL}/api/image${prod.defaultImage}` || '/placeholder.svg'}
                                       alt={prod.name} fill sizes="40px" className="object-cover" onError={e => {
                                  e.currentTarget.src = '/placeholder.svg'
                                }}/>
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.includes('id') && <TableCell className="font-mono text-xs text-muted-foreground">{prod.id}</TableCell>}
                          {visibleColumns.includes('name') && (
                            <TableCell className="font-medium">
                              <HoverCard>
                                <HoverCardTrigger asChild>

                                  <div className="max-w-[150px] truncate hover:underline cursor-help">
                                    {prod.name}
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-64 p-2 rounded-md border bg-popover text-popover-foreground shadow-md z-50">
                                  <div className="flex gap-2 items-center mb-2">
                                    {hoverCardContent.name.icon}
                                    <h4 className="font-semibold leading-none">{hoverCardContent.name.title}</h4>
                                  </div>
                                  <p className="text-sm leading-snug text-muted-foreground">{prod.name}</p>
                                </HoverCardContent>
                              </HoverCard>
                            </TableCell>
                          )}
                          {visibleColumns.includes('description') && (
                            <TableCell>
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <div className="max-w-[200px] truncate hover:underline cursor-help">
                                    {prod.description || '暂无描述'}
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-64 p-2 rounded-md border bg-popover text-popover-foreground shadow-md z-50">
                                  <div className="flex gap-2 items-center mb-2">
                                    {hoverCardContent.description.icon}
                                    <h4 className="font-semibold leading-none">{hoverCardContent.description.title}</h4>
                                  </div>
                                  <p className="text-sm leading-snug text-muted-foreground">{prod.description || '暂无描述'}</p>
                                </HoverCardContent>
                              </HoverCard>
                            </TableCell>
                          )}
                          {visibleColumns.includes('category') && (
                            <TableCell>
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <div className="max-w-[120px] truncate hover:underline cursor-help">
                                    {prod.category}
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-64 p-2 rounded-md border bg-popover text-popover-foreground shadow-md z-50">
                                  <div className="flex gap-2 items-center mb-2">
                                    {hoverCardContent.category.icon}
                                    <h4 className="font-semibold leading-none">{hoverCardContent.category.title}</h4>
                                  </div>
                                  <p className="text-sm leading-snug text-muted-foreground">{prod.category}</p>
                                </HoverCardContent>
                              </HoverCard>
                            </TableCell>
                          )}
                          {visibleColumns.includes('minPrice') &&
                           <TableCell className="text-right">{formatCurrency(prod.minPrice)}</TableCell>}
                          {visibleColumns.includes('totalStock') &&
                           <TableCell className={cn("text-right", prod.totalStock === 0 && "text-red-500 font-semibold")}>{prod.totalStock}</TableCell>}
                          {visibleColumns.includes('status') && <TableCell>{getStatusBadge(prod.status)}</TableCell>}

                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={isFetching}>
                                  <MoreHorizontal className="h-4 w-4"/>
                                  <span className="sr-only">操作</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>操作</DropdownMenuLabel>
                                <DropdownMenuSeparator/>
                                <DropdownMenuItem asChild>
                                  <Link href={`/product/${prod.id}`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center">
                                    <Eye className="mr-2 h-4 w-4"/>
                                    查看商品页
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/account/merchant/products/${prod.id}`)} disabled={isFetching}>
                                  <Edit className="mr-2 h-4 w-4"/>
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuSeparator/>
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600 cursor-pointer"
                                  onClick={() => handleDeleteClick(prod.id)}
                                  disabled={isFetching}
                                >
                                  <Trash2 className="mr-2 h-4 w-4"/>
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )
                  )}
                </TableBody>
              </Table>
            </div>

            {totalFilteredProducts > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem className="select-none">
                      <PaginationPrevious onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}/>
                    </PaginationItem>
                    {Array.from({length: totalPages}, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2))
                    .map(page => (
                      <PaginationItem key={page} className="select-none">
                        {(page === 1 && currentPage > 3) || (page === totalPages && currentPage < totalPages - 2) || (page > 1 && page < totalPages && (page < currentPage - 2 || page > currentPage + 2)) ? (
                          <span className="px-2 py-1 text-muted-foreground">...</span>
                        ) : (
                          <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page}>
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    <PaginationItem className="select-none">
                      <PaginationNext onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}/>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
                <div className="text-sm text-muted-foreground text-nowrap">第 {currentPage} / {totalPages} 页
                  ({totalFilteredProducts} 条)
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销，将永久从您的商店中删除该产品及其所有相关数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isFetching}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isFetching} className="bg-red-600 hover:bg-red-700">
              {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4"/>}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </motion.div>
  )
}
