"use client"

import { OrderDetails } from "@/lib/types";
import { useAuth } from "@/components/auth-provider";
import { getMyOrderDetails } from "@/lib/api";
import { Button } from "@/components/ui/button";
import OrderDetail from "@/components/order-detail";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function MerchantOrderPage({params: paramsPromise}: { params: Promise<{ id: string }> }) {
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
        const data = await getMyOrderDetails(Number(id), token);
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">订单详情</h1>
        <Button onClick={() => router.back()}>返回</Button>
      </div>

      <OrderDetail orderDetails={orderDetails}/>
    </div>
  );
}