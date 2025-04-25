"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { CreditCard } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
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

const categorySpendChartConfig = {
  amount: {
    label: "消费金额",
  },
  category: {
    label: "分类"
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
  const { token } = useAuth();
  const [reportData, setReportData] = useState<SpendingReportDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/api/order/report`, {
          method: "GET",
          headers: {Authorization: `Bearer ${token}`}
        });

        if (!response.ok) {
          toast.error(response.text());
        }

        const data: SpendingReportDTO = await response.json();
        setReportData(data);

      } catch (err: any) {
        console.error("Error fetching spending report:", err);
        setError(err.message || "An error occurred while fetching the report.");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [token]); // effect 依赖于 token

  // 判断是否有实际的消费数据（不仅仅是DTO结构存在，而是里面的列表是否有数据）
  const hasConsumptionData = useMemo(() => {
    return reportData &&
      (reportData.totalSpend > 0 ||
        (reportData.monthlySpendTrend && reportData.monthlySpendTrend.length > 0) ||
        (reportData.categorySpend && reportData.categorySpend.length > 0) ||
        (reportData.topItemSpend && reportData.topItemSpend.length > 0));
  }, [reportData]);


  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    // 你可以根据需要调整本地化和货币符号
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY', // 或者 USD, EUR 等
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Helper function to format month string for display
  const formatMonth = (period: string) => {
    try {
      // period is like "YYYY-MM"
      const [year, month] = period.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1); // Month is 0-indexed
      return date.toLocaleDateString('zh-CN', { month: 'short', year: '2-digit' }); // 例如 "1月23"
    } catch (e) {
      return period;
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <Progress value={50} className="w-1/2" />
        <p className="mt-4 text-sm text-muted-foreground">正在加载消费报告...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center text-destructive">
        <p className="text-lg font-semibold">加载失败</p>
        <p className="mb-4 mt-2 text-sm">{error}</p>
        <p className="text-xs text-muted-foreground">请稍后再试。</p>
      </div>
    );
  }

  if (!hasConsumptionData) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">没有消费记录</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            你还没有消费记录
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
            <span className="text-2xl font-bold mt-1">{formatCurrency(reportData.totalSpend ?? 0)}</span>
          </div>
          <div className="flex flex-col items-center p-4 border rounded-md">
            <span className="text-sm text-muted-foreground">总订单数</span>
            <span className="text-2xl font-bold mt-1">{reportData.totalOrders ?? 0}</span>
          </div>
          <div className="flex flex-col items-center p-4 border rounded-md">
            <span className="text-sm text-muted-foreground">平均单笔金额</span>
            <span className="text-2xl font-bold mt-1">{formatCurrency(reportData.averageOrderValue ?? 0)}</span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {reportData.monthlySpendTrend && reportData.monthlySpendTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>月消费趋势</CardTitle>
            <CardDescription>显示您按月的消费金额变化。</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={monthlySpendChartConfig} className="aspect-auto h-[300px] w-full">
              <BarChart data={reportData.monthlySpendTrend}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8}
                       tickFormatter={(value) => formatMonth(value)}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => formatMonth(value)}
                      formatter={(value: number, name: string) => [formatCurrency(value), monthlySpendChartConfig.amount.label]}
                      className="w-[150px]"
                    />
                  }
                />
                <Bar dataKey="amount" fill="var(--color-amount)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <Separator />

      {reportData.categorySpend && reportData.categorySpend.length > 0 && (
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
                  {reportData.categorySpend.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name]} /> {/* Tooltip显示金额和分类名 */}
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Separator />

      {reportData.topItemSpend && reportData.topItemSpend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>常购商品</CardTitle>
            <CardDescription>您购买金额最高的前 {reportData.topItemSpend.length} 个商品或变体。</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商品名称</TableHead>
                  <TableHead>变体</TableHead>
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