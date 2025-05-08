"use client"

import { useState } from "react"
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
import { addToWishlist, API_URL, removeFromWishlist } from "@/lib/api";

const MotionButton = motion.create(Button);

export function ProductCard({product}: { product: Product }) {
  const router = useRouter();
  const {token, isLoading} = useAuth()
  const [isWishlisted, setIsWishlisted] = useState(product.wishlisted)

  const checkLogin = () => {
    if (isLoading) return;
    if (!token) {
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
    try {
      if (!token) {
        toast.error("请先登录")
        router.push("/auth/login")
        return;
      }
      if (!isWishlisted) {
        await addToWishlist(token, product.id)
        setIsWishlisted(true)
        toast.success("已添加到愿望单")
      } else {
        await removeFromWishlist(token, product.id)
        setIsWishlisted(false)
        toast.success("已从愿望单中移除")
      }
    } catch (error: any) {
      console.error(error)
      toast.error(`${isWishlisted ? "加入" : "移除"}愿望单失败`, {description: error.message})
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