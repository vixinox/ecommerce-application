"use client";

import { useEffect, useState } from "react";
import type { Metadata } from "next"
import { AlertTriangle, BarChart3, DollarSign, Loader2, PackageCheck, ShoppingBag, XCircle } from "lucide-react"
import { useAuth } from "@/components/auth-provider";
import { API_URL } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// 与后端 MerchantDashboardDTO 对应
interface MerchantDashboardData {
  pendingOrdersCount: number;
  totalOrdersCount: number;
  totalSalesAmount: number;
  activeProductsCount: number;
  lowStockProductsCount: number;
}

// Metadata 不能在客户端组件中导出，可以移到 layout.tsx 或保持在 page.tsx 但在构建时处理
// export const metadata: Metadata = {
//   title: "Dashboard | Merchant Dashboard",
//   description: "Overview of your store performance",
// }

export default function MerchantDashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState<MerchantDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!token) {
        setError("用户未登录或授权已过期");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/dashboard/merchant`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          let errorMsg = `获取仪表盘数据失败: ${res.status}`;
          try {
            const errorData = await res.json();
            errorMsg = errorData.message || errorMsg;
          } catch (jsonError) { /* 忽略json解析错误 */ }
          throw new Error(errorMsg);
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
  }, [token]); // 依赖 token

  if (isLoading) {
    return (
      <div className="space-y-6 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2 text-muted-foreground">加载仪表盘数据中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-6">
        <XCircle className="h-4 w-4" />
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
      <Separator />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* 总销售额 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总销售额</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(data?.totalSalesAmount ?? 0)}</div>
            {/* 可以添加与上期比较的数据，但这需要后端提供更多信息 */}
            {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
          </CardContent>
        </Card>
        {/* 总订单数 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总订单数</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalOrdersCount ?? 0}</div>
            {/* <p className="text-xs text-muted-foreground">+12.5% from last month</p> */}
          </CardContent>
        </Card>
        {/* 待发货订单 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待发货订单</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.pendingOrdersCount ?? 0}</div>
          </CardContent>
        </Card>
        {/* 在售商品数 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">在售商品</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.activeProductsCount ?? 0}</div>
          </CardContent>
        </Card>
        {/* 低库存商品数 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">低库存</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.lowStockProductsCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">库存低于 10 件的款式</p>
          </CardContent>
        </Card>
      </div>

      {/* 下方的图表和近期订单部分保持占位符，需要单独实现数据获取和渲染 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>销售概览</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center border-t pt-6">
            <p className="text-sm text-muted-foreground">销售图表将在此处显示</p>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>近期订单</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center border-t pt-6">
            <p className="text-sm text-muted-foreground">近期订单将在此处显示</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
