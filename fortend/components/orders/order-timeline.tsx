"use client"
import { motion } from "framer-motion"
import { CheckCircle2, Clock, Truck, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
interface OrderTimelineProps {
  status: string
  createdAt: string
  updatedAt: string
}
export default function OrderTimeline({status, createdAt, updatedAt}: OrderTimelineProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return "无效日期"
      }
      return new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    } catch (error) {
      console.error("Error formatting date:", error);
      return "日期格式错误";
    }
  }
  const canceledStatuses = ["CANCELED", "CANCELED_TIMEOUT"];
  const steps = [
    {
      id: "PENDING_PAYMENT",
      name: "待付款",
      description: `订单创建于 ${formatDate(createdAt)}`,
      icon: Clock,
      status: canceledStatuses.includes(status)
        ? "canceled"
        : ["PENDING_PAYMENT", "PENDING", "SHIPPED", "COMPLETED"].includes(status)
          ? "complete"
          : "upcoming",
    },
    {
      id: "PENDING",
      name: "待处理",
      description: "付款完成，待商家处理",
      icon: Clock,
      status: canceledStatuses.includes(status)
        ? "canceled"
        : ["PENDING", "SHIPPED", "COMPLETED"].includes(status)
          ? "complete"
          : "upcoming",
    },
    {
      id: "SHIPPED",
      name: "已发货",
      description: "订单已发出",
      icon: Truck,
      status: canceledStatuses.includes(status)
        ? "canceled"
        : ["SHIPPED", "COMPLETED"].includes(status)
          ? "complete"
          : "upcoming",
    },
    {
      id: "COMPLETED",
      name: "已完成",
      description: status === "COMPLETED" ? `订单已于 ${formatDate(updatedAt)} 的已完成` : "订单将送达后将完成",
      icon: CheckCircle2,
      status: canceledStatuses.includes(status)
        ? "canceled"
        : status === "COMPLETED"
          ? "complete"
          : "upcoming",
    },
  ];
  if (canceledStatuses.includes(status)) {
    steps.push({
      id: "CANCELED",
      name: "已取消",
      description: `订单已于 ${formatDate(updatedAt)} 取消`,
      icon: XCircle,
      status: "complete",
    });
  }
  const container = {
    hidden: {opacity: 0},
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  const item = {
    hidden: {opacity: 0, y: 10},
    show: {opacity: 1, y: 0},
  };
  return (
    <motion.div initial="hidden" animate="show" variants={container}>
      <ol className="space-y-4 md:flex md:space-x-12 md:space-y-0">
        {steps.map((step) => (
          <motion.li key={step.id} className="md:flex-1" variants={item}>
            <div className="flex flex-col py-2 pl-4 md:border-l-0 md:border-t-2 md:pb-0 md:pl-0 md:pt-4">
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full",
                  step.status === "complete"
                    ? "bg-green-100 dark:bg-green-900"
                    : step.status === "canceled"
                      ? "bg-red-100 dark:bg-red-900"
                      : "bg-gray-100 dark:bg-gray-800",
                )}
              >
                <step.icon
                  className={cn(
                    "h-5 w-5",
                    step.status === "complete"
                      ? "text-green-500 dark:text-green-400"
                      : step.status === "canceled"
                        ? "text-red-500 dark:text-red-400"
                        : "text-gray-500 dark:text-gray-400",
                  )}
                  aria-hidden="true"
                />
              </span>
              <span className="mt-3 text-sm font-medium">{step.name}</span>
              <span className="text-xs text-muted-foreground">{step.description}</span>
            </div>
          </motion.li>
        ))}
      </ol>
    </motion.div>
  );
}