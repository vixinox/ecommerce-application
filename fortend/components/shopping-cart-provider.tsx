"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { CartItem } from "@/lib/types";

interface ShoppingCartContext {
  cartItems: CartItem[];
  addToCart: (variantId: number, quantity: number) => Promise<void>;
  removeFromCart: (variantId: number) => Promise<void>;
  updateQuantity: (variantId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  createOrder: (items: CartItem[]) => Promise<void>;
}

const ShoppingCartContext = createContext<ShoppingCartContext | undefined>(undefined);

export function useShoppingCart() {
  const context = useContext(ShoppingCartContext);
  if (!context)
    throw new Error("useShoppingCart must be used within a ShoppingCartProvider");
  return context;
}

export function ShoppingCartProvider({children}: { children: ReactNode }) {
  const router = useRouter();
  const {user, token, isLoading} = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const getCartItems = async () => {
    try {
      if (!user && !token)
        return;

      const res = await fetch(`${API_URL}/api/cart/get`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          toast.error("请登录后操作");
          router.push("/auth/login");
        } else {
          toast.error("获取购物车失败", {description: res.text()});
        }
      } else {
        const data: CartItem[] = await res.json();
        const processedData = data.map(item => ({
          ...item,
          cartId: Number(item.cartId),
          quantity: Number(item.quantity)
        }));
        setCartItems(processedData);
      }
    } catch (e: any) {
      toast.error("获取购物车发生意外错误", {description: e.message});
      setCartItems([]);
    }
  };

  useEffect(() => {
    getCartItems();
  }, [token, isLoading]);

  const addToCart = async (variantId: number, quantity: number = 1) => {
    try {
      const res = await fetch(`${API_URL}/api/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          variantId: variantId,
          quantity: quantity,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          toast.error("请登录后操作");
          router.push("/auth/login");
          return;
        }
        throw new Error(`${await res.text()}`);
      }

      await getCartItems();
    } catch (e: any) {
      toast.error("添加购物车失败", {description: e.message});
    }
  };

  const removeFromCart = async (cartId: number) => {
    const itemToRemove = cartItems.find(item => item.cartId === cartId);

    if (!itemToRemove) {
      console.warn(`Item with variantId ${cartId} not found in local state, cannot remove.`);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/cart/remove`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({cartId: itemToRemove.cartId}),
      });

      if (!res.ok) {
        if (res.status === 401) {
          toast.error("请登录后操作");
          router.push("/auth/login");
        }
        throw new Error(`${await res.text()}`);
      }

      await getCartItems();
    } catch (e: any) {
      toast.error("移除购物车商品失败", {description: e.message});
    }
  };
  const updateQuantity = async (variantId: number, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(variantId);
      return;
    }

    const itemToUpdate = cartItems.find(item => item.productVariant.id === variantId);
    if (!itemToUpdate) {
      console.warn(`Item with variantId ${variantId} not found in local state, cannot update quantity.`);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/cart/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cartId: itemToUpdate.cartId,
          variantId: variantId,
          quantity: quantity
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          toast.error("请登录后操作");
          router.push("/auth/login");
        } else {
          toast.error("更新商品数量失败", {description: res.text()});
        }
      } else {
        toast.success("商品数量已更新");
        getCartItems();
      }
    } catch (e: any) {
      toast.error("更新商品数量发生意外错误", {description: e.message});
    }
  };

  const clearCart = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cart/clear`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          toast.error("请登录后操作");
          router.push("/auth/login");
        } else {
          toast.error("清空购物车失败", {description: res.text()});
        }
      } else {
        toast.success("购物车已清空");
        setCartItems([]);
      }
    } catch (e: any) {
      toast.error("清空购物车发生意外错误", {description: e.message});
    }
  };

  const createOrder = async (items: CartItem[]) => {
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(items),
      })

      if (!res.ok) {
        if (res.status === 401) {
          toast.error("请登陆后操作");
          router.push("/auth/login");
        } else {
          toast.error("创建订单失败", {description: res.text()});
        }
      } else {
        toast.success("下单成功");
      }
    } catch (e: any) {
      toast.error("创建订单发生意外错误", {description: e.message});
    }
  };

  return (
    <ShoppingCartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        createOrder
      }}
    >
      {children}
    </ShoppingCartContext.Provider>
  );
}