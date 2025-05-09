"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Package, ShoppingBag, TrendingUp, Users } from "lucide-react"
import { getDashboardData } from "@/lib/api"
import { useRouter } from "next/navigation";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { useAuth } from "@/components/auth-provider";
import { DashboardData } from "@/lib/types";

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

const recentSalesChartConfig = {
  amount: {
    label: "销售额",
    color: "hsl(var(--chart-1))",
  },
  date: {
    label: "日期",
  }
} satisfies ChartConfig;

const productCategoriesChartConfig = {
  count: {
    label: "商品数量",
    color: "hsl(var(--chart-2))",
  },
  category: {
    label: "分类"
  }
} satisfies ChartConfig;

const orderStatusesChartConfig = {
  count: {
    label: "订单数量",
    color: "hsl(var(--chart-3))",
  },
  status: {
    label: "状态"
  }
} satisfies ChartConfig;

const statusMap: Record<string, string> = {
  PENDING: "待发货",
  SHIPPED: "已发货",
  CANCELED: "已取消",
  COMPLETED: "已完成",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const {token, isLoading} = useAuth()
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isLoading) return;
        if (!token) {
          toast.error("请先登录")
          router.push('/auth/login')
          return
        }
        const dashboardData = await getDashboardData(token)
        setData(dashboardData)
        console.log(dashboardData)
      } catch (error: any) {
        toast.error("获取仪表盘数据失败", {description: error.message})
      }
    }
    fetchData()
  }, [isLoading, token])

  const formatRevenue = (value: number | undefined) => {
    if (value === undefined) return "¥0";
    return `¥${value.toLocaleString()}`;
  }
  const formatCount = (value: number | undefined) => {
    if (value === undefined) return "0个";
    return `${value}个`;
  }

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="space-y-6 mt-6">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight">仪表盘</h1>
        <p className="text-muted-foreground">欢迎回来，这里是您的电商平台概览</p>
      </motion.div>
      <motion.div variants={item} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总用户数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24"/>
            ) : (
              <div className="text-2xl font-bold">{data?.totalUsers || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总商品数</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24"/>
            ) : (
              <div className="text-2xl font-bold">{data?.totalProducts || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总订单数</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24"/>
            ) : (
              <div className="text-2xl font-bold">{data?.totalOrders || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总收入</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24"/>
            ) : (
              <div className="text-2xl font-bold">{formatRevenue(data?.totalRevenue || 0)}</div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle>近期销售</CardTitle>
            <CardDescription>过去30天的销售趋势</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-full w-full"/>
              </div>
            ) : (
              <ChartContainer config={recentSalesChartConfig} className="h-full w-full">
                <LineChart
                  accessibilityLayer
                  data={data?.recentSales || []}
                  margin={{
                    left: 12,
                    right: 12,
                  }}
                >
                  <CartesianGrid vertical={false}/>
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatRevenue(value as number)}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent
                      hideLabel
                      formatter={(value) => formatRevenue(value as number)}
                      nameKey="amount"
                    />}
                  />
                  <Line dataKey="amount" type="natural" stroke="var(--color-amount)" strokeWidth={2}/>
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>商品分类</CardTitle>
              <CardDescription>按分类统计的商品数量</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-full w-full"/>
                </div>
              ) : (
                <ChartContainer config={productCategoriesChartConfig} className="h-full w-full">
                  <BarChart
                    accessibilityLayer
                    data={data?.productCategoryCounts || []}
                    layout="vertical"
                    margin={{
                      left: 20,
                      right: 12,
                    }}
                  >
                    <CartesianGrid horizontal={false}/>
                    <YAxis
                      dataKey="category"
                      tickLine={false}
                      axisLine={false}
                      type="category"
                      minTickGap={4}
                    />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => formatCount(value as number)}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent
                        hideLabel
                        formatter={(value) => formatCount(value as number)}
                        nameKey="count"
                      />}
                    />
                    <Bar dataKey="count" fill="var(--color-count)" radius={5}/>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>订单状态</CardTitle>
              <CardDescription>按状态统计的订单数量</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-full w-full"/>
                </div>
              ) : (
                <ChartContainer config={orderStatusesChartConfig} className="h-full w-full">
                  <BarChart
                    accessibilityLayer
                    data={
                      (data?.orderStatusCounts?.map(item => ({
                        ...item,
                        status: statusMap[item.status] || item.status,
                      })) || []).filter(item => item.status !== "PENDING_PAYMENT")
                    }
                    layout="vertical"
                    margin={{
                      left: 20,
                      right: 12,
                    }}
                  >
                    <CartesianGrid horizontal={false}/>
                    <YAxis
                      dataKey="status"
                      tickLine={false}
                      axisLine={false}
                      type="category"
                      minTickGap={4}
                    />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => formatCount(value as number)}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent
                        hideLabel
                        formatter={(value) => formatCount(value as number)}
                        nameKey="status"
                      />}
                    />
                    <Bar dataKey="count" fill="var(--color-count)" radius={5}/>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  )
}