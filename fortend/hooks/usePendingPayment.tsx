"use client"
import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  createContext,
  ReactNode,
} from 'react';
import { toast } from 'sonner';
import { useAuth } from "@/components/auth-provider";
import { getPendingOrders, cancelOrder } from "@/lib/api";

interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productVariantId: number;
  quantity: number;
  purchasedPrice: number;
  snapshotProductName: string;
  snapshotVariantColor: string;
  snapshotVariantSize: string;
  snapshotVariantImage: string;
  createdAt: string;
  updatedAt: string;
  transactionId: string;
}

interface Order {
  id: number;
  userId: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderDTO {
  order: Order;
  items: OrderItem[];
}

interface PendingOrderState extends OrderDTO {
  isSelected: boolean;
  timeRemaining: number;
  isExpired: boolean;
}

interface PaymentInitiationDetails {
  orderIds: number[];
  amount: number;
  transactionId: string;
  selectedOrders: PendingOrderState[];
}

interface PendingPaymentContextValue {
  pendingOrders: PendingOrderState[];
  isLoading: boolean;
  selectedCount: number;
  hasSelectableOrders: boolean;
  paymentInitiationDetails: PaymentInitiationDetails | null;
  toggleOrderSelection: (orderId: number) => void;
  preparePayment: () => void;
  cancelOrderHandler: (orderId: number) => Promise<void>;
  clearPaymentInitiation: () => void;
  fetchPendingOrders: () => Promise<void>;
  formatPrice: (price: number | string, currencyCode?: string, locale?: string) => string;
  formatTimeRemaining: (seconds: number) => string;
  getPaymentProgress: (order: PendingOrderState) => number;
  getCountdownColorClass: (timeRemaining: number, isExpired: boolean) => string;
  getProgressBarColor: (progress: number) => string;
}

const PAYMENT_DURATION = 15 * 60;

export const formatPrice = (
  price: number | string,
  currencyCode: string = 'CNY',
  locale: string = 'zh-CN'
): string => {
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  const priceToFormat = isNaN(numericPrice) ? 0 : numericPrice;
  try {
    const absolutePrice = Math.max(0, priceToFormat);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absolutePrice);
  } catch (e) {
    console.error(`Error formatting price with currency code "${currencyCode}"`, e, {price, currencyCode, locale});
    return `N/A`;
  }
};

export const formatTimeRemaining = (seconds: number): string => {
  if (seconds < 0) seconds = 0;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const paddedSeconds = remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds;
  return `${minutes}:${paddedSeconds}`;
};

const getPaymentProgress = (order: PendingOrderState): number => {
  const createdAtTimestamp = new Date(order.order.createdAt).getTime();
  const totalDuration = PAYMENT_DURATION * 1000;
  const elapsed = Date.now() - createdAtTimestamp;
  return Math.max(0, Math.min(100, ((totalDuration - elapsed) / totalDuration) * 100));
};

const getCountdownColorClass = (timeRemaining: number, isExpired: boolean): string => {
  if (isExpired) return "text-gray-500 dark:text-gray-600";
  if (timeRemaining <= 60) return "text-red-500";
  if (timeRemaining <= 300) return "text-orange-500";
  return "text-blue-500 dark:text-blue-400";
};

const getProgressBarColorClass = (progress: number): string => {
  if (progress <= 10) return 'bg-red-500 dark:bg-red-700';
  if (progress <= 30) return 'bg-orange-500 dark:bg-orange-700';
  if (progress <= 60) return 'bg-cyan-500 dark:bg-cyan-700';
  return 'bg-blue-500 dark:bg-blue-700';
};

const PendingPaymentContext = createContext<PendingPaymentContextValue | undefined>(undefined);

