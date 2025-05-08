"use client";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton"; // Although Skeleton is imported, it's not used in the final render logic provided, but keeping it just in case.
import { CreditCard, ArrowLeft, CheckCircle, XCircle, RotateCw } from "lucide-react"; // 导入更多图标
import { usePendingPayment, formatPrice } from "@/hooks/usePendingPayment";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
// 导入实际的 payOrder API 函数
import { API_URL, payOrder } from "@/lib/api";
// 导入 framer-motion
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
// 导入 Next.js 路由器
import { useRouter } from 'next/navigation';

// Card variants for animation (Not directly used for the main status card, but kept as in original)
const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -50, transition: { duration: 0.3 } },
};

// Status icon/message variants
const statusVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.3 } },
};


export default function PaymentPage() {
  // 使用 Next.js 路由器
  const router = useRouter();

  // 从 Context 中获取为支付准备的数据和方法
  // 确保 PendingPaymentProvider 包裹了包括 /pending 和 /payment 在内的路由部分
  const {
    paymentInitiationDetails,
    clearPaymentInitiation, // Function to go back and clear state
    fetchPendingOrders,     // Function to refresh list after payment
    // formatPrice helper function is imported directly
  } = usePendingPayment();

  const { token } = useAuth();

  // 本地状态管理支付流程和结果
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'paying' | 'success' | 'failure'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);


  // --- Effect 1: 处理没有支付详情或丢失状态的情况 ---
  useEffect(() => {
    // If paymentInitiationDetails is null when component mounts or becomes null unexpectedly,
    // and we are in the initial 'idle' state, it means there's no payment to process.
    // We should redirect the user back to the pending list page.
    if (!paymentInitiationDetails && paymentStatus === 'idle') {
      toast.warning("没有待支付的订单信息，已返回列表。");
      // Use a small timeout to ensure the toast is visible before navigation
      const timer = setTimeout(() => {
        // Clear any potential stale state before navigating
        clearPaymentInitiation(); // This might also trigger state change, but router.push guarantees navigation.
        router.push('/pending'); // Redirect to the pending orders list
      }, 50); // Short delay

      return () => clearTimeout(timer); // Cleanup timer
    }

    // If paymentInitiationDetails become null *after* the payment process (success/failure),
    // it means clearPaymentInitiation has been called (likely with a delay after success).
    // In this case, rely on clearPaymentInitiation or external logic (like an effect in the /pending page that watches the context)
    // to trigger navigation back to /pending. The component will likely unmount soon anyway.

  }, [paymentInitiationDetails, paymentStatus, clearPaymentInitiation, router]); // Add router to dependencies


  // --- Effect 2: 在有支付详情且状态为 idle 时触发支付 API 调用 ---
  useEffect(() => {
    // Trigger payment only if details are ready, we have an auth token, and we are in the 'idle' state
    if (paymentInitiationDetails && paymentStatus === 'idle' && token) {
      const { orderIds, amount, transactionId } = paymentInitiationDetails;

      const executePayment = async () => {
        setPaymentStatus('paying'); // Set status to indicate payment is in progress
        setPaymentError(null); // Clear previous errors

        try {
          console.log("Attempting simulated payment...", { orderIds, amount, transactionId });

          // Call the payOrder API
          // Note: The API call payload might need adjustment based on the actual API contract.
          // Assuming payOrder expects token, orderIds (array), transactionId (string), amount (number).
          await payOrder(token, orderIds, transactionId, amount);

          console.log("Simulated payment successful.");
          setPaymentStatus('success'); // Set status to success
          toast.success(`支付成功！交易号: ${transactionId}`);

          // After success, wait a moment for the animation/message to be seen,
          // then refresh the pending orders list and clear the payment details (which should navigate back).
          const timer = setTimeout(async () => {
            await fetchPendingOrders(); // Refresh pending list
            clearPaymentInitiation(); // Clear state and trigger navigation via effect in /pending or this page's Effect 1 (if it clears state before navigation).
          }, 3000); // Wait 3 seconds

          return () => clearTimeout(timer); // Cleanup timeout

        } catch (error: any) {
          console.error("Simulated payment failed:", error);
          setPaymentStatus('failure'); // Set status to failure
          // Attempt to get a meaningful error message from the API response
          const errorMessage = error.message || "支付未能完成，请稍后再试。";
          setPaymentError(errorMessage);
          toast.error("支付失败", { description: errorMessage });

          // Even on failure, refetch the pending list as order statuses might have partially updated
          // or to ensure the list is fresh if user navigates back.
          fetchPendingOrders(); // Optional, decided to keep based on original code's comment
        }
      };

      executePayment(); // Execute the async payment function

    }
    // Dependencies: paymentInitiationDetails ensures we have the data, token ensures auth is ready,
    // paymentStatus='idle' ensures this runs only once per payment attempt,
    // functions are included as per hook best practices.
  }, [paymentInitiationDetails, token, paymentStatus, fetchPendingOrders, clearPaymentInitiation]);


  // --- Render Logic ---

  // If paymentInitiationDetails is null BUT the payment status is NOT 'idle' or 'paying',
  // this usually means clearPaymentInitiation has been called after success/failure.
  // In this state, we are waiting for navigation back to /pending.
  // Render nothing to avoid blinking content before redirect.
  if (!paymentInitiationDetails && paymentStatus !== 'idle' && paymentStatus !== 'paying') {
    // This state is a brief transition period.
    // A small spinner could be displayed here if needed, but 'null' is simpler and effective
    // if navigation is fast.
    return null;
  }

  // If paymentInitiationDetails is null and we are in 'idle' state, first useEffect handles redirect.
  // If we reach here despite that, it might briefly render something.
  // Let's handle the case where details are missing or malformed even if status is idle/paying
  // (though the first effect should prevent this for idle).
  // Using optional chaining defensively below is still good practice.
  const { orderIds, amount, transactionId, selectedOrders } = paymentInitiationDetails || {};

  // Critical check: If paymentInitiationDetails existed but selectedOrders is empty, something is wrong.
  // This check should theoretically be done *before* navigating to payment, but as a fallback:
  if (paymentInitiationDetails && (!selectedOrders || selectedOrders.length === 0)) {
    toast.error("支付信息异常，请重新尝试。");
    // Clear the bad state and redirect
    clearPaymentInitiation();
    // Use a timeout to ensure toast is seen before redirect
    const timer = setTimeout(() => {
      router.push('/pending');
    }, 50);
    return () => clearTimeout(timer); // Cleanup timer
  }


  // Calculate total amount if selectedOrders is available
  const displayTotalAmount = selectedOrders && selectedOrders.length > 0
    ? selectedOrders.reduce((total, orderDto) => {
      const orderTotal = orderDto.items.reduce((sum, item) => sum + item.purchasedPrice * item.quantity, 0);
      return total + orderTotal;
    }, 0)
    : 0; // Default to 0 if no orders


  // Function to render dynamic content based on payment status
  const renderContent = () => {
    switch (paymentStatus) {
      case 'idle':
        // While idle, we show the details and the payment button.
        // This case is handled outside this renderContent function in the main JSX body.
        return null; // Or structure renderContent differently. Let's keep idle details in the main render block.
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
            <motion.div // Spinner animation
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
            <Button onClick={clearPaymentInitiation} className="min-w-48 text-base py-3">返回待支付列表</Button>
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
            {/* Offer to go back to review or retry */}
            <Button onClick={clearPaymentInitiation} className="min-w-48 text-base py-3">返回待支付列表</Button>
          </motion.div>
        );
      default:
        // Should not reach here under normal circumstances
        return null;
    }
  };

  return (
    <div className="flex h-full flex-col p-6">
      {/* AnimatePresence allows exit animations when paymentStatus changes */}
      <AnimatePresence mode="wait"> {/* 'wait' mode ensures exit completes before new enters */}
        {paymentStatus === 'idle' || paymentStatus === 'paying' ? (
          // Render details and buttons in idle/paying state, or the paying spinner
          <motion.div
            key="payment-details-or-paying"
            initial="visible" // Stay visible initially
            animate={paymentStatus === 'paying' ? "hidden" : "visible"} // Hide details when paying
            exit="exit" // Exit animation
            variants={cardVariants} // Using cardVariants for exiting details view
            className={`flex flex-col h-full ${paymentStatus === 'paying' ? 'items-center justify-center' : ''}`}
          >
            {/* Header and details only visible in idle state */}
            {paymentStatus === 'idle' && paymentInitiationDetails && selectedOrders && selectedOrders.length > 0 && (
              <>
              <div className="flex items-center py-4">
                {/* Back button calls clearPaymentInitiation to reset state and trigger navigation */}
                <Button variant="ghost" size="icon" onClick={clearPaymentInitiation} disabled={paymentStatus !== 'idle'} aria-label="返回">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-2xl font-bold ml-2 flex-1">模拟支付</h2>
              </div>
              <Separator />

              <div
                className="flex-1 overflow-y-auto py-4 pr-2 space-y-6"
                style={{
                  scrollbarWidth: "none", // Hide scrollbar for Firefox
                  msOverflowStyle: "none", // Hide scrollbar for IE/Edge
                }}
              >
                { selectedOrders.map(orderDto => {
                  const orderTotal = orderDto.items.reduce((sum, item) => sum + item.purchasedPrice * item.quantity, 0);
                  return (
                    <div key={orderDto.order.id} className="border-b last:border-b-0 pb-6">
                      <div className="text-sm font-medium mb-4 flex items-center">
                        <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>订单号: {orderDto.order.id}</span>
                      </div>
                      <div className="space-y-4 pl-4 pr-2">
                        {orderDto.items.map(item => (
                          <div key={item.id} className="flex items-start">
                            <div className="relative h-16 w-16 overflow-hidden rounded-md border bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                              {/* Ensure image src is absolute or correctly resolved */}
                              <Image
                                src={`${API_URL}/api/image${item.snapshotVariantImage}` || "/placeholder.svg"}
                                alt={`${item.snapshotProductName} (${item.snapshotVariantColor}/${item.snapshotVariantSize})`}
                                fill
                                className="object-cover"
                                sizes="64px" // Image width
                              />
                            </div>
                            <div className="ml-4 flex-1 flex flex-col">
                              <h4 className="text-base font-medium text-gray-900 dark:text-amber-50 line-clamp-2">{item.snapshotProductName}</h4>
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                                {item.snapshotVariantColor} / {item.snapshotVariantSize}
                              </p>
                              <span className="text-base text-gray-700 dark:text-amber-50 mt-2">
                                               {formatPrice(item.purchasedPrice)} <span className="text-sm text-muted-foreground">x {item.quantity}</span>
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

                  <Separator className="mt-4" /> {/* Separator before total and buttons */}

                <div className="space-y-6 py-4">
                  <div className="flex justify-between items-center font-bold text-base text-gray-900 dark:text-amber-50">
                    <span>共支付 ({selectedOrders.length}) 笔订单，总计</span>
                    <span className="text-xl">{formatPrice(displayTotalAmount)}</span> {/* Larger total font */}
                  </div>

                  {transactionId && (
                    <div className="text-sm text-muted-foreground text-center">
                      本次模拟交易号: <span className="font-mono text-gray-800 dark:text-gray-200 font-semibold">{transactionId}</span>
                    </div>
                  )}

                  {/* Pay Button - Only visible and clickable in 'idle' state */}
                  <Button
                    className="w-full min-h-12 text-base"
                    onClick={() => setPaymentStatus('paying')} // Trigger 'paying' state, which then triggers useEffect
                    disabled={paymentStatus !== 'idle' || !token || !paymentInitiationDetails} // Disabled if not idle, no token, or no details
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    确认并模拟支付
                  </Button>

                  {/* Cancel Button */}
                  <Button
                    variant="outline"
                    className="w-full min-h-12 text-base"
                    onClick={clearPaymentInitiation} // Go back (handled by context or effect)
                    disabled={paymentStatus !== 'idle'} // Disabled if paying
                  >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    取消支付 / 返回列表
                  </Button>
                </div>
              </>
              )}
              {/* Render paying spinner if status is 'paying' within this block's animation */}
              {paymentStatus === 'paying' && (
                <div className="flex flex-1 items-center justify-center">
                  {renderContent()} {/* Render the paying spinner/message */}
                </div>
              )}

              </motion.div>
            ) : (
              <motion.div
              key="payment-status-result"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={statusVariants} // Using statusVariants for the result screen
            className="flex flex-1 items-center justify-center"
          >
            {renderContent()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}