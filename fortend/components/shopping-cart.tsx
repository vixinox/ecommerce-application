"use client";

import Image from "next/image";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useShoppingCart } from "@/components/shopping-cart-provider";
import { formatPrice } from "@/lib/utils";

export default function ShoppingCart() {
  const { cartItems, updateQuantity, removeFromCart, clearCart, createOrder } = useShoppingCart();

  const subtotal = cartItems.reduce(
    (total, item) => total + item.productVariant.price * item.quantity,
    0
  );

  const shipping = subtotal > 0 ? 10 : 0;
  const total = subtotal + shipping;

  const handleRemoveItem = async (
    variantId: number,
    productName: string,
    color: string,
    size: string
  ) => {
    await removeFromCart(variantId);

    toast.info(`已将 "${productName}" (${color}/${size}) 移除`);
  };

  const handleClearCart = async () => {
    await clearCart();
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-6">
        <ShoppingBag className="h-16 w-16 text-muted-foreground" />
        <div className="text-xl font-medium text-center">您的购物车是空的</div>
        <p className="text-center text-muted-foreground">
          将商品添加到购物车以在此处查看。
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between py-4">
        <h2 className="text-lg font-semibold">购物车 ({cartItems.length})</h2>

        <Button variant="ghost" size="sm" onClick={handleClearCart}>
          清空购物车
        </Button>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto py-2 pr-2">
        {cartItems.map((item) => (
          <div key={item.cartId || item.productVariant.id} className="flex items-start py-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-md border bg-gray-100">
              <Image
                src={item.productVariant.image || "/placeholder.svg"}
                alt={`${item.productName} (${item.productVariant.color}/${item.productVariant.size})`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>

            <div className="ml-4 flex-1 flex flex-col justify-between">
              <div className="flex justify-between w-full">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{item.productName}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.productCategory} - {item.productVariant.color} /{" "}
                    {item.productVariant.size}
                  </p>
                </div>
                <p className="text-sm font-medium text-gray-900">
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
                    <Minus className="h-3 w-3" />
                    <span className="sr-only">减少数量</span>
                  </Button>

                  <span className="w-5 text-center text-sm font-medium leading-none">{item.quantity}</span>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      console.table(item.productVariant)
                      updateQuantity(item.productVariant.id, item.quantity + 1);
                    }}
                    disabled={item.quantity >= item.productVariant.stockQuantity}
                  >
                    <Plus className="h-3 w-3" />
                    <span className="sr-only">增加数量</span>
                  </Button>

                  {item.productVariant.stockQuantity !== undefined && (
                    <span className={`text-xs ml-3 ${item.productVariant.stockQuantity - item.quantity <= 5 && item.productVariant.stockQuantity - item.quantity > 0 ? 'text-orange-500' : item.productVariant.stockQuantity - item.quantity <= 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        库存: {item.productVariant.stockQuantity}
                      {item.productVariant.stockQuantity - item.quantity <= 5 && item.productVariant.stockQuantity - item.quantity > 0 && ' (较低)'}
                      {item.productVariant.stockQuantity - item.quantity <= 0 && ' (无货)'}
                    </span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-red-500"
                  onClick={() =>
                    handleRemoveItem(
                      item.productVariant.id,
                      item.productName,
                      item.productVariant.color,
                      item.productVariant.size
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">移除商品</span>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Separator className="mt-2" />

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-700">
            <span>小计</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-700">
            <span>运费</span>
            <span>{formatPrice(shipping)}</span>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between font-semibold text-base text-gray-900">
          <span>总计</span>
          <span>{formatPrice(total)}</span>
        </div>

        <Button className="w-full" onClick={() => createOrder(cartItems)} disabled={cartItems.length === 0}>
          提交订单
        </Button>
      </div>
    </div>
  );
}