export const PendingPaymentProvider = ({ children }: { children: ReactNode }) => {
  const [pendingOrders, setPendingOrders] = useState<PendingOrderState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentInitiationDetails, setPaymentInitiationDetails] = useState<PaymentInitiationDetails | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { token } = useAuth();

  const updateCountdown = () => {
    setPendingOrders(prevOrders => {
      const now = Date.now();
      return prevOrders.map(orderDto => {
        const createdAtTimestamp = new Date(orderDto.order.createdAt).getTime();
        const expirationTime = createdAtTimestamp + PAYMENT_DURATION * 1000;
        const timeRemaining = Math.max(0, Math.floor((expirationTime - now) / 1000));
        const isExpired = timeRemaining === 0;
        const isSelected = isExpired ? false : orderDto.isSelected;
        const status = isExpired && orderDto.order.status === 'pending_payment' ? 'cancelled' : orderDto.order.status;

        return {
          ...orderDto,
          isSelected,
          timeRemaining,
          isExpired,
          order: {
            ...orderDto.order,
            status: status
          }
        };
      });
    });
  };

  const fetchPendingOrders = async () => {
    if (!token) {
      setIsLoading(false);
      setPendingOrders([]);
      return;
    }
    setIsLoading(true);
    try {
      const orders = await getPendingOrders(token);
      const initialPendingOrders: PendingOrderState[] = orders
      .filter((orderDto: OrderDTO) => orderDto.order.status === 'pending_payment')
      .map((orderDto: OrderDTO) => {
        const createdAtTimestamp = new Date(orderDto.order.createdAt).getTime();
        const expirationTime = createdAtTimestamp + PAYMENT_DURATION * 1000;
        const timeRemaining = Math.max(0, Math.floor((expirationTime - Date.now()) / 1000));
        const isExpired = timeRemaining === 0 || orderDto.order.status !== 'pending_payment';
        return {
          ...orderDto,
          isSelected: false,
          timeRemaining,
          isExpired,
        };
      });
      setPendingOrders(initialPendingOrders);
    } catch (error: any) {
      console.error('Failed to load pending orders:', error);
      toast.error("加载待支付订单失败", { description: error.message });
      setPendingOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingOrders();

    intervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [token]);

  const toggleOrderSelection = (orderId: number) => {
    setPendingOrders(prevOrders =>
      prevOrders.map(orderDto =>
        orderDto.order.id === orderId && !orderDto.isExpired && paymentInitiationDetails === null
          ? { ...orderDto, isSelected: !orderDto.isSelected }
          : orderDto
      )
    );
  };

  const preparePayment = () => {
    const selectedOrders = pendingOrders
    .filter(orderDto => orderDto.isSelected && !orderDto.isExpired);

    if (selectedOrders.length === 0) {
      toast.info("请选择要支付的订单。");
      return;
    }

    const selectedOrderIds = selectedOrders.map(orderDto => orderDto.order.id);

    const totalAmount = selectedOrders.reduce((total, orderDto) => {
      const orderTotal = orderDto.items.reduce((sum, item) => sum + item.purchasedPrice * item.quantity, 0);
      return total + orderTotal;
    }, 0);

    const transactionId = `mock-tx-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    setPaymentInitiationDetails({
      orderIds: selectedOrderIds,
      amount: totalAmount,
      transactionId: transactionId,
      selectedOrders: selectedOrders
    });

    toast.info(`已为您准备支付信息，即将跳转至支付页面...`);
  };

  const cancelOrderHandler = async (orderId: number) => {
    if (!token) {
      toast.error("未登录或登录状态失效，无法取消订单。");
      return;
    }

    if (paymentInitiationDetails && paymentInitiationDetails.orderIds.includes(orderId)) {
      toast.warning("该订单已包含在您的支付尝试中，请先取消支付流程。");
      return;
    }

    const orderToCancel = pendingOrders.find(o => o.order.id === orderId);
    if (!orderToCancel) {
      toast.error("未找到该订单或订单已不在列表中。");
      return;
    }
    if (orderToCancel.isExpired || orderToCancel.order.status !== 'pending_payment') {
      toast.info("该订单已过期或状态不允许取消，无需手动取消。");
      return;
    }

    setPendingOrders(prevOrders => prevOrders.filter(orderDto => orderDto.order.id !== orderId));
    try {
      await cancelOrder(token, orderId);
      toast.success(`订单 ${orderId} 已取消。`);
    } catch (error: any) {
      console.error(`Failed to cancel order ${orderId}:`, error);
      toast.error(`取消订单 ${orderId} 失败`, { description: error.message });
      await fetchPendingOrders();
    }
  };

  const clearPaymentInitiation = () => {
    setPaymentInitiationDetails(null);
    setPendingOrders(prevOrders => prevOrders.map(order => ({...order, isSelected: false})));
  };

  const selectedCount = pendingOrders.filter(order => order.isSelected).length;
  const hasSelectableOrders = pendingOrders.some(order => !order.isExpired);

  const contextValue: PendingPaymentContextValue = {
    pendingOrders,
    isLoading,
    selectedCount,
    hasSelectableOrders,
    paymentInitiationDetails,
    toggleOrderSelection,
    preparePayment,
    cancelOrderHandler,
    clearPaymentInitiation,
    fetchPendingOrders,
    formatPrice,
    formatTimeRemaining,
    getPaymentProgress,
    getCountdownColorClass,
    getProgressBarColor: getProgressBarColorClass,
  };

  return (
    <PendingPaymentContext.Provider value={contextValue}>
      {children}
    </PendingPaymentContext.Provider>
  );
};

export const usePendingPayment = (): PendingPaymentContextValue => {
  const context = useContext(PendingPaymentContext);
  if (context === undefined) {
    throw new Error('usePendingPayment must be used within a PendingPaymentProvider');
  }
  return context;
};

export { getPaymentProgress, getCountdownColorClass };