"use client";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { CreditCard } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, } from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useAuth } from "@/components/auth-provider";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";

interface TimeBasedSpend {
  period: string;
  amount: number;
}

interface CategorySpend {
  category: string;
  amount: number;
}

interface ItemSpend {
  name: string;
  variant: string;
  spend: number;
  quantity: number;
}

interface SpendingReportDTO {
  totalSpend: number;
  totalOrders: number;
  averageOrderValue: number;
  monthlySpendTrend: TimeBasedSpend[];
  categorySpend: CategorySpend[];
  topItemSpend: ItemSpend[];
}

const monthlySpendChartConfig = {
  amount: {
    label: "消费金额",
    color: "hsl(var(--chart-1))",
  },
  period: {
    label: "月份"
  }
} satisfies ChartConfig;

const PIE_CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
];

export default function SpendingReportDashboard() {
  const {token, isLoading} = useAuth();
  const [reportData, setReportData] = useState<SpendingReportDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (isLoading) return;
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/api/orders/report`, {
          method: "GET",
          headers: {Authorization: `Bearer ${token}`}
        });

        if (!response.ok) {
          const errorText = await response.text();
          try {
            const errorJson = JSON.parse(errorText);
            toast.error(errorJson.message || response.statusText);
            setError(errorJson.message || `Error: ${response.statusText}`);
          } catch {
            toast.error(errorText || response.statusText);
            setError(errorText || `Error: ${response.statusText}`);
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: SpendingReportDTO = await response.json();
        setReportData(data);
      } catch (err: any) {
        console.error("Error fetching spending report:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);
  const monthlySpendDataForChart = useMemo(() => {
    const today = new Date();
    const last12MonthsData: TimeBasedSpend[] = [];
    const fetchedDataMap = reportData?.monthlySpendTrend
      ? new Map(reportData.monthlySpendTrend.map(item => [item.period, item]))
      : new Map();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const period = `${year}-${month}`;

      const dataPoint = fetchedDataMap.get(period);

      last12MonthsData.push({
        period: period,
        amount: dataPoint ? dataPoint.amount : 0,
      });
    }
    return last12MonthsData;
  }, [reportData?.monthlySpendTrend]);


  const hasConsumptionData = useMemo(() => {
    return reportData &&
           (reportData.totalSpend > 0 ||
            (reportData.monthlySpendTrend && reportData.monthlySpendTrend.length > 0) ||
            (reportData.categorySpend && reportData.categorySpend.length > 0) ||
            (reportData.topItemSpend && reportData.topItemSpend.length > 0));
  }, [reportData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatMonth = (period: string) => {
    try {
      const [year, month] = period.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('zh-CN', {month: 'short', year: '2-digit'});
    } catch (e) {
      return period;
    }
  }

  if (loading) {
    return (
      <Card className="flex h-[400px] flex-col items-center justify-center text-center">
        <CardHeader>
          <CardTitle>加载中...</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center w-full px-8">
          <Progress value={null} className="w-full max-w-sm"/>
          <p className="mt-4 text-sm text-muted-foreground">正在加载消费报告...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex h-[400px] flex-col items-center justify-center text-center border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">加载失败</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center w-full px-8">
          <p className="mb-4 mt-2 text-sm text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground">请稍后再试。</p>
        </CardContent>
      </Card>
    );
  }

  if (!hasConsumptionData) {
    return (
      <div
        className="flex h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground"/>
          <h3 className="mt-4 text-lg font-semibold">没有消费记录</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            您还没有消费记录。完成一笔订单后，您的消费报告将在此显示。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>消费概览</CardTitle>
          <CardDescription>您至今为止的消费统计。</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center p-4 border rounded-md">
            <span className="text-sm text-muted-foreground">总消费金额</span>
            <span className="text-2xl font-bold mt-1">{formatCurrency(reportData?.totalSpend ?? 0)}</span>
          </div>
          <div className="flex flex-col items-center p-4 border rounded-md">
            <span className="text-sm text-muted-foreground">总订单数</span>
            <span className="text-2xl font-bold mt-1">{reportData?.totalOrders ?? 0}</span>
          </div>
          <div className="flex flex-col items-center p-4 border rounded-md">
            <span className="text-sm text-muted-foreground">平均单笔金额</span>
            <span className="text-2xl font-bold mt-1">{formatCurrency(reportData?.averageOrderValue ?? 0)}</span>
          </div>
        </CardContent>
      </Card>

      <Separator/>

      {monthlySpendDataForChart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>月消费趋势</CardTitle>
            <CardDescription>显示您最近12个月的消费金额变化。</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={monthlySpendChartConfig} className="aspect-auto h-[300px] w-full">
              <BarChart data={monthlySpendDataForChart}>
                <CartesianGrid vertical={false}/>
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => formatMonth(value)}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  tickFormatter={(value: number) => formatCurrency(value)}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => formatMonth(value)}
                      className="w-[150px]"
                    />
                  }
                />
                <Bar dataKey="amount" fill="var(--color-amount)" radius={4}/>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <Separator/>

      {reportData?.categorySpend && reportData.categorySpend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>消费分类构成</CardTitle>
            <CardDescription>显示您在不同商品分类上的消费占比。</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.categorySpend}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label={(entry) => entry.category}
                >
                  {reportData.categorySpend.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]}/>
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name]}/>
                <Legend/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Separator/>

      {reportData?.topItemSpend && reportData.topItemSpend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>常购商品</CardTitle>
            <CardDescription>您购买金额最高的前 {reportData.topItemSpend.length} 个商品或特定款式。</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商品名称</TableHead>
                  <TableHead>款式</TableHead>
                  <TableHead className="text-right">消费金额</TableHead>
                  <TableHead className="text-right">购买数量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.topItemSpend.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.variant || '无'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.spend)}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}