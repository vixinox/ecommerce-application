"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FilterIcon, Loader2, Tag, ChevronDown, ChevronUp } from "lucide-react"
import { searchMyProducts, updateProductStatus } from "@/lib/api"
import { useAuth } from "@/providers/auth-provider"
import { useRouter } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Product } from "@/lib/types";
import { ProductsStats } from "@/components/products/products-stats";
import ProductTable from "@/components/products/product-table";

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
  const [totalProducts, setTotalProducts] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [filters, setFilters] = useState<ProductFilters>({})
  const [tempFilters, setTempFilters] = useState<ProductFilters>({})
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    ['image', 'name', 'category', 'status', 'minPrice', 'totalStock']
  )

  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);

  const fetchProducts = useCallback(async () => {
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

      const data = await searchMyProducts(token, queryParams.toString());

      setProducts(data.list || [])
      setTotalPages(data.pages || 1)
      setTotalProducts(data.total || 0)

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
      setTotalProducts(0)
    } finally {
      setIsFetching(false)
    }
  }, [token, isAuthLoading, router, currentPage, pageSize, filters]);

  const handleStatusChange = async (id: number | undefined | null, status: string) => {
    if (id == null || !Number.isFinite(id)) {
      toast.error("更新商品状态失败", { description: `无效的商品ID: ${id}` });
      console.error("[StatusChange Error] Invalid Product ID provided:", id);
      return;
    }
    if (isFetching || isAuthLoading) return
    try {
      if (!token) {
        toast.error('请先登录')
        router.push('/auth/login')
        return
      }
      await updateProductStatus(Number(id), status, token)
      toast.success('商品状态已更新')

      await fetchProducts()
    } catch (e: any) {
      toast.error('更新商品状态失败', { description: e.message || '未知错误' })
    }
  }

  const handleViewDetails = (id: number | null | undefined) => {
    if (id == null || !Number.isFinite(id) || isContentDisabled) {
      console.warn("[ViewDetails] Invalid product ID or content disabled:", id);
      return;
    }
    router.push(`/product/${id}`);
  }

  useEffect(() => {
    if (!isAuthLoading) {
      fetchProducts();
    }
  }, [isAuthLoading, fetchProducts]);

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
  const isInitialLoading = isFetching && !products && !isAnyFilterActive()

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

  const isContentDisabled = isFetching || isAuthLoading;

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="space-y-6 mt-6">
      <motion.div variants={item} className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6">
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
              <CardContent className="pt-0 pb-6"><ProductsStats products={products}/></CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div variants={item} className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">我的商品</h1>
          <p className="text-muted-foreground">管理您的所有商品 ({totalProducts} 条)</p>
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
        <ProductTable
          products={products}
          isLoading={isFetching}
          isInitialLoading={isInitialLoading}
          totalProducts={totalProducts}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onStatusChange={handleStatusChange}
          onViewDetails={handleViewDetails}
          visibleColumns={visibleColumns}
          allColumns={allColumns}
          isContentDisabled={isContentDisabled}
          isAnyFilterActive={isAnyFilterActive()}
        />
      </motion.div>
    </motion.div>
  )
}
