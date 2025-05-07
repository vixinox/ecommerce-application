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
import { Eye, FilterIcon, Folder, Loader2, RefreshCw, Tag, Text } from "lucide-react"
import Image from "next/image"
import { API_URL, getProductsAdmin, updateProductStatus } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
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
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Product } from "@/lib/types";

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
  {key: 'image', label: '图片'},
  {key: 'id', label: '商品ID'},
  {key: 'name', label: '商品名称'},
  {key: 'description', label: '描述'},
  {key: 'category', label: '分类'},
  {key: 'minPrice', label: '价格'},
  {key: 'totalStock', label: '库存'},
  {key: 'status', label: '状态'},
  {key: 'ownerId', label: '商家ID'},
]

const container = {hidden: {opacity: 0}, show: {opacity: 1, transition: {staggerChildren: 0.1}}}
const item = {hidden: {opacity: 0, y: 20}, show: {opacity: 1, y: 0}}

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
  const {token, isLoading: isAuthLoading} = useAuth()
  const router = useRouter()

  // 构建查询字符串
  const buildQuery = (f: ProductFilters, page: number, size: number) => {
    const params = new URLSearchParams()
    params.append('page', String(page))
    params.append('size', String(size))
    // 精确搜索：商品ID 或 商家ID
    if (f.productId) {
      params.append('productId', f.productId)
      return params.toString()
    }
    if (f.ownerId) {
      params.append('ownerId', f.ownerId)
      return params.toString()
    }
    // 模糊搜索
    if (f.name) params.append('name', f.name)
    if (f.category) params.append('category', f.category)
    if (f.description) params.append('description', f.description)
    if (f.status && f.status !== 'all') params.append('status', f.status)
    // 范围过滤
    if (typeof f.priceFrom === 'number') params.append('priceFrom', String(f.priceFrom))
    if (typeof f.priceTo === 'number') params.append('priceTo', String(f.priceTo))
    if (typeof f.stockFrom === 'number') params.append('stockFrom', String(f.stockFrom))
    if (typeof f.stockTo === 'number') params.append('stockTo', String(f.stockTo))
    return params.toString()
  }

  // 获取列表
  const fetchProducts = async (page: number, f: ProductFilters, size: number) => {
    setIsFetching(true)
    try {
      if (!token) {
        toast.error('请先登录')
        router.push('/auth/login')
        return
      }
      const q = buildQuery(f, page, size)
      const data = await getProductsAdmin(token, q)
      setProducts(data.list)
      setTotalPages(data.pages)
      setTotalProducts(data.total)
      // 校正页码
      if (page > data.pages && data.pages > 0) setCurrentPage(data.pages)
      else if (data.pages === 0) setCurrentPage(1)
      else setCurrentPage(page)
    } catch (e: any) {
      console.error(e)
      toast.error('获取商品列表失败', {description: e.message})
      setProducts([])
      setTotalPages(1)
      setTotalProducts(0)
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    if (!isAuthLoading && token) {
      fetchProducts(currentPage, filters, pageSize)
    }
  }, [currentPage, filters, token, isAuthLoading])

  useEffect(() => {
    if (isFilterOpen) setTempFilters({...filters})
  }, [isFilterOpen, filters])

  // 应用筛选
  const handleApply = () => {
    let toApply: ProductFilters
    if (tempFilters.productId) {
      toApply = {productId: tempFilters.productId}
    } else if (tempFilters.ownerId) {
      toApply = {ownerId: tempFilters.ownerId}
    } else {
      toApply = {
        name: tempFilters.name,
        category: tempFilters.category,
        description: tempFilters.description,
        status: tempFilters.status,
        priceFrom: tempFilters.priceFrom,
        priceTo: tempFilters.priceTo,
        stockFrom: tempFilters.stockFrom,
        stockTo: tempFilters.stockTo,
      }
    }
    setFilters(toApply)
    setCurrentPage(1)
    setIsFilterOpen(false)
  }

  // 重置筛选
  const handleReset = () => {
    setTempFilters({})
    setFilters({})
    setCurrentPage(1)
    setIsFilterOpen(false)
  }

  // 是否激活任何筛选
  const isAnyFilterActive = () => Object.entries(filters).some(([_, v]) => v !== undefined && v !== '')
  const isExactSearch = () => !!tempFilters.productId || !!tempFilters.ownerId
  const isInitialLoading = isFetching && products.length === 0 && !isAnyFilterActive()

  // 更新状态
  const handleStatusChange = async (id: number, status: string) => {
    if (isFetching || isAuthLoading) return
    try {
      if (!token) {
        toast.error('请先登录')
        router.push('/auth/login')
        return
      }
      await updateProductStatus(id, status, token)
      toast.success('商品状态已更新')
      fetchProducts(currentPage, filters, pageSize)
    } catch (e: any) {
      toast.error('更新商品状态失败', {description: e.message})
    }
  }

  // Status 标签
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">待审核</Badge>
      case 'ACTIVE':
        return <Badge className="bg-green-500">已上架</Badge>
      case 'INACTIVE':
        return <Badge className="bg-gray-500">已下架</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-500">拒绝上架</Badge>
      case 'DELETED':
        return <Badge className="bg-stone-500">已删除</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // 货币格式
  const formatCurrency = (amount?: number) => {
    if (amount == null) return 'N/A'
    return new Intl.NumberFormat('zh-CN', {style: 'currency', currency: 'CNY'}).format(amount)
  }

  const hoverCardContent = {
    description: {icon: <Text className="h-4 w-4"/>, title: '描述'},
    name: {icon: <Tag className="h-4 w-4"/>, title: '商品名称'},
    category: {icon: <Folder className="h-4 w-4"/>, title: '商品分类'}
  }

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="space-y-6 mt-6">
      {/* 顶部 */}
      <motion.div variants={item} className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">商品管理</h1>
          <p className="text-muted-foreground">查看和管理所有商品</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 搜索&筛选 */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2" disabled={isFetching || isAuthLoading}>
                <FilterIcon className="h-4 w-4"/><span>搜索和筛选</span>
                {isAnyFilterActive() && <Badge variant="secondary" className="h-5 w-5 p-0">●</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-4 space-y-3" align="end">
              <div className="grid gap-2">
                <Label htmlFor="productId">商品ID</Label>
                <Input id="productId" placeholder="精确" type="text"
                       value={tempFilters.productId || ''}
                       onChange={e => setTempFilters(prev => ({...prev, productId: e.target.value}))}
                       disabled={isFetching || isAuthLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ownerId">商家ID</Label>
                <Input id="ownerId" placeholder="精确" type="text"
                       value={tempFilters.ownerId || ''}
                       onChange={e => setTempFilters(prev => ({...prev, ownerId: e.target.value}))}
                       disabled={isExactSearch() || isFetching || isAuthLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">商品名称</Label>
                <Input id="name" placeholder="模糊匹配"
                       value={tempFilters.name || ''}
                       onChange={e => setTempFilters(prev => ({...prev, name: e.target.value}))}
                       disabled={isExactSearch() || isFetching || isAuthLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">分类</Label>
                <Input id="category" placeholder="模糊匹配"
                       value={tempFilters.category || ''}
                       onChange={e => setTempFilters(prev => ({...prev, category: e.target.value}))}
                       disabled={isExactSearch() || isFetching || isAuthLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">描述</Label>
                <Input id="description" placeholder="模糊匹配"
                       value={tempFilters.description || ''}
                       onChange={e => setTempFilters(prev => ({...prev, description: e.target.value}))}
                       disabled={isExactSearch() || isFetching || isAuthLoading}
                />
              </div>
              {/* 状态筛选 */}
              <div className="grid gap-2">
                <Label>状态</Label>
                <Select value={tempFilters.status || 'all'}
                        onValueChange={val => setTempFilters(prev => ({
                          ...prev,
                          status: val === 'all' ? undefined : val
                        }))}
                        disabled={isExactSearch() || isFetching || isAuthLoading}
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
              {/* 价格范围 */}
              <div className="grid gap-2">
                <Label>价格范围 (CNY)</Label>
                <div className="flex space-x-2">
                  <Input type="number" placeholder="最低"
                         value={tempFilters.priceFrom ?? ''}
                         onChange={e => setTempFilters(prev => ({
                           ...prev,
                           priceFrom: e.target.value ? Number(e.target.value) : undefined
                         }))}
                         disabled={isExactSearch() || isFetching || isAuthLoading}
                  />
                  <Input type="number" placeholder="最高"
                         value={tempFilters.priceTo ?? ''}
                         onChange={e => setTempFilters(prev => ({
                           ...prev,
                           priceTo: e.target.value ? Number(e.target.value) : undefined
                         }))}
                         disabled={isExactSearch() || isFetching || isAuthLoading}
                  />
                </div>
              </div>
              {/* 库存范围 */}
              <div className="grid gap-2">
                <Label>库存范围</Label>
                <div className="flex space-x-2">
                  <Input type="number" placeholder="最低"
                         value={tempFilters.stockFrom ?? ''}
                         onChange={e => setTempFilters(prev => ({
                           ...prev,
                           stockFrom: e.target.value ? Number(e.target.value) : undefined
                         }))}
                         disabled={isExactSearch() || isFetching || isAuthLoading}
                  />
                  <Input type="number" placeholder="最高"
                         value={tempFilters.stockTo ?? ''}
                         onChange={e => setTempFilters(prev => ({
                           ...prev,
                           stockTo: e.target.value ? Number(e.target.value) : undefined
                         }))}
                         disabled={isExactSearch() || isFetching || isAuthLoading}
                  />
                </div>
              </div>
              {/* 操作按钮 */}
              <div className="flex justify-end gap-2 pt-3">
                <Button variant="outline" onClick={handleReset} disabled={isFetching || isAuthLoading}>重置</Button>
                <Button onClick={handleApply} disabled={isFetching || isAuthLoading}>
                  {(isFetching && isAnyFilterActive()) && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}应用
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* 列选择 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={isFetching || isAuthLoading}>
                <Tag className="h-4 w-4"/>
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
                      if (checked) return [...prev, col.key]
                      return prev.filter(c => c !== col.key)
                    })
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
            <CardDescription>{isInitialLoading ? '加载中...' : `共 ${totalProducts} 条商品`}</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            {(isFetching || isAuthLoading) && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
              </div>
            )}
            <div className={cn(isFetching || isAuthLoading ? 'opacity-50 pointer-events-none' : '')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.includes('image') && <TableHead>图片</TableHead>}
                    {visibleColumns.includes('id') && <TableHead>商品ID</TableHead>}
                    {visibleColumns.includes('name') && <TableHead>名称</TableHead>}
                    {visibleColumns.includes('description') && <TableHead>描述</TableHead>}
                    {visibleColumns.includes('category') && <TableHead>分类</TableHead>}
                    {visibleColumns.includes('minPrice') && <TableHead>价格</TableHead>}
                    {visibleColumns.includes('totalStock') && <TableHead>库存</TableHead>}
                    {visibleColumns.includes('status') && <TableHead>状态</TableHead>}
                    {visibleColumns.includes('ownerId') && <TableHead>商家ID</TableHead>}
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isInitialLoading ? (
                    Array.from({length: 5}).map((_, i) => (
                      <TableRow key={i}>
                        {visibleColumns.includes('image') && <TableCell><Skeleton className="h-10 w-10"/></TableCell>}
                        {visibleColumns.includes('id') && <TableCell><Skeleton className="h-6 w-16"/></TableCell>}
                        {visibleColumns.includes('name') && <TableCell><Skeleton className="h-6 w-24"/></TableCell>}
                        {visibleColumns.includes('description') &&
                         <TableCell><Skeleton className="h-6 w-32"/></TableCell>}
                        {visibleColumns.includes('category') && <TableCell><Skeleton className="h-6 w-16"/></TableCell>}
                        {visibleColumns.includes('minPrice') && <TableCell><Skeleton className="h-6 w-24"/></TableCell>}
                        {visibleColumns.includes('totalStock') &&
                         <TableCell><Skeleton className="h-6 w-16"/></TableCell>}
                        {visibleColumns.includes('status') && <TableCell><Skeleton className="h-6 w-20"/></TableCell>}
                        {visibleColumns.includes('ownerId') && <TableCell><Skeleton className="h-6 w-16"/></TableCell>}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2"><Skeleton className="h-7 w-7"/><Skeleton
                            className="h-7 w-7"/></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={visibleColumns.length + 1}
                                   className="text-center py-8 text-muted-foreground">
                          {isAnyFilterActive() ? '根据筛选未找到商品' : '没有商品'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map(prod => (
                        <TableRow key={prod.id}>
                          {visibleColumns.includes('image') && (
                            <TableCell>
                              <div className="w-10 h-10 relative rounded overflow-hidden">
                                <Image src={`${API_URL}/api/image${prod.defaultImage}` || '/placeholder.svg'}
                                       alt={prod.name} fill className="object-cover" onError={e => {
                                  e.currentTarget.src = '/placeholder.svg'
                                }}/>
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.includes('id') && <TableCell className="font-medium">{prod.id}</TableCell>}
                          {visibleColumns.includes('name') && (
                            <TableCell className="font-medium">
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <div className="max-w-[150px] truncate hover:underline">
                                    {prod.name}
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-64">
                                  <div className="flex gap-2 items-center mb-2">
                                    {hoverCardContent.name.icon}
                                    <h4 className="font-semibold">{hoverCardContent.name.title}</h4>
                                  </div>
                                  <p className="text-sm">{prod.name}</p>
                                </HoverCardContent>
                              </HoverCard>
                            </TableCell>
                          )}

                          {visibleColumns.includes('description') && (
                            <TableCell>
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <div className="max-w-[200px] truncate hover:underline">
                                    {prod.description || '暂无描述'}
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-64">
                                  <div className="flex gap-2 items-center mb-2">
                                    {hoverCardContent.description.icon}
                                    <h4 className="font-semibold">{hoverCardContent.description.title}</h4>
                                  </div>
                                  <p className="text-sm">{prod.description || '暂无描述'}</p>
                                </HoverCardContent>
                              </HoverCard>
                            </TableCell>
                          )}

                          {visibleColumns.includes('category') && (
                            <TableCell>
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <div className="max-w-[120px] truncate hover:underline">
                                    {prod.category}
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-64">
                                  <div className="flex gap-2 items-center mb-2">
                                    {hoverCardContent.category.icon}
                                    <h4 className="font-semibold">{hoverCardContent.category.title}</h4>
                                  </div>
                                  <p className="text-sm">{prod.category}</p>
                                </HoverCardContent>
                              </HoverCard>
                            </TableCell>
                          )}

                          {visibleColumns.includes('minPrice') &&
                           <TableCell>{formatCurrency(prod.minPrice)}</TableCell>}
                          {visibleColumns.includes('totalStock') && <TableCell>{prod.totalStock}</TableCell>}
                          {visibleColumns.includes('status') && <TableCell>{getStatusBadge(prod.status)}</TableCell>}
                          {visibleColumns.includes('ownerId') && <TableCell>{prod.ownerId}</TableCell>}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="icon"
                                      onClick={() => router.push(`/admin/products/${prod.id}`)}>
                                <Eye className="h-4 w-4"/>
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="icon"><RefreshCw className="h-4 w-4"/></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>更新状态</DropdownMenuLabel>
                                  <DropdownMenuSeparator/>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(prod.id, 'ACTIVE')}>上架</DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(prod.id, 'INACTIVE')}>下架</DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(prod.id, 'PENDING')}>待审核</DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(prod.id, 'REJECTED')}>拒绝</DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(prod.id, 'DELETED')}>删除</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )
                  )}
                </TableBody>
              </Table>
            </div>
            {totalProducts > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem className="select-none">
                      <PaginationPrevious onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}/>
                    </PaginationItem>
                    {Array.from({length: totalPages}, (_, i) => i + 1).map(page => (
                      <PaginationItem key={page} className="select-none">
                        <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page}>
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem className="select-none">
                      <PaginationNext onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}/>
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
      </motion.div>
    </motion.div>
  )
}