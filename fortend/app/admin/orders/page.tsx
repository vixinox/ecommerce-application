"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  CalendarIcon,
  FilterIcon,
  InfoIcon,
  Loader2,
  TagIcon,
  X
} from "lucide-react"
import { getOrdersAdmin, updateOrderStatus } from "@/lib/api"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, isValid } from "date-fns"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label";
import { OrderDto, OrdersResponse } from "@/lib/types";
import OrdersTable from "@/components/orders/order-table";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export interface OrderFilters {
  orderId?: string | undefined
  userId?: string | undefined
  username?: string | undefined
  productName?: string | undefined
  status?: string | undefined
  dateFrom?: Date | undefined
  dateTo?: Date | undefined
}

const allOrderColumns: { key: string, label: string }[] = [
  { key: 'id', label: '订单号' },
  { key: 'userId', label: '用户ID' },
  { key: 'itemsSummary', label: '商品信息' },
  { key: 'totalAmount', label: '总金额' },
  { key: 'status', label: '状态' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '更新时间' },
];

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

  if (filters.dateFrom instanceof Date && isValid(filters.dateFrom)) {
    params.append('dateFrom', format(filters.dateFrom, 'yyyy-MM-dd'));
  }
  if (filters.dateTo instanceof Date && isValid(filters.dateTo)) {
    params.append('dateTo', format(filters.dateTo, 'yyyy-MM-dd'));
  }
  console.log("Orders filters (applied):", filters);
  console.log("Orders queryParams:", params.toString());
  return params.toString();
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderDto[]>([])
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
  const { token, isLoading: isAuthLoading } = useAuth()
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
        toast.error("获取订单列表失败", { description: "API 返回了非预期的数据格式或数据结构。" });
      }
    } catch (error: any) {
      console.error("Error fetching orders:", error);

      if (error.response && error.response.status === 401) {
        toast.error("认证失败，请重新登录");
        router.push("/auth/login");
      } else {
        toast.error("获取订单列表失败", { description: error.message || "未知错误" });
      }
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

      setTempOrdersFilters(ordersFilters);
    }
  }, [isFilterPopoverOpen, ordersFilters]);
  
  const isOrderIdSearchActive = !!tempOrdersFilters.orderId;
  const isUserIdSearchActiveButNotOrderId = !!tempOrdersFilters.userId && !tempOrdersFilters.orderId;
  
  const handleApplyFilters = () => {
    const currentTempFilters = { ...tempOrdersFilters };
    let filtersToApply: OrderFilters;
    if (isOrderIdSearchActive) {
      filtersToApply = {
        orderId: currentTempFilters.orderId
      };
    } else {
      filtersToApply = {
        userId: currentTempFilters.userId ? currentTempFilters.userId : undefined,
        username: currentTempFilters.username ? currentTempFilters.username : undefined,
        productName: currentTempFilters.productName ? currentTempFilters.productName : undefined,
        status: currentTempFilters.status ? currentTempFilters.status : undefined,
        dateFrom: currentTempFilters.dateFrom instanceof Date && isValid(currentTempFilters.dateFrom) ? currentTempFilters.dateFrom : undefined,
        dateTo: currentTempFilters.dateTo instanceof Date && isValid(currentTempFilters.dateTo) ? currentTempFilters.dateTo : undefined,
      };
      Object.keys(filtersToApply).forEach(key => filtersToApply[key as keyof OrderFilters] === '' && delete filtersToApply[key as keyof OrderFilters]);
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
      if (value instanceof Date) {
        return isValid(value);
      }
      return value !== undefined && value !== null;
    });
  };
  
  const handleStatusChange = async (id: number | undefined | null, status: string) => {
    if (id == null || !Number.isFinite(id)) {
      toast.error("更新订单状态失败", { description: `无效的订单ID: ${id}` });
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
      await updateOrderStatus(Number(id), status, token)
      toast.success("订单状态已更新")
      await fetchOrders(currentPage, ordersFilters, pageSize);
    } catch (error: any) {
      toast.error("更新订单状态失败", { description: error.message || "未知错误" })
    }
  }
  
  const isInitialLoading = isFetching && orders.length === 0 && !isAnyFilterActive();
  const isContentDisabled = isFetching || isAuthLoading;


  return (
    <motion.div initial="hidden" animate="show" variants={container} className="space-y-6 mt-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">订单管理</h1>
          <p className="text-muted-foreground">查看和管理平台上的订单</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2" disabled={isContentDisabled}>
                <FilterIcon className="h-4 w-4" />
                <span>搜索和筛选</span>
                {isAnyFilterActive() && (
                  <Badge variant="secondary" className="h-5 min-w-5 p-0 flex items-center justify-center">
                    <FilterIcon className="h-3 w-3" /> 
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-4 space-y-4" align="end">
              <div className="grid gap-2">
                <Label htmlFor="orderId-filter">订单号 (精确)</Label>
                <Input
                  id="orderId-filter"
                  placeholder="输入订单号"
                  value={tempOrdersFilters.orderId || ""}
                  onChange={(e) => setTempOrdersFilters((prev) => ({ ...prev, orderId: e.target.value, userId: undefined, username: undefined, productName: undefined, status: undefined, dateFrom: undefined, dateTo: undefined }))}
                  disabled={isContentDisabled}
                  className={cn(isUserIdSearchActiveButNotOrderId && 'line-through')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="userId-filter">用户ID (精确)</Label>
                <Input
                  id="userId-filter"
                  placeholder="输入用户ID"
                  value={tempOrdersFilters.userId || ""}
                  onChange={(e) => setTempOrdersFilters((prev) => ({ ...prev, userId: e.target.value, orderId: undefined, username: e.target.value ? prev.username : undefined }))}
                  disabled={isContentDisabled || isOrderIdSearchActive}
                  className={cn(isOrderIdSearchActive && 'line-through')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username-filter">用户名 (模糊)</Label>
                <Input
                  id="username-filter"
                  placeholder="输入用户名"
                  value={tempOrdersFilters.username || ""}
                  onChange={(e) => setTempOrdersFilters((prev) => ({ ...prev, username: e.target.value, orderId: undefined }))}
                  disabled={isContentDisabled || isOrderIdSearchActive || isUserIdSearchActiveButNotOrderId}
                  className={cn((isOrderIdSearchActive || isUserIdSearchActiveButNotOrderId) && 'line-through')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="productName-filter">商品名称 (模糊)</Label>
                <Input
                  id="productName-filter"
                  placeholder="输入商品名称"
                  value={tempOrdersFilters.productName || ""}
                  onChange={(e) => setTempOrdersFilters((prev) => ({ ...prev, productName: e.target.value, orderId: undefined }))}
                  disabled={isContentDisabled || isOrderIdSearchActive}
                  className={cn(isOrderIdSearchActive && 'line-through')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status-filter">状态</Label>
                <Select
                  value={tempOrdersFilters.status || "all"}
                  onValueChange={(value) =>
                    setTempOrdersFilters((prev) => ({ ...prev, status: value === "all" ? undefined : value, orderId: undefined }))
                  }
                  disabled={isContentDisabled || isOrderIdSearchActive}
                >
                  <SelectTrigger id="status-filter" className={cn(isOrderIdSearchActive && 'line-through')}> 
                    <SelectValue placeholder="所有状态" />
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
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                    (isContentDisabled || isOrderIdSearchActive) && "opacity-50 cursor-not-allowed",
                    isOrderIdSearchActive && 'line-through'
                  )}
                >
                  
                  <Popover>
                    <PopoverTrigger asChild disabled={isContentDisabled || isOrderIdSearchActive}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "flex-grow justify-start text-left font-normal rounded-r-none",
                          !tempOrdersFilters.dateFrom && "text-muted-foreground"
                        )}
                        disabled={isContentDisabled || isOrderIdSearchActive}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {tempOrdersFilters.dateFrom instanceof Date && isValid(tempOrdersFilters.dateFrom) ? format(tempOrdersFilters.dateFrom, "yyyy-MM-dd") : <span>开始日期</span>}
                      </Button>
                    </PopoverTrigger>
                    
                    {isFilterPopoverOpen && !(isContentDisabled || isOrderIdSearchActive) && (
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={tempOrdersFilters.dateFrom instanceof Date && isValid(tempOrdersFilters.dateFrom) ? tempOrdersFilters.dateFrom : undefined}
                          onSelect={(date) => setTempOrdersFilters((prev) => ({ ...prev, dateFrom: date, orderId: undefined }))}
                          initialFocus
                          disabled={isContentDisabled || isOrderIdSearchActive}
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
                        setTempOrdersFilters((prev) => ({ ...prev, dateFrom: undefined }));
                      }}
                      disabled={isContentDisabled || isOrderIdSearchActive}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div
                  className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                    (isContentDisabled || isOrderIdSearchActive) && "opacity-50 cursor-not-allowed",
                    isOrderIdSearchActive && 'line-through'
                  )}
                >
                  
                  <Popover>
                    <PopoverTrigger asChild disabled={isContentDisabled || isOrderIdSearchActive}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "flex-grow justify-start text-left font-normal rounded-r-none",
                          !tempOrdersFilters.dateTo && "text-muted-foreground"
                        )}
                        disabled={isContentDisabled || isOrderIdSearchActive}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {tempOrdersFilters.dateTo instanceof Date && isValid(tempOrdersFilters.dateTo) ? format(tempOrdersFilters.dateTo, "yyyy-MM-dd") : <span>结束日期</span>}
                      </Button>
                    </PopoverTrigger>
                    
                    {isFilterPopoverOpen && !(isContentDisabled || isOrderIdSearchActive) && (
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={tempOrdersFilters.dateTo instanceof Date && isValid(tempOrdersFilters.dateTo) ? tempOrdersFilters.dateTo : undefined}
                          onSelect={(date) => setTempOrdersFilters((prev) => ({ ...prev, dateTo: date, orderId: undefined }))}
                          initialFocus
                          disabled={isContentDisabled || isOrderIdSearchActive}
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
                        setTempOrdersFilters((prev) => ({ ...prev, dateTo: undefined }));
                      }}
                      disabled={isContentDisabled || isOrderIdSearchActive}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleResetFilters} disabled={isContentDisabled}>
                  重置
                </Button>
                <Button onClick={handleApplyFilters} disabled={isContentDisabled}>
                  {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                  应用筛选
                </Button>
              </div>
              
              {(isOrderIdSearchActive || isUserIdSearchActiveButNotOrderId) && (
                <div className="text-sm text-yellow-600 mt-2 italic">
                  <InfoIcon className="inline h-4 w-4 mr-1" />
                  {isOrderIdSearchActive ? "精确订单号搜索已激活，忽略其它设置" : "用户ID搜索已激活，忽略订单号和用户名模糊匹配"}
                </div>
              )}

            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={isContentDisabled}>
                <TagIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>显示栏目</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allOrderColumns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  className="flex items-center"
                  checked={visibleOrderColumns.includes(col.key)}
                  onCheckedChange={(checked) => {
                    setVisibleOrderColumns((prev) => {

                      if (!checked && prev.length === 1) return prev;
                      if (checked) return [...prev, col.key];
                      return prev.filter((c) => c !== col.key);
                    });
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
      <OrdersTable
        orders={orders}
        isLoading={isFetching}
        isInitialLoading={isInitialLoading}
        totalOrders={totalOrders}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onStatusChange={handleStatusChange}
        visibleColumns={visibleOrderColumns}
        allColumns={allOrderColumns}
        isContentDisabled={isContentDisabled}
        isAnyFilterActive={isAnyFilterActive()}
      />
    </motion.div>
  );
}