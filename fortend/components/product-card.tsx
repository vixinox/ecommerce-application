"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, ShoppingCart } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import type { Product } from "@/lib/types"
import { formatPrice } from "@/lib/utils"
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

const MotionButton = motion.create(Button);

export function ProductCard({product}: { product: Product }) {
  const router = useRouter();
  const {user, token} = useAuth()
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 当用户登录时，检查商品是否在愿望单中
  useEffect(() => {
    if (user && token) {
      checkInWishlist()
    }
  }, [user, token, product.id])

  const checkInWishlist = async () => {
    try {
      const response = await fetch(`${API_URL}/api/wishlist`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        const wishlistItems = await response.json()
        const isInWishlist = wishlistItems.some((item: any) => item.productId === Number(product.id))
        setIsWishlisted(isInWishlist)
      }
    } catch (error) {
      console.error("检查愿望单状态失败:", error)
    }
  }

  const checkLogin = () => {
    if (!user || !token) {
      toast.error("请先登录", {
        action: {
          label: "登录",
          onClick: () => router.push("/auth/login"),
        },
      })
      return false;
    }
    return true;
  }

  const toggleWishlist = async () => {
    if (!checkLogin()) return;
    
    setIsLoading(true)
    try {
      // 修改URL和请求方法以匹配后端
      const url = isWishlisted 
        ? `${API_URL}/api/wishlist/remove/${product.id}` 
        : `${API_URL}/api/wishlist/add`;
      const method = isWishlisted ? "DELETE" : "POST";
      
      const requestOptions: RequestInit = {
        method,
        headers: {
          "Authorization": `Bearer ${token}`
        }
      };

      // 如果是添加操作，添加请求体
      if (!isWishlisted) {
        requestOptions.headers = { 
          ...requestOptions.headers,
          'Content-Type': 'application/json'
        };
        requestOptions.body = JSON.stringify({ productId: product.id });
      }

      const response = await fetch(url, requestOptions);

      if (response.ok) {
        setIsWishlisted(!isWishlisted)
        if (!isWishlisted)
          toast.success(`${product.name} 已加入愿望单`)
        else
          toast(`${product.name} 已从愿望单移除`)
      } else {
        const errorText = await response.text(); // 获取错误信息
        throw new Error(errorText || "操作失败")
      }
    } catch (error) {
      toast.error((error as Error).message || (isWishlisted ? "移除商品失败" : "添加商品失败"));
      console.error("愿望单操作失败:", error);
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden group">
      <Link
        href={`/product/${product.id}`}
        className="relative aspect-square block"
        onClick={(e) => {
          if (!checkLogin())
            e.preventDefault();
        }}
      >
        <Image
          src={product.defaultImage ? `${API_URL}/api/image${product.defaultImage}` : "/placeholder.svg"}
          alt={product.name}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 25vw"
        />
        <MotionButton
          variant="ghost"
          size="icon"
          className={`absolute right-2 top-2 z-10 rounded-full bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 ${
            isWishlisted ? "text-red-500" : "text-gray-500"
          }`}
          onClick={(e) => {
            e.preventDefault()
            toggleWishlist()
          }}
          whileHover={{scale: 1.1}}
          whileTap={{scale: 0.9}}
          disabled={isLoading}
        >
          <Heart className={`h-5 w-5 ${isWishlisted ? "fill-current" : ""}`}/>
          <span className="sr-only">Add to wishlist</span>
        </MotionButton>
      </Link>
      <CardContent className="p-4">
        <Link
          href={`/product/${product.id}`}
          className="hover:underline"
          onClick={(e) => {
            if (!checkLogin())
              e.preventDefault();
          }}
        >
          <h3 className="font-medium">{product.name}</h3>
        </Link>
        <p className="text-sm text-muted-foreground">{product.category}</p>
      </CardContent>
      <CardFooter className="flex items-center justify-between p-4 pt-0">
        <div className="font-semibold">{formatPrice(product.minPrice)}</div>
        <MotionButton
          size="sm"
          className="rounded-full"
          onClick={() => {
            if (!checkLogin()) return;
            router.push(`/product/${product.id}`)
          }}
          whileHover={{scale: 1.05}}
          whileTap={{scale: 1}}
        >
          <ShoppingCart className="mr-2 h-4 w-4"/>
          查看详情
        </MotionButton>
      </CardFooter>
    </Card>
  )
}