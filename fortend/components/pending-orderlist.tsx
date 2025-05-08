// ~/components/pending/PendingOrderList.tsx
"use client";

import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CreditCard, XCircle } from "lucide-react"; // 导入 XCircle 图标
import { AnimatePresence, motion } from "framer-motion";
import { usePendingPayment } from "@/hooks/usePendingPayment";
import { API_URL } from "@/lib/api";


const itemVariants = {
  initial: { opacity: 0, height: 0, y: 20 },
  animate: {
    opacity: 1,
    height: "auto",
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 }, // Use spring for nicer entry
  },
  exit: {
    opacity: 0,
    height: 0,
    y: -20,
    transition: { duration: 0.3 }, // Shorter duration for exit
  },
};


export default function PendingOrderList() {
  // 从 Context 中获取状态和方法
  const {
    pendingOrders,
    isLoading,
    selectedCount,
    hasSelectableOrders,
    paymentAttemptDetails, // Check if payment is being attempted
    toggleOrderSelection,
    handlePaySelected,
    cancelOrderHandler, // 新增的取消处理函数
    formatPrice, // Helpers from context
    formatTimeRemaining,
    getPaymentProgress,
    getCountdownColorClass,
    getProgressBarColor,
  } = usePendingPayment();

  // Calculate total payable for selected orders (excluding expired)
  const totalPayable = pendingOrders.reduce((total, order) => {
    if (order.isSelected && !order.isExpired) {
      const orderTotal = order.items.reduce((sum, item) => sum + item.purchasedPrice * item.quantity, 0);
      return total + orderTotal;
    }
    return total;
  }, 0);

  // Disable buttons/interactions while loading or if a payment attempt is active
  const isInteractiveDisabled = isLoading || paymentAttemptDetails !== null;


  if (isLoading) {
    return (
      <div className="flex h-full flex-col space-y-4 p-6">
        <h2 className="text-lg font-semibold">待支付订单</h2>
        <Separator />
        <div className="flex-1 overflow-y-auto py-2 pr-2 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start py-4">
              <Skeleton className="h-16 w-16 rounded-md" />
              <div className="ml-4 flex-1 flex flex-col space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-1/4 mt-2" />
              </div>
            </div>
          ))}
        </div>
        <Separator />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (pendingOrders.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-6">
        <Clock className="h-16 w-16 text-muted-foreground" />
        <div className="text-xl font-medium text-center">您没有待支付订单</div>
        <p className="text-center text-muted-foreground">完成下单操作以在此处查看待支付订单。</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between py-4">
        <h2 className="text-lg font-semibold">待支付订单 ({pendingOrders.length})</h2>
      </div>
      <Separator />
      <div
        className="flex-1 overflow-y-auto py-2 pr-2"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {/* Use AnimatePresence to animate list changes (like item removal) */}
        <AnimatePresence>
          {pendingOrders.map((orderDto) => {
            const orderTotal = orderDto.items.reduce((sum, item) => sum + item.purchasedPrice * item.quantity, 0);
            const progress = getPaymentProgress(orderDto);
            const progressBarColor = getProgressBarColor(progress); // Use progress bar color helper
            // Check if the order is part of the currently initiated payment attempt
            const isPartOfPaymentAttempt = paymentAttemptDetails?.orderIds.includes(orderDto.order.id);

            return (
              <motion.div
                key={orderDto.order.id}
                layout // Enable layout animations
                initial="initial"
                animate="animate"
                exit="exit"
                variants={itemVariants}
                className={`order-item border-b last:border-b-0 py-4 ${orderDto.isExpired ? "grayscale opacity-60" : ""} ${isPartOfPaymentAttempt ? "pointer-events-none opacity-80" : ""}`}
              >
                <div className="flex items-start mb-4 space-x-3">
                  <Checkbox
                    id={`order-${orderDto.order.id}`}
                    checked={orderDto.isSelected}
                    // Disable checkbox if expired, loading, part of payment attempt, or global disabled
                    onCheckedChange={() => toggleOrderSelection(orderDto.order.id)}
                    disabled={orderDto.isExpired || isInteractiveDisabled || isPartOfPaymentAttempt}
                    className={orderDto.isExpired || isInteractiveDisabled || isPartOfPaymentAttempt ? "cursor-not-allowed" : ""}
                  />
                  <label
                    htmlFor={`order-${orderDto.order.id}`}
                    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 ${
                      orderDto.isExpired ? "text-gray-500 dark:text-gray-600" : ""
                    }`}
                  >
                    订单号: {orderDto.order.id}
                  </label>
                  <div className={`ml-auto text-sm font-medium flex items-center ${getCountdownColorClass(orderDto.timeRemaining, orderDto.isExpired)}`}>
                    <Clock className="h-4 w-4 inline-block mr-1 align-text-bottom" />
                    {orderDto.isExpired ? "已过期" : formatTimeRemaining(orderDto.timeRemaining)}
                  </div>
                  {/* Cancel Button */}
                  {orderDto.isExpired ? (
                    <span className="text-xs text-amber-500 ml-2">已过期关闭</span> // Display text instead of button if expired
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2 h-7 px-2 text-xs"
                      onClick={() => cancelOrderHandler(orderDto.order.id)}
                      disabled={isInteractiveDisabled || isPartOfPaymentAttempt} // Disable if loading, part of payment attempt, or global disabled
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      取消
                    </Button>
                  )}

                </div>

                {!orderDto.isExpired && (
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
                    {/* Progress bar color styling */}
                    <Progress
                      value={progress}
                      className="h-full transition-all duration-300"
                      style={{
                        '--progress-background': progress >= 10 ? progressBarColor.light : progressBarColor.dark, // Use dynamic value
                        '--progress-foreground': progress >= 10 ? progressBarColor.dark : progressBarColor.light, // Swap colors for dark mode or low progress
                        '[&>div]': { backgroundColor: progressBarColor.light }, // General style for light mode
                        '.dark &[&>div]': { backgroundColor: progressBarColor.dark }, // Specific style for dark mode

                        backgroundColor: progressBarColor.light,
                      } as React.CSSProperties}
                    />
                    <style jsx global>{`
                        .order-item .progress div {
                            background-color: ${progress >= 10 ? progressBarColor.light : '#gray'}; /* Fallback */
                            transition: width 0.3s ease-in-out; /* Smooth transition */
                        }
                         .dark .order-item .progress div {
                            background-color: ${progress >= 10 ? progressBarColor.dark : '#darkgray'}; /* Fallback */
                        }
                    `}</style>
                    {/* Reverting to standard className approach as style prop might fight library styles */}
                    <Progress
                      value={progress}
                      className={`h-full transition-all duration-300 ${
                        progress <= 10 ? 'bg-red-500 dark:bg-red-700' :
                          progress <= 30 ? 'bg-orange-500 dark:bg-orange-700' :
                            progress <= 60 ? 'bg-cyan-500 dark:bg-cyan-700' :
                              'bg-blue-500 dark:bg-blue-700' // Use Tailwind classes directly
                      }`}
                    />
                  </div>
                )}
                <div className="space-y-4 pl-6">
                  {orderDto.items.map((item) => (
                    <div key={item.id} className="flex items-start">
                      <div className="relative h-14 w-14 overflow-hidden rounded-md border bg-gray-100">
                        <Image
                          src={`${API_URL}/api/image${item.snapshotVariantImage}` || "/placeholder.svg"}
                          alt={`${item.snapshotProductName} (${item.snapshotVariantColor}/${item.snapshotVariantSize})`}
                          fill
                          className="object-cover"
                          sizes="60px"
                        />
                      </div>
                      <div className="ml-3 flex-1 flex flex-col">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-amber-50 line-clamp-1">
                          {item.snapshotProductName}
                        </h4>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                          {item.snapshotVariantColor} / {item.snapshotVariantSize}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-gray-700 dark:text-amber-50">
                            {formatPrice(item.purchasedPrice)} x {item.quantity}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-amber-50">
                            {formatPrice(item.purchasedPrice * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end items-center mt-4 pr-6">
                  <span className="text-sm text-gray-700 dark:text-amber-50 mr-2">订单总计:</span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-amber-50">{formatPrice(orderTotal)}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <Separator className="mt-2" />
      <div className="space-y-4 py-4">
        <div className="flex justify-between font-semibold text-base text-gray-900 dark:text-amber-50">
          <span>已选 ({selectedCount || 0}) 总计</span>{/* Ensure 0 is displayed if no selection */}
          <span>{formatPrice(totalPayable)}</span>
        </div>
        <Button
          className="w-full min-h-10"
          onClick={handlePaySelected}
          // Disable if no order is selected OR interaction is globally disabled (loading, payment attempt underway)
          disabled={selectedCount === 0 || isInteractiveDisabled}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          去支付已选订单 ({selectedCount || 0})
        </Button>
        {!hasSelectableOrders && pendingOrders.length > 0 && (
          <p className="text-center text-sm text-orange-500">所有订单已过期，无法支付。</p>
        )}
        {/* Optional message if payment attempt is active */}
        {paymentAttemptDetails && (
          <p className="text-center text-sm text-blue-500">正在准备支付...请稍候或前往支付页面。</p>
        )}
      </div>
    </div>
  );
}
