"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FilterIcon, Loader2, Tag, InfoIcon } from "lucide-react"
import { getProductsAdmin, updateProductStatus } from "@/lib/api"
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
import ProductTable from "@/components/products/product-table";
import { cn } from "@/lib/utils";

interface ProductFilters {
  productId?: string
  ownerId?: string
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
  { key: 'ownerId', label: '商家ID' },
]
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [filters, setFilters] = useState<ProductFilters>({})
  const [tempFilters, setTempFilters] = useState<ProductFilters>({})
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['id', 'name', 'category', 'minPrice', 'totalStock', 'status'])
  const { token, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()

  const buildQuery = (f: ProductFilters, page: number, size: number) => {
    const params = new URLSearchParams()
    params.append('page', String(page))
    params.append('size', String(size))

    if (f.productId) {
      params.append('productId', f.productId)
      return params.toString()
    }

    if (f.ownerId) params.append('ownerId', f.ownerId)
    if (f.name) params.append('name', f.name)
    if (f.category) params.append('category', f.category)
    if (f.description) params.append('description', f.description)
    if (f.status && f.status !== 'all') params.append('status', f.status)
    if (typeof f.priceFrom === 'number') params.append('priceFrom', String(f.priceFrom))
    if (typeof f.priceTo === 'number') params.append('priceTo', String(f.priceTo))
    if (typeof f.stockFrom === 'number') params.append('stockFrom', String(f.stockFrom))
    if (typeof f.stockTo === 'number') params.append('stockTo', String(f.stockTo))

    return params.toString()
  }

  const fetchProducts = async (page: number, f: ProductFilters, size: number) => {
    setIsFetching(true)
    try {
      if (!isAuthLoading && !token) {
        toast.error('请先登录')
        router.push('/auth/login')
        setIsFetching(false)
        return
      }

      if (token) {
        const q = buildQuery(f, page, size)
        const data = await getProductsAdmin(token, q)
        console.log("Fetched products data:", data);
        setProducts(data.list || [])
        setTotalPages(data.pages || 1)
        setTotalProducts(data.total || 0)

        if (page > (data.pages || 1) && (data.pages || 1) > 0) {
          setCurrentPage(data.pages);
        } else if ((data.pages || 1) === 0) {
          setCurrentPage(1);
        } else {
          setCurrentPage(page);
        }
      }

    } catch (e: any) {
      console.error(e)
      if (e.response && e.response.status === 401) {
        toast.error("认证失败，请重新登录");
        router.push("/auth/login");
      } else {
        toast.error('获取商品列表失败', { description: e.message || "未知错误" })
      }
      setProducts([])
      setTotalPages(1)
      setTotalProducts(0)
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    if (!isAuthLoading) {
      if (token) {
        fetchProducts(currentPage, filters, pageSize)
      } else {

        toast.error("请先登录");
        router.push("/auth/login");
      }
    }
  }, [currentPage, filters, token, isAuthLoading, router])


  useEffect(() => {
    if (isFilterOpen)
      setTempFilters(filters);
  }, [isFilterOpen, filters])

  const isProductIdActiveInTemp = !!tempFilters.productId;
  const isOwnerIdActiveButNotProductInTemp = !!tempFilters.ownerId && !tempFilters.productId;

  const isFilterRuleDisabled = (fieldKey: keyof ProductFilters) => {
    if (fieldKey === 'productId') {
      return isOwnerIdActiveButNotProductInTemp;
    }
    if (fieldKey === 'ownerId') {
      return isProductIdActiveInTemp;
    }

    return isProductIdActiveInTemp;
  };


  const handleApply = () => {
    const currentTempFilters = {...tempFilters};
    let toApply: ProductFilters = {};

    Object.keys(currentTempFilters).forEach(key => {
      const value = currentTempFilters[key as keyof ProductFilters];
      if (typeof value === 'string' && value !== '') {
        toApply[key as keyof ProductFilters] = value as any;
      } else if (typeof value === 'number' && !isNaN(value)) {
        toApply[key as keyof ProductFilters] = value as any;
      }
    });
    setCurrentPage(1);
    setFilters(toApply);
    setIsFilterOpen(false);
  }

  const handleReset = () => {
    const resetState: ProductFilters = {};
    setTempFilters(resetState);
    setFilters(resetState);
    setCurrentPage(1);
    setIsFilterOpen(false);
  }

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

      await fetchProducts(currentPage, filters, pageSize)
    } catch (e: any) {
      toast.error('更新商品状态失败', { description: e.message || '未知错误' })
    }
  }

  const handleViewDetails = (id: number | null | undefined) => {
    if (id == null || !Number.isFinite(id) || isContentDisabled) {
      console.warn("[ViewDetails] Invalid product ID or content disabled:", id);
      return;
    }
    router.push(`/admin/products/${id}`);
  }

  function onProductEdit(id: number) {
    if (id == null || !Number.isFinite(id) || isContentDisabled) {
      console.warn("[ViewDetails] Invalid product ID or content disabled:", id);
      return;
    }
    router.push(`/account/merchant/products/${id}`);
  }

  const isAnyFilterActive = () => {

    return Object.keys(filters).some(key => {
      const value = filters[key as keyof ProductFilters];
      if (typeof value === 'string') {
        return value !== '';
      }
      if (typeof value === 'number') {
        return !isNaN(value);
      }
      return value !== undefined && value !== null;
    });
  }

  const isInitialLoading = isFetching && products.length === 0 && !isAnyFilterActive()
  const isContentDisabled = isFetching || isAuthLoading;

  const applyLineThrough = (fieldKey: keyof ProductFilters) => {
    return cn(isFilterRuleDisabled(fieldKey) && 'line-through');
  }

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="space-y-6 mt-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">商品管理</h1>
          <p className="text-muted-foreground">查看和管理所有商品</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">

          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2" disabled={isContentDisabled}>
                <FilterIcon className="h-4 w-4" />
                <span>搜索和筛选</span>
                {isAnyFilterActive() && (
                  <Badge variant="secondary" className="h-5 min-w-5 p-0 flex items-center justify-center">
                    <FilterIcon className="h-3 w-3"/> 
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-4 space-y-3" align="end">

              <div className="grid gap-2">
                <Label htmlFor="productId">商品ID (精确)</Label>
                <Input
                  id="productId"
                  placeholder="输入商品ID"
                  type="text"
                  value={tempFilters.productId || ""}
                  onChange={(e) => setTempFilters({ productId: e.target.value })}
                  disabled={isContentDisabled || isFilterRuleDisabled('productId')}
                  className={applyLineThrough('productId')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ownerId">商家ID (精确)</Label>
                <Input
                  id="ownerId"
                  placeholder="输入商家ID"
                  type="text"
                  value={tempFilters.ownerId || ""}
                  onChange={(e) => setTempFilters((prev) => {
                    const value = e.target.value;
                    const newState = { ...prev, ownerId: value };
                    if (value && newState.productId !== undefined) {
                      newState.productId = undefined;
                    }
                    return newState;
                  })}
                  disabled={isContentDisabled || isFilterRuleDisabled('ownerId')}
                  className={applyLineThrough('ownerId')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">商品名称 (模糊)</Label>
                <Input
                  id="name"
                  placeholder="输入商品名称"
                  value={tempFilters.name || ""}
                  onChange={(e) => setTempFilters((prev) => ({ ...prev, name: e.target.value }))}
                  disabled={isContentDisabled || isFilterRuleDisabled('name')}
                  className={applyLineThrough('name')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">分类 (模糊)</Label>
                <Input
                  id="category"
                  placeholder="输入分类"
                  value={tempFilters.category || ""}
                  onChange={(e) => setTempFilters((prev) => ({ ...prev, category: e.target.value }))}
                  disabled={isContentDisabled || isFilterRuleDisabled('category')}
                  className={applyLineThrough('category')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">描述 (模糊)</Label>
                <Input
                  id="description"
                  placeholder="输入描述"
                  value={tempFilters.description || ""}
                  onChange={(e) => setTempFilters((prev) => ({ ...prev, description: e.target.value }))}
                  disabled={isContentDisabled || isFilterRuleDisabled('description')}
                  className={applyLineThrough('description')}
                />
              </div>

              <div className="grid gap-2">
                <Label>状态</Label>
                <Select
                  value={tempFilters.status || "all"}
                  onValueChange={(val) => setTempFilters((prev) => ({ ...prev, status: val === "all" ? undefined : val }))}
                  disabled={isContentDisabled || isFilterRuleDisabled('status')}
                >
                  <SelectTrigger className={applyLineThrough('status')}> 
                    <SelectValue placeholder="所有状态" />
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
                <div
                  className={cn(
                    "flex space-x-2",
                    isContentDisabled && "opacity-50 cursor-not-allowed",
                    applyLineThrough('priceFrom')
                  )}
                > 
                  <Input
                    type="number"
                    placeholder="最低"
                    step="0.01"
                    value={tempFilters.priceFrom ?? ""}
                    onChange={(e) => setTempFilters((prev) => ({ ...prev, priceFrom: e.target.value ? Number(e.target.value) : undefined }))}
                    disabled={isContentDisabled || isFilterRuleDisabled('priceFrom')}
                    className={applyLineThrough('priceFrom')}
                  />
                  <Input
                    type="number"
                    placeholder="最高"
                    step="0.01"
                    value={tempFilters.priceTo ?? ""}
                    onChange={(e) => setTempFilters((prev) => ({ ...prev, priceTo: e.target.value ? Number(e.target.value) : undefined }))}
                    disabled={isContentDisabled || isFilterRuleDisabled('priceTo')}
                    className={applyLineThrough('priceTo')}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>库存范围</Label>
                <div
                  className={cn(
                    "flex space-x-2",
                    isContentDisabled && "opacity-50 cursor-not-allowed",
                    applyLineThrough('stockFrom')
                  )}
                > 
                  <Input
                    type="number"
                    placeholder="最低"
                    step="1"
                    value={tempFilters.stockFrom ?? ""}
                    onChange={(e) => setTempFilters((prev) => ({ ...prev, stockFrom: e.target.value ? Number(e.target.value) : undefined }))}
                    disabled={isContentDisabled || isFilterRuleDisabled('stockFrom')}
                    className={applyLineThrough('stockFrom')}
                  />
                  <Input
                    type="number"
                    placeholder="最高"
                    step="1"
                    value={tempFilters.stockTo ?? ""}
                    onChange={(e) => setTempFilters((prev) => ({ ...prev, stockTo: e.target.value ? Number(e.target.value) : undefined }))}
                    disabled={isContentDisabled || isFilterRuleDisabled('stockTo')}
                    className={applyLineThrough('stockTo')}
                  />
                </div>
              </div>

              {(isProductIdActiveInTemp || isOwnerIdActiveButNotProductInTemp) && (
                <div className="text-sm text-yellow-600 italic mt-2">
                  <InfoIcon className="inline h-4 w-4 mr-1" />
                  {isProductIdActiveInTemp
                    ? "精确商品ID搜索已激活，忽略其它设置"
                    : "精确商家ID搜索已激活，忽略商品ID"
                  }
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <Button variant="outline" onClick={handleReset} disabled={isContentDisabled}>
                  重置
                </Button>
                <Button onClick={handleApply} disabled={isContentDisabled}>
                  {(isFetching && Object.keys(tempFilters).length > 0) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  应用
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={isContentDisabled}>
                <Tag className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end"> 
              <DropdownMenuLabel>显示栏目</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allColumns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  className="flex items-center"
                  checked={visibleColumns.includes(col.key)}
                  onCheckedChange={(checked) => {
                    setVisibleColumns((prev) => {

                      if (!checked && prev.length === 1) {
                        toast.warning("至少保留一列显示");
                        return prev;
                      }
                      if (checked) return [...prev, col.key];
                      return prev.filter((c) => c !== col.key);
                    });
                  }}
                  disabled={visibleColumns.length === 1 && visibleColumns[0] === col.key}
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
          onEdit={onProductEdit}
        />
      </motion.div>
    </motion.div>
  );
}