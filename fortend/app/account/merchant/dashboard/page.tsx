"use client";

import {useEffect, useState} from "react";
import {AlertTriangle, BarChart3, DollarSign, Loader2, PackageCheck, ShoppingBag, XCircle} from "lucide-react"
import {useAuth} from "@/components/auth-provider";
import {API_URL} from "@/lib/api";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Separator} from "@/components/ui/separator"
import {formatPrice} from "@/lib/utils";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";

interface MerchantDashboardData {
  pendingOrdersCount: number;
  totalOrdersCount: number;
  totalSalesAmount: number;
  activeProductsCount: number;
  lowStockProductsCount: number;
}

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
  }, [token]);

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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总销售额</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(data?.totalSalesAmount ?? 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总订单数</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalOrdersCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待发货订单</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.pendingOrdersCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">在售商品</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.activeProductsCount ?? 0}</div>
          </CardContent>
        </Card>
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
