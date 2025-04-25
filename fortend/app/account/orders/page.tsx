import type { Metadata } from "next"
import { Separator } from "@/components/ui/separator"
import OrderList from "@/components/order-list";

export const metadata: Metadata = {
  title: "订单 | Modern E-commerce",
  description: "查看您的订单记录",
}

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">订单</h3>
        <p className="text-sm text-muted-foreground">查看您的历史订单</p>
      </div>
      <Separator />
      <OrderList />
    </div>
  )
}