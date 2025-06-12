"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, DollarSign, Loader2, PackageCheck, ShoppingBag, XCircle } from "lucide-react"
import { useAuth } from "@/providers/auth-provider";
import { API_URL } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { ChartContainer, ChartTooltipContent, } from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface MerchantDashboardData {
  pendingOrdersCount: number;
  totalOrdersCount: number;
  totalSalesAmount: number;
  activeProductsCount: number;
  lowStockProductsCount: number;
  salesOverviewData: SalesDataPoint[] | null;
  recentOrders: RecentOrderDTO[] | null;
}

interface SalesDataPoint {
  period: string;
  amount: number;
}

interface RecentOrderDTO {
  orderId: number;
  orderDate: string;
  totalAmount: number;
  status: string;
  customerUsername: string;
}


const chartConfig = {
  amount: {
    label: "销售额",
    color: "hsl(var(--chart-1))",
  },
  period: {
    label: "日期",
  },
};

const getStatusBadge = (status?: string) => {
  switch (status?.toUpperCase()) {
    case "PENDING_PAYMENT":
      return <Badge variant="outline">待支付</Badge>;
    case "PENDING":
      return <Badge variant="outline">待发货</Badge>;
    case "SHIPPED":
      return <Badge className="bg-yellow-500 hover:bg-yellow-500/80">已发货</Badge>;
    case "COMPLETED":
      return <Badge className="bg-green-500 hover:bg-green-500/80">已完成</Badge>;
    case "CANCELED":
      return <Badge variant="destructive">已取消</Badge>;
    default:
      return <Badge variant="secondary">{status || "未知状态"}</Badge>;
  }
};

export default function MerchantDashboardPage() {
  const {token, isLoading: isAuthLoading} = useAuth();
  const [data, setData] = useState<MerchantDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      if (isAuthLoading) return;
      if (!token) {
        setError("用户未登录或授权已过期");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/dashboard/merchant`, {
          headers: {Authorization: `Bearer ${token}`},
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
        }

        const fetchedData: MerchantDashboardData = await res.json();
        setData(fetchedData);
      } catch (err: any) {
        console.error("Error fetching merchant dashboard:", err);
        setError(err.message || "获取仪表盘数据时发生未知错误");
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboardData();
  }, [token, isAuthLoading]);


  const formattedSalesData = useMemo(() => {
    if (!data?.salesOverviewData) return [];
    return [...data.salesOverviewData].sort((a, b) => a.period.localeCompare(b.period));
  }, [data?.salesOverviewData]);

  if (isLoading) {
    return (
      <div className="space-y-6 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
        <p className="ml-2 text-muted-foreground">加载仪表盘数据中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-6">
        <XCircle className="h-4 w-4"/>
        <AlertTitle>加载失败</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">仪表盘</h3>
        <p className="text-sm text-muted-foreground">您的店铺表现和销售概览。</p>
      </div>
      <Separator/>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总销售额</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(data?.totalSalesAmount ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总订单数</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalOrdersCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待发货订单</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.pendingOrdersCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">在售商品</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.activeProductsCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">低库存</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.lowStockProductsCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">库存低于 10 件的款式</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>销售概览</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] border-t pt-6">
            {formattedSalesData.length > 0 ? (
              <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-full">
                <LineChart
                  accessibilityLayer
                  data={formattedSalesData}
                  margin={{
                    left: 12,
                    right: 12,
                  }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                  <XAxis
                    dataKey="period"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <Tooltip content={<ChartTooltipContent/>}/>
                  <Line
                    dataKey="amount"
                    type="monotone"
                    strokeWidth={2}
                    dot={true}
                  />
                </LineChart>
              </ChartContainer>
            ) : (

              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">暂无销售数据</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>近期订单</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col border-t pt-6 overflow-hidden">
            {data?.recentOrders && data.recentOrders.length > 0 ? (
              <div className="overflow-y-auto h-full pr-2 -mr-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>订单号</TableHead>
                      <TableHead>日期</TableHead>
                      <TableHead>客户</TableHead>
                      <TableHead className="text-right">金额</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentOrders.map((order) => (
                      <TableRow key={order.orderId}>
                        <TableCell className="font-medium">{order.orderId}</TableCell>
                        <TableCell>{format(new Date(order.orderDate), 'yyyy-MM-dd HH:mm')}</TableCell>
                        <TableCell>{order.customerUsername}</TableCell>
                        <TableCell className="text-right">{formatPrice(order.totalAmount)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">暂无近期订单</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}