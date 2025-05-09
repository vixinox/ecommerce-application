"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CreditCard, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { usePendingPayment } from "@/hooks/usePendingPayment";
import { API_URL } from "@/lib/api";
import Link from "next/link";

export default function PendingOrderList() {
  const {
    pendingOrders,
    isLoading,
    selectedCount,
    hasSelectableOrders,
    paymentInitiationDetails,
    toggleOrderSelection,
    toggleSelectAll,
    preparePayment,
    cancelOrderHandler,
    clearExpiredOrders,
    formatPrice,
    formatTimeRemaining,
    getPaymentProgress,
    getCountdownColorClass,
  } = usePendingPayment();


  const [showEmptyOrders, setShowEmptyOrders] = useState(false);

  const totalPayable = pendingOrders.reduce((total, order) => {
    if (order.isSelected && !order.isExpired) {
      const orderTotal = order.items.reduce((sum, item) => sum + item.purchasedPrice * item.quantity, 0);
      return total + orderTotal;
    }
    return total;
  }, 0);

  const isInteractiveDisabled = isLoading || paymentInitiationDetails !== null;
  const isOrderPartOfPaymentAttempt = (orderId: number) =>
    paymentInitiationDetails?.orderIds.includes(orderId);
  const hasExpiredOrders = pendingOrders.some(order => order.isExpired);
  const expiredOrderCount = pendingOrders.filter(order => order.isExpired).length;
  const selectableOrders = pendingOrders.filter(order =>
    !order.isExpired && !isOrderPartOfPaymentAttempt(order.order.id)
  );
  const selectableOrderCount = selectableOrders.length;
  const bulkSelectCheckboxState =
    selectableOrderCount === 0
      ? false
      : selectedCount === selectableOrderCount
        ? true
        : selectedCount > 0
          ? "indeterminate"
          : false;

  useEffect(() => {
    if (pendingOrders.length === 0) {
      const timeout = setTimeout(() => {
        setShowEmptyOrders(true);
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setShowEmptyOrders(false);
    }
  }, [pendingOrders]);

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


  if (showEmptyOrders) {
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
      <div className="flex items-center space-x-2">
        <Checkbox
          id="select-all-orders"
          checked={bulkSelectCheckboxState}
          onCheckedChange={(checkedState) => {
            toggleSelectAll(!!checkedState);
          }}
          disabled={isInteractiveDisabled || selectableOrderCount === 0}
          aria-label="全选所有待支付订单"
        />
        <label
          htmlFor="select-all-orders"
          className={`text-sm font-medium cursor-${(isInteractiveDisabled || selectableOrderCount === 0) ? 'not-allowed' : 'pointer'} peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pt-0.5`}
        >
          全选
        </label>
      </div>
      <div
        className="flex-1 overflow-y-auto py-2 pr-2"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <AnimatePresence>
          {pendingOrders.map((orderDto) => {
            const orderTotal = orderDto.items.reduce((sum, item) => sum + item.purchasedPrice * item.quantity, 0);
            const progress = getPaymentProgress(orderDto);
            const isPartOfPaymentAttempt = isOrderPartOfPaymentAttempt(orderDto.order.id);
            return (
              <motion.div
                key={orderDto.order.id}
                layout
                initial={{ opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 500, transition: { duration: 0.3, ease: "easeOut" } }}
                className={`order-item border-b last:border-b-0 py-4 ${orderDto.isExpired ? "grayscale opacity-60" : ""} ${isPartOfPaymentAttempt ? "pointer-events-none opacity-80" : ""}`}
              >
                <div className="flex items-start mb-4 space-x-3">
                  <Checkbox
                    id={`order-${orderDto.order.id}`}
                    checked={orderDto.isSelected}
                    onCheckedChange={() => toggleOrderSelection(orderDto.order.id)}
                    disabled={orderDto.isExpired || isInteractiveDisabled || isPartOfPaymentAttempt}
                    className={orderDto.isExpired || isInteractiveDisabled || isPartOfPaymentAttempt ? "cursor-not-allowed" : ""}
                  />
                  <label
                    htmlFor={`order-${orderDto.order.id}`}
                    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer ${
                      orderDto.isExpired ? "text-gray-500 dark:text-gray-600" : ""
                    }`}
                  >
                    订单号: {orderDto.order.id}
                  </label>
                  <div className={`ml-auto text-sm font-medium flex items-center ${getCountdownColorClass(orderDto.timeRemaining, orderDto.isExpired)}`}>
                    <Clock className="h-4 w-4 inline-block mr-1 align-text-bottom" />
                    {orderDto.isExpired ? "已过期" : formatTimeRemaining(orderDto.timeRemaining)}
                  </div>
                  {orderDto.isExpired ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2 h-7 px-2 text-xs"
                      onClick={() => clearExpiredOrders([orderDto.order.id])}
                    >
                      <XCircle className="h-3 w-3 mr-1"/>
                      移除
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2 h-7 px-2 text-xs"
                      onClick={() => cancelOrderHandler(orderDto.order.id)}
                      disabled={isInteractiveDisabled || isPartOfPaymentAttempt}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      取消
                    </Button>
                  )}
                </div>
                {!orderDto.isExpired && (
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
                    <Progress
                      value={progress}
                      className={`h-full transition-all duration-300`}
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
          <span>已选 ({selectedCount || 0}) 总计</span>
          <span>{formatPrice(totalPayable)}</span>
        </div>
        <Link href="/payment">
          <Button
            className="w-full min-h-10"
            onClick={preparePayment}
            disabled={selectedCount === 0 || isInteractiveDisabled}
          >
            <CreditCard className="h-4 w-4 mr-2"/>
            去支付已选订单 ({selectedCount || 0})
          </Button>
        </Link>
        {hasExpiredOrders && (
          <Button
            variant="secondary"
            className="w-full min-h-10"
            onClick={() => clearExpiredOrders()}
          >
            <XCircle className="h-4 w-4 mr-2"/>
            清除所有 {expiredOrderCount} 个已过期订单
          </Button>
        )}
        {!hasSelectableOrders && pendingOrders.length > 0 && !isLoading && (
          <p className="text-center text-sm text-orange-500">所有订单已过期，无法支付。</p>
        )}
        {paymentInitiationDetails && (
          <p className="text-center text-sm text-blue-500">正在准备支付...请稍候或前往支付页面。</p>
        )}
        {pendingOrders.length > 0 && !isLoading && hasSelectableOrders && selectedCount === 0 && !paymentInitiationDetails && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">请选择需要支付的订单。</p>
        )}
      </div>
    </div>
  );
}