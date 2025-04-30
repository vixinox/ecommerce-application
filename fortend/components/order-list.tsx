'use client';

import { useEffect, useState } from 'react';
import { useAuth } from "@/components/auth-provider";
import { API_URL } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, XCircle } from "lucide-react";
import { OrderDTO } from "@/lib/types";

export default function OrderList() {
  const {token} = useAuth();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      if (!token) {
        setLoading(false);
        setError("请登录以查看您的订单。");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/order/get`, {
          method: "GET",
          headers: {"Authorization": `Bearer ${token}`},
        });
        if (!res.ok) {
          const errorBody = await res.text();
          throw new Error(`Failed to fetch orders: ${res.status} - ${errorBody || res.statusText}`);
        }
        const data: OrderDTO[] = await res.json();
        setOrders(data);
      } catch (e: any) {
        console.error("Error fetching orders:", e);
        setError(e.message || "加载订单失败。");
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchOrders();
    } else {
      setLoading(false);
      setError("等待认证信息...");
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin mb-3"/>
        <p className="text-lg font-medium">加载订单中...</p>
        <p className="text-sm">请稍候</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center text-red-500">
        <XCircle className="h-10 w-10 mb-3"/>
        <p className="text-lg font-semibold">无法加载订单</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div
        className="flex h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <Package className="h-10 w-10 text-muted-foreground"/>
          <h3 className="mt-4 text-lg font-semibold">还没有订单记录</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            暂时还没有订单记录，您的订单会记录到这里
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {orders.map((orderDto) => {
        const title = orderDto.items.length > 1
          ? `${orderDto.items[0].snapshotProductName} 等${orderDto.items.length}个商品`
          : orderDto.items[0].snapshotProductName;

        return (
          <Card key={orderDto.order.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="text-xl font-bold">{title}</span>
                <Badge
                  variant={getOrderStatusBadgeVariant(orderDto.order.status)}
                  className="text-base font-semibold px-3 py-1"
                >
                  {getOrderStatusText(orderDto.order.status)}
                </Badge>
              </CardTitle>
              <CardDescription className="flex flex-col sm:flex-row sm:justify-between sm:gap-2">
                <span>下单时间: {formatDate(orderDto.order.createdAt)}</span>
                <span className="text-lg font-bold text-primary">
                  总金额: {formatCurrency(orderDto.order.totalAmount)}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <h4 className="text-md font-semibold mb-3 px-6">商品清单</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">商品</TableHead>
                    <TableHead>规格</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead className="text-right">单价</TableHead>
                    <TableHead className="text-right">小计</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderDto.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.snapshotProductName}</TableCell>
                      <TableCell>
                        {[item.snapshotVariantColor, item.snapshotVariantSize].filter(Boolean).join(" / ") || "默认"}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.purchasedPrice)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.quantity * item.purchasedPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    }).format(date);
  } catch (e) {
    console.error("Failed to format date:", dateString, e);
    return dateString;
  }
}

function formatCurrency(amount: number): string {
  try {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  } catch (e) {
    console.error("Failed to format currency:", amount, e);
    return `￥${amount.toFixed(2)}`;
  }
}

function getOrderStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' | null | undefined {
  const lowerStatus = status.toLowerCase();
  switch (lowerStatus) {
    case '待发货':
      return 'default';
    case '待收货':
      return 'secondary';
    case '已完成':
      return 'outline';
    case '已取消':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getOrderStatusText(status: string): string {
  const lowerStatus = status.toLowerCase();
  switch (lowerStatus) {
    case '待发货':
      return '待发货';
    case '待收货':
      return '待收货';
    case '已完成':
      return '已完成';
    case '已取消':
      return '已取消';
    default:
      return status;
  }
}