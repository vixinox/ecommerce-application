"use client"

import { OrderTimeline } from "@/components/order-timeline"
import { API_URL, getOrderDetailAdmin } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface OrderDetails {
  order: {
    id: number;
    totalAmount: number;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  items: {
    id: number;
    snapshotProductName: string;
    snapshotVariantColor: string;
    snapshotVariantSize: string;
    snapshotVariantImage: string;
    quantity: number;
    purchasedPrice: number;
  }[];
  buyerInfo: {
    nickname: string;
    email: string;
    avatar: string;
  };
}

export default function OrderPage({params: paramsPromise}: { params: Promise<{ id: string }> }) {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const {token, isLoading} = useAuth();
  const router = useRouter();

  const params = use(paramsPromise);
  const {id} = params;

  useEffect(() => {
    if (isLoading) return;

    if (!token) {
      toast.error("请先登录");
      router.push("/auth/login");
      return;
    }

    const fetchOrder = async () => {
      try {
        const data = await getOrderDetailAdmin(Number(id), token);
        setOrderDetails(data);
      } catch (error: any) {
        toast.error("获取订单详情失败", {description: error.message});
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [isLoading, token, router, id]);

  if (loading) {
    return <div className="container mx-auto py-6">加载中...</div>;
  }

  if (!orderDetails) {
    return <div className="container mx-auto py-6">订单不存在</div>;
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('zh-CN', {style: 'currency', currency: 'CNY'}).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('zh-CN');

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">订单详情</h1>
        <Button onClick={() => router.back()}>返回</Button>
      </div>

      <div className="shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          订单号：#{orderDetails.order.id}
        </h2>

        <div className="mb-6">
          <OrderTimeline
            status={orderDetails.order.status}
            createdAt={formatDate(orderDetails.order.createdAt)}
            updatedAt={formatDate(orderDetails.order.updatedAt)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">客户信息</h3>
            <div className="flex items-center gap-2">
              <Image
                src={`${API_URL}/api/image${orderDetails.buyerInfo.avatar}` || "/default-avatar.png"}
                alt="用户头像"
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <p>昵称：{orderDetails.buyerInfo.nickname}</p>
                <p>邮箱：{orderDetails.buyerInfo.email}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">订单金额</h3>
            <p>商品总额：{formatCurrency(orderDetails.order.totalAmount)}</p>
            <p>实付金额：{formatCurrency(orderDetails.order.totalAmount)}</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">商品清单</h3>
          <div className="space-y-4">
            {orderDetails.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 border-b pb-4"
              >
                <Image
                  src={`${API_URL}/api/image${item.snapshotVariantImage}` || "/placeholder-product.jpg"}
                  alt="商品图片"
                  width={80}
                  height={80}
                  className="rounded-md"
                />
                <div className="flex-1">
                  <p className="font-medium">{item.snapshotProductName}</p>
                  <div className="text-sm text-gray-600">
                    <p>颜色：{item.snapshotVariantColor}</p>
                    <p>尺寸：{item.snapshotVariantSize}</p>
                    <p>单价：{formatCurrency(item.purchasedPrice)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p>×{item.quantity}</p>
                  <p className="font-medium">
                    {formatCurrency(item.purchasedPrice * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-end">
            <div className="text-right space-y-2">
              <p className="text-lg">
                订单总额：{" "}
                <span className="font-semibold text-2xl">
                  {formatCurrency(orderDetails.order.totalAmount)}
                </span>
              </p>
              <p className="text-sm text-gray-400">
                创建时间：{formatDate(orderDetails.order.createdAt)}
              </p>
              <p className="text-sm text-gray-400">
                最后更新：{formatDate(orderDetails.order.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}