"use client"

import type React from "react";
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, ShoppingCart } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { cn, formatPrice } from "@/lib/utils"
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { addToWishlist, API_URL, removeFromWishlist } from "@/lib/api";
import { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product
  index?: number
}

const MotionButton = motion.create(Button);

export function ProductCard({product, index = 0}: ProductCardProps) {
  const router = useRouter();
  const {token, isLoading} = useAuth();
  const [isWishlisted, setIsWishlisted] = useState(product.wishlisted);

  const checkLogin = (): boolean => {

    if (isLoading) {
      if (!token && !isLoading) {
        toast.error("请先登录", {
          action: {
            label: "登录",
            onClick: () => router.push("/auth/login"),
          },
        });
        return false;
      }
      if (isLoading) return false;
    }

    if (!token) {
      toast.error("请先登录", {
        action: {
          label: "登录",
          onClick: () => router.push("/auth/login"),
        },
      });
      return false;
    }
    return true;
  };

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!checkLogin()) {
      return;
    }
    try {
      if (!isWishlisted) {
        await addToWishlist(token!, product.id);
        setIsWishlisted(true);
        toast.success("已添加到愿望单");
      } else {
        await removeFromWishlist(token!, product.id);
        setIsWishlisted(false);
        toast.success("已从愿望单中移除");
      }
    } catch (error: any) {
      console.error("Wishlist API error:", error);

      const errorMessage = error.response?.data?.message || error.message || "未知错误";
      toast.error(`${isWishlisted ? "移除" : "加入"}愿望单失败`, {description: errorMessage});
    }
  };

  const isNew = product.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000);
  const isSale = product.status === "ACTIVE"
  const isOutOfStock = product.totalStock === 0

  const href = `/product/${product.id}`

  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.3, delay: index * 0.1}}
      className="group relative h-full"
    >
      <div className="flex h-full flex-col overflow-hidden rounded-md border bg-card text-card-foreground shadow-sm">
        <Link
          href={href}
          className="relative block aspect-[3/4] overflow-hidden rounded-t-md bg-gray-100"
          onClick={(e) => {
            if (!checkLogin()) {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
        >
          <Image
            src={`${API_URL}/api/image${product.defaultImage || "/placeholder.svg"}`}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />

          <MotionButton
            variant="outline"
            size="icon"
            className={cn(
              `absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm`,
              isWishlisted ? "text-red-500" : "text-gray-500"
            )}
            onClick={toggleWishlist}

            whileHover={{scale: 1.1}}
            whileTap={{scale: 0.9}}
          >
            <Heart className={cn("h-4 w-4", isWishlisted && "fill-current")}/>
            <span className="sr-only">Add to wishlist</span>
          </MotionButton>

          {isNew && (
            <div className="absolute left-2 top-2 z-10 rounded-md bg-black px-2 py-1">
              <span className="text-xs font-medium text-white">NEW</span>
            </div>
          )}
          {isSale && !isNew && (
            <div className="absolute left-2 top-2 z-10 rounded-md bg-red-600 px-2 py-1">
              <span className="text-xs font-medium text-white">SALE</span>
            </div>
          )}
          {isOutOfStock && !isNew && !isSale && (
            <div className="absolute left-2 top-2 z-10 rounded-md bg-gray-800 px-2 py-1">
              <span className="text-xs font-medium text-white">OUT OF STOCK</span>
            </div>
          )}
          <div
            className="absolute bottom-0 left-0 right-0 z-10 translate-y-full bg-black/70 p-4 transition-transform duration-200 group-hover:translate-y-0">
            <span className="text-sm font-medium text-white">{product.description || "暂无描述"}</span>
          </div>
        </Link>

        <div className="flex-grow space-y-1 p-4">
          <Link
            href={href}
            className="hover:underline"
            onClick={(e) => {
              if (!checkLogin()) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
          >
            <h3 className="text-sm font-medium">{product.name}</h3>
          </Link>
          <p className="text-sm text-muted-foreground">{product.category}</p>
        </div>
        <div className="flex items-center justify-between p-4 pt-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{formatPrice(product.minPrice)}</span>
          </div>
          <MotionButton
            size="sm"
            className="rounded-full"
            onClick={() => {

              if (!checkLogin()) {
                return
              }
              router.push(href)
            }}
            whileHover={{scale: 1.05}}
            whileTap={{scale: 1}}
          >
            <ShoppingCart className="mr-2 h-4 w-4"/>
            加入购物车
          </MotionButton>
        </div>
      </div>
    </motion.div>
  )
}