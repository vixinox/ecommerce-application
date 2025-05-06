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
import { Eye, RefreshCw, FilterIcon, X, Loader2, CalendarIcon } from "lucide-react"
import { getOrders, updateOrderStatus } from "@/lib/api"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, isValid } from "date-fns"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label";

interface Order {
  id: number
  orderNumber: string
  userId: number
  status: string
  totalAmount: number
  createdAt: string
  updatedAt: string
}

interface OrderFilters {
  orderId?: string | undefined
  userId?: string | undefined
  username?: string | undefined
  productName?: string | undefined
  status?: string | undefined
  dateFrom?: Date | undefined
  dateTo?: Date | undefined
}

interface OrdersResponse {
  list: Order[]
  total: number
  pageNum: number
  pageSize: number
  size: number
  pages: number
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

const buildOrdersQueryParams = (filters: OrderFilters, page: number, size: number): string => {
  const params = new URLSearchParams();

  params.append('page', String(page));
  params.append('size', String(size));

  if (filters.orderId) {
    params.append('orderId', filters.orderId);
  }
  if (filters.userId) {
    params.append('userId', filters.userId);
  }
  if (filters.username) {
    params.append('username', filters.username);
  }
  if (filters.productName) {
    params.append('productName', filters.productName);
  }
  if (filters.status && filters.status !== "all") {
    params.append('status', filters.status);
  }
  if (filters.dateFrom && isValid(filters.dateFrom)) {
    params.append('dateFrom', format(filters.dateFrom, 'yyyy-MM-dd'));
  }
  if (filters.dateTo && isValid(filters.dateTo)) {
    params.append('dateTo', format(filters.dateTo, 'yyyy-MM-dd'));
  }

  console.log("Orders filters:", filters);
  console.log("Orders queryParams:", params.toString());

  return params.toString();
};


export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0);

  const [ordersFilters, setOrdersFilters] = useState<OrderFilters>({});
  const [tempOrdersFilters, setTempOrdersFilters] = useState<OrderFilters>({});
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  const {token, isLoading: isAuthLoading} = useAuth()
  const [isFetching, setIsFetching] = useState(false)
  const router = useRouter()

  const fetchOrders = async (page: number, currentFilters: OrderFilters, size: number) => {
    if (!isFetching) {
      setIsFetching(true);
    }

    try {
      if (!token) {
        if (!isAuthLoading) {
          toast.error("请先登录");
          router.push("/auth/login");
        }
        return;
      }

      const queryParams = buildOrdersQueryParams(currentFilters, page, size);
      const data: OrdersResponse = await getOrders(token, queryParams);

      console.log("Fetched orders data:", data);

      if (data && Array.isArray(data.list)) {
        setOrders(data.list);

        setTotalPages(data.pages || 1);
        setTotalOrders(data.total || 0);

        if (page > (data.pages || 1) && (data.pages || 1) > 0) {
          setCurrentPage(data.pages);
        } else if ((data.pages || 1) === 0) {
          setCurrentPage(1);
        } else {
          setCurrentPage(page);
        }

      } else {
        console.error("Unexpected orders data structure:", data);
        setOrders([]);
        setTotalPages(1);
        setTotalOrders(0);
        toast.error("获取订单列表失败", {description: "API 返回了非预期的数据格式或数据结构。"});
      }

    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast.error("获取订单列表失败", {description: error.message || "未知错误"})
      setOrders([]);
      setTotalPages(1);
      setTotalOrders(0);
    } finally {
      setIsFetching(false);
    }
  }

  useEffect(() => {

    if (!isAuthLoading) {
      if (token) {
        fetchOrders(currentPage, ordersFilters, pageSize)
      } else {
        toast.error("请先登录");
        router.push("/auth/login");
        setIsFetching(false);
      }
    }

  }, [currentPage, pageSize, ordersFilters, token, isAuthLoading, router])

  useEffect(() => {
    if (isFilterPopoverOpen) {
      setTempOrdersFilters(() => ({
        ...ordersFilters,
        dateFrom: ordersFilters.dateFrom ? new Date(ordersFilters.dateFrom) : undefined,
        dateTo: ordersFilters.dateTo ? new Date(ordersFilters.dateTo) : undefined,
        orderId: ordersFilters.orderId,
        userId: ordersFilters.userId,
        username: ordersFilters.username,
        productName: ordersFilters.productName,
        status: ordersFilters.status,
      }));
    }
  }, [isFilterPopoverOpen, ordersFilters]);

  const handleApplyFilters = () => {
    const currentTempFilters = {...tempOrdersFilters};

    let filtersToApply: OrderFilters;

    if (currentTempFilters.orderId) {
      filtersToApply = {orderId: currentTempFilters.orderId};
    } else {
      filtersToApply = {
        userId: currentTempFilters.userId ? currentTempFilters.userId : undefined,
        username: currentTempFilters.username ? currentTempFilters.username : undefined,
        productName: currentTempFilters.productName ? currentTempFilters.productName : undefined,
        status: currentTempFilters.status ? currentTempFilters.status : undefined,
        dateFrom: currentTempFilters.dateFrom && isValid(currentTempFilters.dateFrom) ? currentTempFilters.dateFrom : undefined,
        dateTo: currentTempFilters.dateTo && isValid(currentTempFilters.dateTo) ? currentTempFilters.dateTo : undefined,
      };
    }

    setCurrentPage(1);
    setOrdersFilters(filtersToApply);
    setIsFilterPopoverOpen(false);
  };

  const handleResetFilters = () => {
    const resetState: OrderFilters = {};
    setTempOrdersFilters(resetState);
    setCurrentPage(1);
    setOrdersFilters(resetState);
    setIsFilterPopoverOpen(false);
  };

  const isAnyFilterActive = () => {
    return Object.keys(ordersFilters).some(key => {
      const value = ordersFilters[key as keyof OrderFilters];
      if (typeof value === 'string') {
        return value !== '';
      }
      return value !== undefined;
    });
  };

  const handleStatusChange = async (id: number, status: string) => {
    if (isFetching || isAuthLoading) return;

    try {
      if (!token) {
        toast.error("请先登录")
        router.push("/auth/login")
        return
      }

      await updateOrderStatus(id, status, token)
      toast.success("订单状态已更新")

      await fetchOrders(currentPage, ordersFilters, pageSize);
    } catch (error: any) {
      toast.error("更新订单状态失败", {description: error.message || "未知错误"})
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return <Badge variant="outline">待发货</Badge>
      case "SHIPPED":
        return <Badge className="bg-yellow-500 hover:bg-yellow-500/80">已发货</Badge>
      case "COMPLETED":
        return <Badge className="bg-green-500 hover:bg-green-500/80">已完成</Badge>
      case "CANCELED":
        return <Badge variant="destructive">已取消</Badge>
      default:
        return <Badge variant="secondary">{status || '未知状态'}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '无效日期';
      return new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return '格式错误';
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  const isInitialLoading = isFetching && orders.length === 0 && !isAnyFilterActive();
  const isOrderIdActive = !!tempOrdersFilters.orderId;

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="space-y-6 mt-6">
      <motion.div variants={item}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">订单管理</h1>
          <p className="text-muted-foreground">查看和管理平台上的订单</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">

          <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2" disabled={isFetching || isAuthLoading}>
                <FilterIcon className="h-4 w-4"/>
                <span>搜索和筛选</span>
                {isAnyFilterActive() && (
                  <Badge variant="secondary" className="h-5 min-w-5 p-0 flex items-center justify-center">
                    <FilterIcon className="h-3 w-3"/>
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-4 space-y-4" align="end">
              <div className="grid gap-2">
                <Label htmlFor="orderId-filter">订单号</Label>
                <Input
                  id="orderId-filter"
                  placeholder="输入订单号 (精确)"
                  value={tempOrdersFilters.orderId || ''}
                  onChange={(e) => setTempOrdersFilters(prev => ({...prev, orderId: e.target.value}))}
                  disabled={isFetching || isAuthLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="userId-filter">用户ID</Label>
                <Input
                  id="userId-filter"
                  placeholder="输入用户ID (精确)"
                  value={tempOrdersFilters.userId || ''}
                  onChange={(e) => setTempOrdersFilters(prev => ({...prev, userId: e.target.value}))}
                  disabled={isOrderIdActive || isFetching || isAuthLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username-filter">用户名</Label>
                <Input
                  id="username-filter"
                  placeholder="输入用户名 (模糊)"
                  value={tempOrdersFilters.username || ''}
                  onChange={(e) => setTempOrdersFilters(prev => ({...prev, username: e.target.value}))}
                  disabled={isOrderIdActive || isFetching || isAuthLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="productName-filter">商品名称</Label>
                <Input
                  id="productName-filter"
                  placeholder="输入商品名称 (模糊)"
                  value={tempOrdersFilters.productName || ''}
                  onChange={(e) => setTempOrdersFilters(prev => ({...prev, productName: e.target.value}))}
                  disabled={isOrderIdActive || isFetching || isAuthLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status-filter">状态</Label>
                <Select
                  value={tempOrdersFilters.status || 'all'}
                  onValueChange={(value) => setTempOrdersFilters(prev => ({
                    ...prev,
                    status: value === "all" ? undefined : value
                  }))}
                  disabled={isOrderIdActive || isFetching || isAuthLoading}
                >
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="所有状态"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有状态</SelectItem>
                    <SelectItem value="PENDING">待发货</SelectItem>
                    <SelectItem value="SHIPPED">已发货</SelectItem>
                    <SelectItem value="COMPLETED">已完成</SelectItem>
                    <SelectItem value="CANCELED">已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>创建时间范围</Label>
                <div
                  className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    (isOrderIdActive || isFetching || isAuthLoading) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Popover>
                    <PopoverTrigger asChild disabled={isOrderIdActive || isFetching || isAuthLoading}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "flex-grow justify-start text-left font-normal rounded-r-none",
                          !tempOrdersFilters.dateFrom && "text-muted-foreground"
                        )}
                        disabled={isOrderIdActive || isFetching || isAuthLoading}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4"/>
                        {tempOrdersFilters.dateFrom ? format(tempOrdersFilters.dateFrom, "yyyy-MM-dd") :
                          <span>开始日期</span>}
                      </Button>
                    </PopoverTrigger>
                    {isFilterPopoverOpen && !(isOrderIdActive || isFetching || isAuthLoading) && (
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={tempOrdersFilters.dateFrom}
                          onSelect={(date) => setTempOrdersFilters(prev => ({...prev, dateFrom: date}))}
                          initialFocus
                          disabled={isOrderIdActive || isFetching || isAuthLoading ? true : undefined}
                        />
                      </PopoverContent>
                    )}
                  </Popover>
                  {tempOrdersFilters.dateFrom && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-full p-1 disabled:pointer-events-none rounded-l-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTempOrdersFilters(prev => ({...prev, dateFrom: undefined}));
                      }}
                      disabled={isOrderIdActive || isFetching || isAuthLoading}
                      type="button"
                    >
                      <X/>
                    </Button>
                  )}
                </div>
                <div
                  className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    (isOrderIdActive || isFetching || isAuthLoading) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Popover>
                    <PopoverTrigger asChild disabled={isOrderIdActive || isFetching || isAuthLoading}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "flex-grow justify-start text-left font-normal rounded-r-none",
                          !tempOrdersFilters.dateTo && "text-muted-foreground"
                        )}
                        disabled={isOrderIdActive || isFetching || isAuthLoading}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4"/>
                        {tempOrdersFilters.dateTo ? format(tempOrdersFilters.dateTo, "yyyy-MM-dd") :
                          <span>结束日期</span>}
                      </Button>
                    </PopoverTrigger>
                    {isFilterPopoverOpen && !(isOrderIdActive || isFetching || isAuthLoading) && (
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={tempOrdersFilters.dateTo}
                          onSelect={(date) => setTempOrdersFilters(prev => ({...prev, dateTo: date}))}
                          initialFocus
                          disabled={isOrderIdActive || isFetching || isAuthLoading ? true : undefined}
                        />
                      </PopoverContent>
                    )}
                  </Popover>
                  {tempOrdersFilters.dateTo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-full p-1 disabled:pointer-events-none rounded-l-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTempOrdersFilters(prev => ({...prev, dateTo: undefined}));
                      }}
                      disabled={isOrderIdActive || isFetching || isAuthLoading}
                      type="button"
                    >
                      <X/>
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleResetFilters} disabled={isFetching || isAuthLoading}>
                  重置
                </Button>
                <Button onClick={handleApplyFilters} disabled={isFetching || isAuthLoading}>
                  {(isFetching && isAnyFilterActive()) && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  应用筛选
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </motion.div>
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle>订单列表</CardTitle>
            <CardDescription>
              {isInitialLoading ? '加载中...' : `共 ${totalOrders} 条订单`}
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            {(isFetching || isAuthLoading) && (
              <div
                className="absolute inset-0 flex items-center justify-center z-10 bg-background/80 rounded-md transition-opacity">
                <Loader2 className="h-8 w-8 text-primary animate-spin"/>
              </div>
            )}
            <div
              className={`overflow-x-auto ${isFetching || isAuthLoading ? 'opacity-50 pointer-events-none' : ''} transition-opacity duration-200`}>
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>用户ID</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isInitialLoading ? (
                    Array.from({length: 5}).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-6 w-24"/></TableCell>
                        <TableCell><Skeleton className="h-6 w-16"/></TableCell>
                        <TableCell><Skeleton className="h-6 w-20"/></TableCell>
                        <TableCell><Skeleton className="h-6 w-24"/></TableCell>
                        <TableCell><Skeleton className="h-6 w-32"/></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2"><Skeleton className="h-7 w-7"/><Skeleton
                            className="h-7 w-7"/></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <>
                      {orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6}
                                     className="text-center py-8 text-muted-foreground">
                            {isAnyFilterActive()
                              ? "根据当前筛选条件未找到订单"
                              : "没有找到订单"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.id}</TableCell>
                            <TableCell className="font-medium">{order.userId}</TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                            <TableCell>{formatDate(order.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => router.push(`/admin/orders/${order.id}`)}
                                  disabled={isFetching || isAuthLoading}
                                >
                                  <Eye className="h-4 w-4"/>
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      disabled={isFetching || isAuthLoading}
                                    >
                                      <RefreshCw className="h-4 w-4"/>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  {!(isFetching || isAuthLoading) && (
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>更新订单状态</DropdownMenuLabel>
                                      <DropdownMenuSeparator/>
                                      <DropdownMenuItem
                                        onClick={() => handleStatusChange(order.id, 'PENDING')}>
                                        待发货
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleStatusChange(order.id, 'SHIPPED')}>
                                        已发货
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleStatusChange(order.id, 'COMPLETED')}>
                                        已完成
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleStatusChange(order.id, 'CANCELED')}>
                                        已取消
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  )}
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
            {totalOrders > 0 && (
              <div
                className={`mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 ${isFetching || isAuthLoading ? 'opacity-50 pointer-events-none' : ''} transition-opacity duration-200`}>
                <Pagination className="mx-auto sm:mx-0 w-full sm:w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        className={`select-none cursor-pointer ${currentPage === 1 || isFetching || isAuthLoading ? "cursor-not-allowed opacity-50" : ""}`}
                        aria-disabled={currentPage === 1 || isFetching || isAuthLoading}
                      />
                    </PaginationItem>

                    {totalPages <= 7 ? (
                      Array.from({length: totalPages}, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className={`select-none cursor-pointer ${currentPage === page || isFetching || isAuthLoading ? "cursor-not-allowed " : ""}`}
                            aria-disabled={isFetching || isAuthLoading}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))
                    ) : (
                      <>
                        <PaginationItem><PaginationLink onClick={() => setCurrentPage(1)} isActive={currentPage === 1}
                                                        aria-disabled={isFetching || isAuthLoading}
                                                        className={`select-none cursor-pointer ${currentPage === 1 || isFetching || isAuthLoading ? "cursor-not-allowed" : ""}`}>1</PaginationLink></PaginationItem>
                        {currentPage > 3 && <PaginationItem> ... </PaginationItem>}
                        {
                          Array.from({length: Math.min(totalPages - 2, 3)}, (_, i) => {
                            let page = currentPage - 1 + i;
                            if (currentPage <= 3) page = 2 + i;
                            if (currentPage > totalPages - 3) page = totalPages - 3 + i;
                            return page;
                          }).filter(page => page > 1 && page < totalPages).map(page => (
                            <PaginationItem key={page}>
                              <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page}
                                              aria-disabled={isFetching || isAuthLoading}
                                              className={`select-none cursor-pointer ${currentPage === page || isFetching || isAuthLoading ? "cursor-not-allowed" : ""}`}>
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))
                        }
                        {currentPage < totalPages - 2 && <PaginationItem> ... </PaginationItem>}
                        <PaginationItem><PaginationLink onClick={() => setCurrentPage(totalPages)}
                                                        isActive={currentPage === totalPages}
                                                        aria-disabled={isFetching || isAuthLoading}
                                                        className={`select-none cursor-pointer ${currentPage === totalPages || isFetching || isAuthLoading ? "cursor-not-allowed" : ""}`}>{totalPages}</PaginationLink></PaginationItem>
                      </>
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        className={`select-none cursor-pointer ${currentPage === totalPages || isFetching || isAuthLoading ? "cursor-not-allowed opacity-50" : ""}`}
                        aria-disabled={currentPage === totalPages || isFetching || isAuthLoading}
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
    </motion.div>
  )
}