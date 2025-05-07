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
import {
  CalendarIcon,
  Eye,
  FilterIcon,
  Loader2,
  ReceiptText,
  RefreshCw,
  ShoppingBagIcon,
  TagIcon,
  UserIcon,
  X
} from "lucide-react"
import { getOrdersAdmin, updateOrderStatus } from "@/lib/api"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
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
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface ApiOrderDto {
  order: {
    id: number;
    orderNumber?: string;
    userId: number;
    status: string;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
  };
  items: any[];
  buyerInfo?: any;
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
  list: ApiOrderDto[];
  total: number;
  pageNum: number;
  pageSize: number;
  size: number;
  pages: number;
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

const allOrderColumns: { key: string, label: string }[] = [
  {key: 'id', label: '订单号'},
  {key: 'userId', label: '用户ID'},
  {key: 'itemsSummary', label: '商品信息'},
  {key: 'totalAmount', label: '总金额'},
  {key: 'status', label: '状态'},
  {key: 'createdAt', label: '创建时间'},
  {key: 'updatedAt', label: '更新时间'},
];

const hoverCardContent = {
  id: {icon: <ReceiptText className="h-4 w-4"/>, title: '订单号'},
  userId: {icon: <UserIcon className="h-4 w-4"/>, title: '用户ID'},
  itemsSummary: {icon: <ShoppingBagIcon className="h-4 w-4"/>, title: '商品详情'},
  createdAt: {icon: <CalendarIcon className="h-4 w-4"/>, title: '创建时间'}
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
  const [orders, setOrders] = useState<ApiOrderDto[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0);

  const [ordersFilters, setOrdersFilters] = useState<OrderFilters>({});
  const [tempOrdersFilters, setTempOrdersFilters] = useState<OrderFilters>({});
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  const [visibleOrderColumns, setVisibleOrderColumns] = useState<string[]>(
    ['id', 'userId', 'itemsSummary', 'totalAmount', 'status', 'createdAt']
  );

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
      const data: OrdersResponse = await getOrdersAdmin(token, queryParams);

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

  const handleStatusChange = async (id: number | undefined | null, status: string) => {
    console.log('[StatusChange Attempt] ID:', id, 'Type:', typeof id, 'New Status:', status);
    if (id == null || !Number.isFinite(id)) {
      toast.error("更新订单状态失败", {description: `无效的订单ID: ${id}`});
      console.error("[StatusChange Error] Invalid Order ID provided:", id);
      return;
    }

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

  const isExactSearchActiveInTempFilters = () => {
    return !!tempOrdersFilters.orderId || !!tempOrdersFilters.userId;
  }

  const isInitialLoading = isFetching && orders.length === 0 && !isAnyFilterActive();
  const isContentDisabled = isFetching || isAuthLoading;

  const getItemSummary = (items: ApiOrderDto['items'] | undefined) => {
    if (!items || items.length === 0) return '无商品';
    const names = items.map(item => item.snapshotProductName).join(', ');
    return `${names} (${items.length}种商品)`;
  };

  const getAllItemNames = (items: ApiOrderDto['items'] | undefined) => {
    if (!items || items.length === 0) return '无商品详情';
    return items.map(item => `${item.productName} x${item.quantity} (${formatCurrency(item.purchasedPrice)})`).join(';\n');
  }

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
              <Button variant="outline" className="flex items-center gap-2" disabled={isContentDisabled}>
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
                  disabled={isContentDisabled}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="userId-filter">用户ID</Label>
                <Input
                  id="userId-filter"
                  placeholder="输入用户ID (精确)"
                  value={tempOrdersFilters.userId || ''}
                  onChange={(e) => setTempOrdersFilters(prev => ({...prev, userId: e.target.value}))}
                  disabled={isExactSearchActiveInTempFilters() || isContentDisabled}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username-filter">用户名</Label>
                <Input
                  id="username-filter"
                  placeholder="输入用户名 (模糊)"
                  value={tempOrdersFilters.username || ''}
                  onChange={(e) => setTempOrdersFilters(prev => ({...prev, username: e.target.value}))}
                  disabled={isExactSearchActiveInTempFilters() || isContentDisabled}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="productName-filter">商品名称</Label>
                <Input
                  id="productName-filter"
                  placeholder="输入商品名称 (模糊)"
                  value={tempOrdersFilters.productName || ''}
                  onChange={(e) => setTempOrdersFilters(prev => ({...prev, productName: e.target.value}))}
                  disabled={isExactSearchActiveInTempFilters() || isContentDisabled}
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
                  disabled={isExactSearchActiveInTempFilters() || isContentDisabled}
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
                    (isExactSearchActiveInTempFilters() || isContentDisabled) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Popover>
                    <PopoverTrigger asChild disabled={isExactSearchActiveInTempFilters() || isContentDisabled}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "flex-grow justify-start text-left font-normal rounded-r-none",
                          !tempOrdersFilters.dateFrom && "text-muted-foreground"
                        )}
                        disabled={isExactSearchActiveInTempFilters() || isContentDisabled}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4"/>
                        {tempOrdersFilters.dateFrom ? format(tempOrdersFilters.dateFrom, "yyyy-MM-dd") :
                          <span>开始日期</span>}
                      </Button>
                    </PopoverTrigger>
                    {isFilterPopoverOpen && !(isExactSearchActiveInTempFilters() || isContentDisabled) && (
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={tempOrdersFilters.dateFrom}
                          onSelect={(date) => setTempOrdersFilters(prev => ({...prev, dateFrom: date}))}
                          initialFocus
                          disabled={isExactSearchActiveInTempFilters() || isContentDisabled ? true : undefined}
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
                      disabled={isExactSearchActiveInTempFilters() || isContentDisabled}
                      type="button"
                    >
                      <X className="h-4 w-4"/>
                    </Button>
                  )}
                </div>
                <div
                  className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    (isExactSearchActiveInTempFilters() || isContentDisabled) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Popover>
                    <PopoverTrigger asChild disabled={isExactSearchActiveInTempFilters() || isContentDisabled}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "flex-grow justify-start text-left font-normal rounded-r-none",
                          !tempOrdersFilters.dateTo && "text-muted-foreground"
                        )}
                        disabled={isExactSearchActiveInTempFilters() || isContentDisabled}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4"/>
                        {tempOrdersFilters.dateTo ? format(tempOrdersFilters.dateTo, "yyyy-MM-dd") :
                          <span>结束日期</span>}
                      </Button>
                    </PopoverTrigger>
                    {isFilterPopoverOpen && !(isExactSearchActiveInTempFilters() || isContentDisabled) && (
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={tempOrdersFilters.dateTo}
                          onSelect={(date) => setTempOrdersFilters(prev => ({...prev, dateTo: date}))}
                          initialFocus
                          disabled={isExactSearchActiveInTempFilters() || isContentDisabled}
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
                      disabled={isExactSearchActiveInTempFilters() || isContentDisabled}
                      type="button"
                    >
                      <X className="h-4 w-4"/>
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleResetFilters} disabled={isContentDisabled}>
                  重置
                </Button>
                <Button onClick={handleApplyFilters} disabled={isContentDisabled}>
                  {(isFetching && isAnyFilterActive()) && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  应用筛选
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={isContentDisabled}>
                <TagIcon className="h-4 w-4"/>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>显示栏目</DropdownMenuLabel>
              <DropdownMenuSeparator/>
              {allOrderColumns.map(col => (
                <DropdownMenuCheckboxItem
                  key={col.key} className="flex items-center"
                  checked={visibleOrderColumns.includes(col.key)}
                  onCheckedChange={(checked) => {
                    setVisibleOrderColumns(prev => {
                      if (checked) return [...prev, col.key]
                      return prev.filter(c => c !== col.key)
                    })
                  }}
                  disabled={visibleOrderColumns.length === 1 && visibleOrderColumns[0] === col.key}
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
            <CardTitle>订单列表</CardTitle>
            <CardDescription>
              {isInitialLoading ? '加载中...' : `共 ${totalOrders} 条订单`}
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            {isContentDisabled && (
              <div
                className="absolute inset-0 flex items-center justify-center z-10 bg-background/80 rounded-md transition-opacity">
                <Loader2 className="h-8 w-8 text-primary animate-spin"/>
              </div>
            )}

            <div className={cn("overflow-x-auto", isContentDisabled && 'opacity-50 pointer-events-none')}>
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    {allOrderColumns.filter(col => visibleOrderColumns.includes(col.key)).map(col => (
                      <TableHead key={col.key}>
                        {col.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isInitialLoading ? (
                    Array.from({length: pageSize}).map((_, i) => (
                      <TableRow key={i}>
                        {allOrderColumns.filter(col => visibleOrderColumns.includes(col.key)).map(col => (
                          <TableCell key={col.key}>
                            <Skeleton className={cn("h-6",
                              col.key === 'itemsSummary' ? 'w-40' :
                                col.key === 'totalAmount' ? 'w-24' :
                                  col.key === 'createdAt' || col.key === 'updatedAt' ? 'w-32' :
                                    'w-16'
                            )}/>
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
                  ) : (
                    orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={visibleOrderColumns.length + 1}
                                   className="text-center py-8 text-muted-foreground">
                          {isAnyFilterActive()
                            ? "根据当前筛选条件未找到订单"
                            : "暂无订单"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map((apiOrderDto, index) => {
                        const order = apiOrderDto.order;

                        return (
                          <TableRow key={order?.id ?? `order-row-${index}`}>
                            {allOrderColumns.filter(col => visibleOrderColumns.includes(col.key)).map(col => (
                              <TableCell key={col.key}>
                                {col.key === 'id' && (
                                  <HoverCard>
                                    <HoverCardTrigger asChild>
                                      <div
                                        className="max-w-[100px] truncate font-medium hover:underline hover:cursor-help">
                                        {order?.id ?? 'N/A'}
                                      </div>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-auto max-w-[300px]">
                                      <div className="flex gap-2 items-center mb-1">
                                        {hoverCardContent.id.icon}
                                        <h4 className="font-semibold">{hoverCardContent.id.title}</h4>
                                      </div>
                                      <p className="text-sm">{order?.id ?? 'N/A'}</p>
                                    </HoverCardContent>
                                  </HoverCard>
                                )}
                                {col.key === 'userId' && (
                                  <HoverCard>
                                    <HoverCardTrigger asChild>
                                      <div
                                        className="max-w-[100px] truncate font-medium hover:underline hover:cursor-help">
                                        {order?.userId ?? 'N/A'}
                                      </div>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-auto max-w-[300px]">
                                      <div className="flex gap-2 items-center mb-1">
                                        {hoverCardContent.userId.icon}
                                        <h4 className="font-semibold">{hoverCardContent.userId.title}</h4>
                                      </div>
                                      <p className="text-sm">{order?.userId ?? 'N/A'}</p>
                                    </HoverCardContent>
                                  </HoverCard>
                                )}
                                {col.key === 'itemsSummary' && (
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
                                      <p className="text-sm leading-relaxed">
                                        {getAllItemNames(apiOrderDto.items)}
                                      </p>
                                    </HoverCardContent>
                                  </HoverCard>
                                )}
                                {col.key === 'totalAmount' && (
                                  formatCurrency(order?.totalAmount)
                                )}
                                {col.key === 'status' && (
                                  getStatusBadge(order?.status)
                                )}
                                {col.key === 'createdAt' && (
                                  formatDate(order?.createdAt)
                                )}
                                {col.key === 'updatedAt' && (
                                  formatDate(order?.updatedAt)
                                )}
                              </TableCell>
                            ))}
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">

                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    const currentOrderId = order?.id;
                                    if (currentOrderId != null && Number.isFinite(currentOrderId)) {
                                      router.push(`/admin/orders/${currentOrderId}`);
                                    } else {
                                      console.error("[ViewButton Error] Invalid order ID for routing:", currentOrderId);
                                      toast.error("无法查看订单详情", {description: `订单ID (${currentOrderId}) 无效，无法跳转。`});
                                    }
                                  }}
                                  disabled={isContentDisabled || order?.id == null}
                                >
                                  <Eye className="h-4 w-4"/>
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      disabled={isContentDisabled || order?.id == null}
                                    >
                                      <RefreshCw className="h-4 w-4"/>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  {!isContentDisabled && (
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>更新订单状态</DropdownMenuLabel>
                                      <DropdownMenuSeparator/>
                                      <DropdownMenuItem
                                        onClick={() => handleStatusChange(order?.id, 'PENDING')}>待发货</DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleStatusChange(order?.id, 'SHIPPED')}>已发货</DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleStatusChange(order?.id, 'COMPLETED')}>已完成</DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleStatusChange(order?.id, 'CANCELED')}>已取消</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  )}
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )
                  )}
                </TableBody>
              </Table>
            </div>

            {totalOrders > 0 && (
              <div className={cn("mt-4 flex flex-col sm:flex-row justify-between items-center gap-4",
             isContentDisabled && 'opacity-50 pointer-events-none')}>
                <div/>
                <Pagination className="sm:mx-0 w-full sm:w-auto ml-12">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        className={cn("select-none cursor-pointer", (currentPage === 1 || isContentDisabled) && "cursor-not-allowed opacity-50")}
                        aria-disabled={currentPage === 1 || isContentDisabled}
                      />
                    </PaginationItem>

                    {totalPages <= 7 ? (
                      Array.from({length: totalPages}, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className={cn("select-none cursor-pointer", isContentDisabled && "cursor-not-allowed opacity-50")}
                            aria-disabled={isContentDisabled}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))
                    ) : (
                      <>
                        <PaginationItem><PaginationLink onClick={() => setCurrentPage(1)} isActive={currentPage === 1}
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
                              <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page}
                                              aria-disabled={isContentDisabled}
                                              className={cn("select-none cursor-pointer", isContentDisabled && "cursor-not-allowed opacity-50")}>
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))
                        }
                        {currentPage < totalPages - 2 &&
                         <PaginationItem><span className="px-2">...</span></PaginationItem>}
                        <PaginationItem><PaginationLink onClick={() => setCurrentPage(totalPages)}
                                                        isActive={currentPage === totalPages}
                                                        aria-disabled={isContentDisabled}
                                                        className={cn("select-none cursor-pointer", (currentPage === totalPages || isContentDisabled) && "cursor-not-allowed opacity-50")}>{totalPages}</PaginationLink></PaginationItem>
                      </>
                    )}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
    </motion.div>
  )
}