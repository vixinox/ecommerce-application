"use client";

import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, CreditCard, RotateCw, XCircle } from "lucide-react";
import { formatPrice, usePendingPayment } from "@/hooks/usePendingPayment";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { API_URL, payOrder } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Card } from "@/components/ui/card";

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -50, transition: { duration: 0.3 } },
};

const statusVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.3 } },
};

export default function PaymentPage() {
  const router = useRouter();
  const {
    paymentInitiationDetails,
    clearPaymentInitiation,
    fetchPendingOrders,
  } = usePendingPayment();
  const { token } = useAuth();

  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'paying' | 'success' | 'failure'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentInitiationDetails && paymentStatus === 'idle') {
      toast.warning("没有待支付的订单信息，已返回。");
      router.back();
    }
  }, [paymentInitiationDetails, paymentStatus, clearPaymentInitiation, router]);

  const handlePayClick = useCallback(async () => {
    if (!paymentInitiationDetails || !token) {
      toast.error("支付信息不完整或未登录。");
      return;
    }

    const {orderIds, amount, transactionId} = paymentInitiationDetails;
    setPaymentStatus('paying');
    setPaymentError(null);

    try {
      console.log("Attempting simulated payment...", {orderIds, amount, transactionId});
      await payOrder(token, orderIds, transactionId, amount);
      console.log("Simulated payment successful.");
      setPaymentStatus('success');
      toast.success(`支付成功！交易号: ${transactionId}`);

      await fetchPendingOrders();
    } catch (error: any) {
      console.error("Simulated payment failed:", error);
      setPaymentStatus('failure');
      const errorMessage = error.message || "支付未能完成，请稍后再试。";
      setPaymentError(errorMessage);
      toast.error("支付失败", {description: errorMessage});

      await fetchPendingOrders();
    }
  }, [paymentInitiationDetails, token, fetchPendingOrders]);

  const {transactionId, selectedOrders} = paymentInitiationDetails || {};

  useEffect(() => {
    if (paymentInitiationDetails && (!selectedOrders || selectedOrders.length === 0)) {
      toast.error("支付信息异常，请重新尝试。");
      const timer = setTimeout(() => {
        clearPaymentInitiation();
        router.push('/');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [paymentInitiationDetails, selectedOrders, clearPaymentInitiation, router]);



  const displayTotalAmount = selectedOrders && selectedOrders.length > 0
    ? selectedOrders.reduce((total, orderDto) => {
      const orderTotal = orderDto.items.reduce((sum, item) => sum + item.purchasedPrice * item.quantity, 0);
      return total + orderTotal;
    }, 0)
    : 0;


  const renderStatusContent = () => {
    switch (paymentStatus) {
      case 'paying':
        return (
          <motion.div
            key="paying-message"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={statusVariants}
            className="flex flex-col items-center justify-center h-full text-center p-6"
          >
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="mb-6 text-blue-500 dark:text-blue-400"
            >
              <RotateCw className="h-20 w-20" />
            </motion.div>
            <h3 className="text-2xl font-medium mb-3">正在处理支付...</h3>
            <p className="text-muted-foreground text-lg">请稍候，勿关闭页面。</p>
            {transactionId && (
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold">交易号:</span> <span className="font-mono break-all">{transactionId}</span>
              </p>
            )}
          </motion.div>
        );
      case 'success':
        return (
          <motion.div
            key="success-message"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={statusVariants}
            className="flex flex-col items-center justify-center h-full text-center p-6"
          >
            <CheckCircle className="h-28 w-28 text-green-500 mb-6" />
            <h3 className="text-3xl font-bold mb-3 text-green-600 dark:text-green-400">支付成功！</h3>
            <p className="text-muted-foreground text-lg mb-6">您的订单已成功支付。</p>
            {transactionId && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
                <span className="font-semibold">交易号:</span> <span className="font-mono break-all">{transactionId}</span>
              </p>
            )}
            <Button
              onClick={() => {
                clearPaymentInitiation();
                router.back();
              }}
              className="min-w-48 text-base py-3"
            >
              返回
            </Button>
          </motion.div>
        );
      case 'failure':
        return (
          <motion.div
            key="failure-message"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={statusVariants}
            className="flex flex-col items-center justify-center h-full text-center p-6"
          >
            <XCircle className="h-28 w-28 text-red-500 mb-6" />
            <h3 className="text-3xl font-bold mb-3 text-red-600 dark:text-red-400">支付失败</h3>
            <p className="text-muted-foreground text-lg mb-4">未能完成支付，请检查支付信息后重试。</p>
            {paymentError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-6">{paymentError}</p>
            )}
            {transactionId && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
                <span className="font-semibold">交易号:</span> <span className="font-mono break-all">{transactionId}</span>
              </p>
            )}
            <Button
              onClick={() => {
                clearPaymentInitiation();
                router.back();
              }}
              className="min-w-48 text-base py-3"
            >
              返回
            </Button>
          </motion.div>
        );
      case 'idle':
      default:
        return null;
    }
  };

  const showDetails = paymentStatus === 'idle' && paymentInitiationDetails && selectedOrders && selectedOrders.length > 0;
  return (
    <Card
      className="flex flex-col items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8 rounded border-2">
      <div className="w-full max-w-md space-y-8 p-8 rounded-xl shadow-lg">
        <AnimatePresence mode="wait">
          {showDetails && (
            <motion.div
              key="payment-details"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
              className="flex flex-col"
            >
              <div className="flex items-center py-2">
                <h2 className="text-2xl font-bold ml-2 flex-1 text-gray-900 dark:text-amber-50">支付订单</h2>
              </div>
              <Separator />
              <div
                className="flex-1 overflow-y-auto py-4 space-y-6"
                style={{
                  maxHeight: '400px',
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                { selectedOrders.map(orderDto => {
                  const orderTotal = orderDto.items.reduce((sum, item) => sum + item.purchasedPrice * item.quantity, 0);
                  return (
                    <div key={orderDto.order.id} className="border-b last:border-b-0 pb-6">
                      <div className="text-sm font-medium mb-4 flex items-center text-gray-700 dark:text-gray-300">
                        <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>订单号: {orderDto.order.id}</span>
                      </div>
                      <div className="space-y-4 pl-4 pr-2">
                        {orderDto.items.map(item => (
                          <div key={item.id} className="flex items-start">
                            <div className="relative h-16 w-16 overflow-hidden rounded-md border flex-shrink-0">
                              <Image
                                src={`${API_URL}/api/image${item.snapshotVariantImage}` || "/placeholder.svg"}
                                alt={`${item.snapshotProductName} (${item.snapshotVariantColor}/${item.snapshotVariantSize})`}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            </div>
                            <div className="ml-4 flex-1 flex flex-col">
                              <h4 className="text-base font-medium text-gray-900 dark:text-amber-50 line-clamp-2">{item.snapshotProductName}</h4>
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                                {item.snapshotVariantColor} / {item.snapshotVariantSize}
                              </p>
                              <span className="text-base text-gray-700 dark:text-amber-50 mt-2">
                                    {formatPrice(item.purchasedPrice)} <span
                                className="text-sm text-muted-foreground">x {item.quantity}</span>
                                  </span>
                            </div>
                            <span className="text-base font-semibold text-gray-900 dark:text-amber-50 ml-4 flex-shrink-0 min-w-[80px] text-right">
                                  {formatPrice(item.purchasedPrice * item.quantity)}
                                </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end items-center mt-4 pr-2">
                        <span className="text-sm text-gray-700 dark:text-amber-50 mr-2 font-medium">订单小计:</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-amber-50">{formatPrice(orderTotal)}</span>
                      </div>
                    </div>
                  )})
                }
              </div>
              <Separator className="mt-4"/>
              <div className="space-y-6 py-4">
                <div className="flex justify-between items-center font-bold text-base text-gray-900 dark:text-amber-50">
                  <span>共支付 ({selectedOrders.length}) 笔订单，总计</span>
                  <span className="text-xl">{formatPrice(displayTotalAmount)}</span>
                </div>
                {transactionId && (
                  <div className="text-sm text-muted-foreground text-center">
                    本次模拟交易号: <span
                    className="font-mono text-gray-800 dark:text-gray-200 font-semibold">{transactionId}</span>
                  </div>
                )}
                <Button
                  className="w-full min-h-12 text-base"
                  onClick={handlePayClick}
                  disabled={paymentStatus !== 'idle' || !token || !paymentInitiationDetails || !selectedOrders || selectedOrders.length === 0}
                >
                  <CreditCard className="h-5 w-5 mr-2"/>
                  确认并支付
                </Button>
                <Button
                  variant="outline"
                  className="w-full min-h-12 text-base"
                  onClick={() => {
                    clearPaymentInitiation();
                    router.back();
                  }}
                  disabled={paymentStatus !== 'idle'}
                >
                  <ArrowLeft className="h-5 w-5 mr-2"/>
                  取消支付 / 返回
                </Button>
              </div>
            </motion.div>
          )}

          {paymentStatus !== 'idle' && (
            <motion.div
              key="payment-status-screen"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={statusVariants}
              className="flex flex-col items-center justify-center h-full min-h-[400px]"
            >
              {renderStatusContent()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}