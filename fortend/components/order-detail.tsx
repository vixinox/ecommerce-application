import OrderTimeline from "@/components/order-timeline";
import { API_URL } from "@/lib/api";
import Image from "next/image";
import { OrderDetails } from "@/lib/types";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('zh-CN', {style: 'currency', currency: 'CNY'}).format(amount);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleString('zh-CN');

export default function OrderDetail({orderDetails}: {orderDetails: OrderDetails}) {
  return (
    <div className="shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">
        订单号：#{orderDetails.order.id}
      </h2>
      <div className="mb-6">
        <OrderTimeline
          status={orderDetails.order.status}
          createdAt={orderDetails.order.createdAt}
          updatedAt={orderDetails.order.updatedAt}
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
  )
}