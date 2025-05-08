"use client";

import Image from "next/image";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useShoppingCart } from "@/components/shopping-cart-provider";
import { formatPrice } from "@/lib/utils";
import { API_URL } from "@/lib/api";
import { CartItem } from "@/lib/types";
import { usePendingPayment } from "@/hooks/usePendingPayment";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function ShoppingCart() {
  const {cartItems, updateQuantity, removeFromCart, clearCart, createOrder} = useShoppingCart();
  const {fetchPendingOrders} = usePendingPayment();
  const [showEmptyCart, setShowEmptyCart] = useState(false);

  const subtotal = cartItems.reduce(
    (total, item) => total + item.productVariant.price * item.quantity,
    0
  );

  const shipping = subtotal > 0 ? 10 : 0;
  const total = subtotal + shipping;

  useEffect(() => {
    if (cartItems.length === 0) {
      const timeout = setTimeout(() => {
        setShowEmptyCart(true);
      }, 300)
      return () => clearTimeout(timeout);
    } else {
      setShowEmptyCart(false);
    }
  }, [cartItems]);

  const handleRemoveItem = async (
    productName: string,
    color: string,
    size: string,
    cartId: number
  ) => {
    try {
      await removeFromCart(cartId);
      toast.success(`已将 "${productName}" (${color}/${size}) 移除`);

    } catch (error: any) {
      toast.error(`移除失败`, {description: error.message})
    }

  };

  if (showEmptyCart) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-6">
        <ShoppingBag className="h-16 w-16 text-muted-foreground"/>
        <div className="text-xl font-medium text-center">您的购物车是空的</div>
        <p className="text-center text-muted-foreground">
          将商品添加到购物车以在此处查看。
        </p>
      </div>
    );
  }

  function handleCreateOrder(cartItems: CartItem[]) {
    createOrder(cartItems).then(() => {
      setTimeout(() => {
        fetchPendingOrders();
      }, 300);
    })
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between py-4">
        <h2 className="text-lg font-semibold">购物车 ({cartItems.length})</h2>

        <Button variant="ghost" size="sm" onClick={clearCart}>
          清空购物车
        </Button>
      </div>

      <Separator/>

      <div className="flex-1 overflow-y-auto py-2 pr-2">
        <AnimatePresence>
          {cartItems.map((item) => (
            <motion.div
              layout
              initial={{opacity: 1, x: 0}}
              animate={{opacity: 1, x: 0}}
              exit={{opacity: 0, x: 500, transition: {duration: 0.3}}}
              key={item.cartId || item.productVariant.id}
              className="flex items-start py-4"
            >
              <div className="relative h-16 w-16 overflow-hidden rounded-md border bg-gray-100">
                <Image
                  src={`${API_URL}/api/image${item.image}` || "/placeholder.svg"}
                  alt={`${item.productName} (${item.productVariant.color}/${item.productVariant.size})`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>

              <div className="ml-4 flex-1 flex flex-col justify-between">
                <div className="flex justify-between w-full">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-amber-50">{item.productName}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.productCategory} - {item.productVariant.color} /{" "}
                      {item.productVariant.size}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-amber-50">
                    {formatPrice(item.productVariant.price)}
                  </p>
                </div>

                <div className="mt-2 flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        updateQuantity(item.productVariant.id, item.quantity - 1);
                      }}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3 w-3"/>
                      <span className="sr-only">减少数量</span>
                    </Button>

                    <span className="w-5 text-center text-sm font-medium leading-none">{item.quantity}</span>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        updateQuantity(item.productVariant.id, item.quantity + 1);
                      }}
                      disabled={item.quantity >= item.productVariant.stockQuantity}
                    >
                      <Plus className="h-3 w-3"/>
                      <span className="sr-only">增加数量</span>
                    </Button>

                    {item.productVariant.stockQuantity !== undefined && (
                      <span
                        className={`text-xs ml-3 ${item.productVariant.stockQuantity - item.quantity <= 5 && item.productVariant.stockQuantity - item.quantity > 0 ? 'text-orange-500' : item.productVariant.stockQuantity - item.quantity <= 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        库存: {item.productVariant.stockQuantity}
                        {item.productVariant.stockQuantity - item.quantity <= 5 && item.productVariant.stockQuantity - item.quantity > 0 && ' (较低)'}
                        {item.productVariant.stockQuantity - item.quantity <= 0 && ' (缺货)'}
                    </span>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-red-500"
                    onClick={() =>
                      handleRemoveItem(
                        item.productName,
                        item.productVariant.color,
                        item.productVariant.size,
                        item.cartId
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4"/>
                    <span className="sr-only">移除商品</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Separator className="mt-2"/>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-700 dark:text-amber-50">
            <span>小计</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-700 dark:text-amber-50">
            <span>运费</span>
            <span>{formatPrice(shipping)}</span>
          </div>
        </div>

        <Separator/>

        <div className="flex justify-between font-semibold text-base text-gray-900 dark:text-amber-50">
          <span>总计</span>
          <span>{formatPrice(total)}</span>
        </div>

        <Button className="w-full" onClick={() => handleCreateOrder(cartItems)} disabled={cartItems.length === 0}>
          提交订单
        </Button>
      </div>
    </div>
  );
}