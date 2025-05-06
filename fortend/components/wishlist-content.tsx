"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Heart, Loader2, ShoppingBag, ShoppingCart, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useShoppingCart } from "@/components/shopping-cart-provider"
import { useAuth } from "@/components/auth-provider"
import { formatPrice } from "@/lib/utils"
import { API_URL, getWishlist, removeFromWishlist } from "@/lib/api"

interface WishlistItemDTO {
  wishlistItemId: number
  productId: number
  addedAt: string
  productName: string
  productCategory: string
  productDefaultImage: string
  productMinPrice: number
}

export function WishlistContent() {
  const router = useRouter()
  const {token, isLoading} = useAuth()
  const {addToCart} = useShoppingCart()
  const [isFetching, setIsFetching] = useState(false)
  const [wishlistItems, setWishlistItems] = useState<WishlistItemDTO[]>([])
  const [removingItems, setRemovingItems] = useState<Record<number, boolean>>({})

  useEffect(() => {
    async function fetchWishlist() {

      try {
        if (!token) {
          toast.error("请先登录")
          router.push("/auth/login")
          return;
        }
        if (isLoading) return;
        setIsFetching(true)
        const data = await getWishlist(token)
        setWishlistItems(data)
      } catch (err: any) {
        toast.error("获取愿望单失败", {description: err.message})
      } finally {
        setIsFetching(false)
      }
    }

    fetchWishlist()
  }, [token, isLoading, router])

  const handleRemoveFromWishlist = async (productId: number) => {
    try {
      if (!token) {
        toast.error("请先登录")
        router.push("/auth/login")
        return;
      }
      if (isLoading) return;
      setRemovingItems((prev) => ({...prev, [productId]: true}))
      await removeFromWishlist(token, productId)
      setWishlistItems((prev) => prev.filter((item) => item.productId !== productId))
      toast.success("商品已从愿望单中移除")
    } catch (err) {
      console.error("移除失败:", err)
      toast.error("移除商品失败，请稍后再试")
    } finally {
      setRemovingItems((prev) => ({...prev, [productId]: false}))
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">我的愿望单</h1>
          <p className="text-muted-foreground">加载中，请稍候...</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({length: 4}).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="relative aspect-square">
                <Skeleton className="h-full w-full"/>
              </div>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2"/>
                <Skeleton className="h-4 w-1/2"/>
              </CardContent>
              <CardFooter className="flex items-center justify-between p-4 pt-0">
                <Skeleton className="h-5 w-1/4"/>
                <Skeleton className="h-9 w-28"/>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        <Heart className="h-16 w-16 text-muted-foreground"/>
        <div className="text-center">
          <h1 className="text-2xl font-bold">您的愿望单是空的</h1>
          <p className="text-muted-foreground mt-2">浏览商品并添加您喜欢的商品到愿望单</p>
          <Button className="mt-4" asChild>
            <Link href="/">
              <ShoppingBag className="mr-2 h-4 w-4"/>
              继续购物
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">我的愿望单</h1>
        <p className="text-muted-foreground">您已收藏 {wishlistItems.length} 件商品</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {wishlistItems.map((item) => (
          <Card key={item.wishlistItemId} className="overflow-hidden group">
            <Link href={`/product/${item.productId}`} className="relative aspect-square block">
              <Image
                src={`${API_URL}/api/image${item.productDefaultImage}` || "/placeholder.svg"}
                alt={item.productName}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
            </Link>
            <CardContent className="p-4">
              <Link href={`/product/${item.productId}`} className="hover:underline">
                <h3 className="font-medium">{item.productName}</h3>
              </Link>
              <div className="flex justify-between items-center mt-1">
                <p className="text-sm text-muted-foreground">{item.productCategory}</p>
                <p className="text-xs text-muted-foreground">添加于 {formatDate(item.addedAt)}</p>
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between p-4 pt-0">
              <div className="font-semibold">{formatPrice(item.productMinPrice)}</div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={removingItems[item.productId]}
                  onClick={() => handleRemoveFromWishlist(item.productId)}
                >
                  {removingItems[item.productId] ? (
                    <Loader2 className="h-4 w-4 animate-spin"/>
                  ) : (
                    <Trash2 className="h-4 w-4"/>
                  )}
                </Button>
                <Button size="sm" className="rounded-full"
                        onClick={() => router.push(`/product/${item.productId}`)}>
                  <ShoppingCart className="mr-2 h-4 w-4"/>
                  查看详情
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
