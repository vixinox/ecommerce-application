"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowDown, Heart, Loader2, Plus, ShoppingCart, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import SiteHeader from "@/components/site-header"
import SiteFooter from "@/components/site-footer"
import { motion } from "framer-motion"
import { API_URL, getWishlist } from "@/lib/api"
import { formatPrice } from "@/lib/utils"
import { ShoppingCartProvider, useShoppingCart } from "@/components/shopping-cart-provider"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface WishlistItem {
  wishlistItemId: number
  productId: number
  addedAt: string
  productName: string
  productCategory: string
  productDefaultImage: string
  productMinPrice: number
}

const MotionCard = motion(Card)
const MotionBadge = motion(Badge)
const MotionDiv = motion.div
const MotionButton = motion(Button)
const MotionPlusIcon = motion(Plus)
const cardVariants = {
  rest: {
    borderColor: "hsl(var(--border))",
    boxShadow: "0px 0px 0px rgba(0,0,0,0)",
    transition: {duration: 0.2, type: "tween"},
  },
  hover: {
    borderColor: "hsl(var(--primary) / 0.2)",
    boxShadow: "0px 8px 16px rgba(0,0,0,0.1)",
    transition: {duration: 0.2, type: "tween"},
  }
}
const mediaVariants = {
  rest: {scale: 1, opacity: 1, transition: {duration: 0.3, type: "tween"}},
  hover: {scale: 1.05, opacity: 1, transition: {duration: 0.3, type: "tween"}}
}
const overlayVariants = {
  rest: {opacity: 0, transition: {duration: 0.3, type: "tween"}},
  hover: {opacity: 1, transition: {duration: 0.3, type: "tween"}}
}
const removeButtonVariants = {
  rest: {opacity: 0, scale: 0.9, transition: {duration: 0.3, type: "tween"}},
  hover: {opacity: 1, scale: 1, transition: {duration: 0.3, type: "tween"}}
}
const badgeEntryVariants = {
  initial: {opacity: 0, scale: 0.8},
  animate: {opacity: 1, scale: 1, transition: {duration: 0.3, delay: 0.2}}
}
const batchToolbarVariants = {
  initial: {opacity: 0, y: -20},
  animate: {opacity: 1, y: 0, transition: {duration: 0.3}}
}
const emptyStateVariants = {
  initial: {opacity: 0, y: 20},
  animate: {opacity: 1, y: 0, transition: {duration: 0.5, staggerChildren: 0.2}}
}
const emptyStateChildVariants = {
  initial: {opacity: 0, y: 20},
  animate: {opacity: 1, y: 0}
}
export default function WishlistPage() {
  const router = useRouter()
  const {user, token, isLoading} = useAuth()
  const {addToCart} = useShoppingCart()
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [sortOrder, setSortOrder] = useState<string>("newest")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const categories = wishlistItems.length > 0
    ? Array.from(new Set(wishlistItems.map(item => item.productCategory)))
    : []
  const sortedItems = [...wishlistItems].sort((a, b) => {
    switch (sortOrder) {
      case "newest":
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      case "oldest":
        return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()
      case "price_high":
        return b.productMinPrice - a.productMinPrice
      case "price_low":
        return a.productMinPrice - b.productMinPrice
      case "name_az":
        return a.productName.localeCompare(b.productName)
      case "name_za":
        return b.productName.localeCompare(a.productName)
      default:
        return 0
    }
  }).filter(item => {
    if (selectedCategory === "all") return true
    return item.productCategory === selectedCategory
  })
  useEffect(() => {
    fetchWishlist()
  }, [user, token, router, isLoading])
  const fetchWishlist = async () => {
    try {
      if (isLoading) return
      if (!token) {
        router.push("/auth/login")
        return
      }
      setLoading(true)
      const data = await getWishlist(token)
      setWishlistItems(data)
      setSelectedItems([])
    } catch (error: any) {
      toast.error("获取愿望单失败", {description: error.message})
    } finally {
      setLoading(false)
    }
  }
  const removeFromWishlist = async (productId: number, productName: string) => {
    try {
      const response = await fetch(`${API_URL}/api/wishlist/remove/${productId}`, {
        method: "DELETE",
        headers: {"Authorization": `Bearer ${token}`}
      })
      if (!response.ok) {
        if (response.status === 404) {
          setWishlistItems(currentItems => currentItems.filter(item => item.productId !== productId))
          setSelectedItems(currentSelected => currentSelected.filter(id => id !== productId))
          toast.info(`${productName} 已不在愿望单中`)
          return
        } else {
          const errorText = await response.text()
          throw new Error(errorText || "移除商品失败")
        }
      }
      setWishlistItems(currentItems => currentItems.filter(item => item.productId !== productId))
      setSelectedItems(currentSelected => currentSelected.filter(id => id !== productId))
      toast.success(`${productName} 已从愿望单移除`)
    } catch (error) {
      toast.error((error as Error).message || "移除商品失败")
      console.error("移除商品失败:", error)
    }
  }
  const addItemToCart = async (productId: number, productName: string, isBatch: boolean = false) => {
    try {
      const response = await fetch(`${API_URL}/api/products/${productId}`)
      if (!response.ok) {
        throw new Error("获取商品信息失败")
      }
      const productDetail = await response.json()
      if (productDetail.variants && productDetail.variants.length > 0) {
        const defaultVariant = productDetail.variants[0]
        if (defaultVariant.inStock) {
          if (!isBatch) {
            addToCart(defaultVariant.id, 1)
            toast.success(`${productName} 已加入购物车`, {
              description: `已添加默认款式：${defaultVariant.color} ${defaultVariant.size}`
            })
          }
          return {success: true, variantId: defaultVariant.id, productName}
        } else {
          if (!isBatch) toast.error(`${productName} 库存不足`)
          return {success: false, productName, reason: "库存不足"}
        }
      } else {
        if (!isBatch) toast.error(`${productName} 没有可用款式`)
        return {success: false, productName, reason: "没有可用款式"}
      }
    } catch (error) {
      if (!isBatch) toast.error(`添加 ${productName} 到购物车失败`)
      console.error(`添加 ${productName} 到购物车失败:`, error)
      return {success: false, productName, reason: "获取信息失败"}
    }
  }
  const handleSelectItem = (productId: number) => {
    if (selectedItems.includes(productId)) {
      setSelectedItems(selectedItems.filter(id => id !== productId))
    } else {
      setSelectedItems([...selectedItems, productId])
    }
  }
  const selectAllItems = () => {
    if (selectedItems.length > 0 && selectedItems.length === sortedItems.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(sortedItems.map(item => item.productId))
    }
  }
  const removeSelectedItems = async () => {
    for (const productId of selectedItems) {
      const item = wishlistItems.find(item => item.productId === productId)
      if (item) {
        await removeFromWishlist(productId, item.productName)
      }
    }
    setSelectedItems([])
  }
  const addSelectedToCart = async () => {
    const itemsToAdd = [...selectedItems]
    if (itemsToAdd.length === 0) {
      toast.info("请先选择要加入购物车的商品")
      return
    }
    const addingToastId = toast.loading(`正在添加 ${itemsToAdd.length} 件商品到购物车...`)
    let successfullyAddedCount = 0
    let failedItems: string[] = []
    const results = await Promise.all(
      itemsToAdd.map(productId => {
        const item = wishlistItems.find(i => i.productId === productId)
        return addItemToCart(productId, item?.productName || `商品 ${productId}`, true)
      })
    )
    const variantsToAdd: number[] = []
    results.forEach(result => {
      if (result.success && result.variantId) {
        variantsToAdd.push(result.variantId)
      } else {
        failedItems.push(result.productName || "未知商品")
      }
    })
    variantsToAdd.forEach(variantId => {
      addToCart(variantId, 1)
      successfullyAddedCount++
    })
    if (successfullyAddedCount === itemsToAdd.length) {
      toast.success(`已成功添加 ${successfullyAddedCount} 件商品到购物车`, {id: addingToastId})
    } else if (successfullyAddedCount > 0) {
      toast.warning(`成功添加 ${successfullyAddedCount} 件商品，${failedItems.length} 件失败 (${failedItems.join(', ')})`, {id: addingToastId})
    } else {
      toast.error(`未能添加任何所选商品到购物车`, {id: addingToastId})
    }
    setSelectedItems([])
  }
  return (
    <ShoppingCartProvider>
      <div
        className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-background/80 dark:from-background dark:via-background/95 dark:to-background/90">
        <SiteHeader/>
        <main className="flex-1">
          <div className="container py-8 md:py-12 mx-auto lg:px-32 md:px-16">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
              <div className="space-y-1">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">我的愿望单</h1>
                <p className="text-muted-foreground">
                  {wishlistItems.length > 0
                    ? `您的愿望单中有 ${wishlistItems.length} 件商品`
                    : "您的愿望单是空的"}
                </p>
              </div>
              {wishlistItems.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="w-[160px] rounded-full border-dashed">
                      <SelectValue placeholder="排序方式"/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">最新添加</SelectItem>
                      <SelectItem value="oldest">最早添加</SelectItem>
                      <SelectItem value="price_high">价格从高到低</SelectItem>
                      <SelectItem value="price_low">价格从低到高</SelectItem>
                      <SelectItem value="name_az">名称 A-Z</SelectItem>
                      <SelectItem value="name_za">名称 Z-A</SelectItem>
                    </SelectContent>
                  </Select>
                  {categories.length > 0 && (
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-[160px] rounded-full border-dashed">
                        <SelectValue placeholder="商品分类"/>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部分类</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
            {loading ? (
              <div className="flex flex-col justify-center items-center py-32 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary"/>
                <p className="text-muted-foreground font-medium">正在加载愿望单...</p>
              </div>
            ) : wishlistItems.length === 0 ? (
              <MotionDiv
                className="py-32 text-center space-y-6"
                initial="initial"
                animate="animate"
                variants={emptyStateVariants}
              >
                <MotionDiv
                  className="relative mx-auto w-32 h-32 grid place-items-center"
                  variants={emptyStateChildVariants}
                >
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse"></div>
                  <Heart className="h-20 w-20 text-primary/70" strokeWidth={1.5}/>
                </MotionDiv>
                <MotionDiv className="space-y-2 max-w-md mx-auto" variants={emptyStateChildVariants}>
                  <h2 className="text-2xl font-medium">您的愿望单还是空的</h2>
                  <p className="text-muted-foreground">浏览我们的精选商品，将您喜欢的商品添加到愿望单，稍后方便购买</p>
                </MotionDiv>
                <MotionDiv variants={emptyStateChildVariants}>
                  <Button size="lg" asChild className="rounded-full px-8 mt-4">
                    <Link href="/">
                      <ShoppingCart className="mr-2 h-5 w-5"/>
                      开始购物
                    </Link>
                  </Button>
                </MotionDiv>
              </MotionDiv>
            ) : (
              <>
                {wishlistItems.length > 0 && (
                  <MotionDiv
                    className="flex justify-between items-center mb-8 p-4 bg-card border border-border rounded-xl shadow-sm"
                    initial="initial"
                    animate="animate"
                    variants={batchToolbarVariants}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="selectAll"
                        checked={selectedItems.length > 0 && selectedItems.length === sortedItems.length}
                        onCheckedChange={selectAllItems}
                        className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <label htmlFor="selectAll" className="font-medium">
                        {selectedItems.length > 0
                          ? `已选择 ${selectedItems.length} 件商品`
                          : "全选"}
                      </label>
                    </div>
                    <div className="flex gap-3">
                      {selectedItems.length > 0 && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full px-4"
                            onClick={addSelectedToCart}
                          >
                            <ShoppingCart className="mr-2 h-4 w-4"/>
                            加入购物车
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="rounded-full px-4"
                              >
                                <Trash2 className="mr-2 h-4 w-4"/>
                                移除所选
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-lg">
                              <AlertDialogHeader>
                                <AlertDialogTitle>确定要移除所选商品吗？</AlertDialogTitle>
                                <AlertDialogDescription>
                                  您选择的 {selectedItems.length} 件商品将从愿望单中移除。此操作无法撤销。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-full">取消</AlertDialogCancel>
                                <AlertDialogAction onClick={removeSelectedItems}
                                                   className="rounded-full">确定移除</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </MotionDiv>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {sortedItems.map((item, index) => (
                    <MotionCard
                      key={item.wishlistItemId}
                      className="group relative overflow-hidden border rounded-xl"
                      initial="rest"
                      animate="rest"
                      whileHover="hover"
                      variants={cardVariants}
                      transition={{duration: 0.2, delay: index * 0.05}}
                    >
                      <div className="absolute left-3 top-3 z-10">
                        <Checkbox
                          checked={selectedItems.includes(item.productId)}
                          onCheckedChange={() => handleSelectItem(item.productId)}
                          className="bg-white/90 backdrop-blur-sm border-2 border-white/40 shadow-sm dark:bg-gray-900/80"
                        />
                      </div>
                      {(item.productId % 3 === 0) && (
                        <MotionBadge
                          className="absolute left-10 top-3 z-10 bg-green-600 shadow-md"
                          variants={badgeEntryVariants}
                          initial="initial"
                          animate="animate"
                        >
                          <ArrowDown className="h-3 w-3 mr-1"/> 价格下降
                        </MotionBadge>
                      )}
                      <MotionDiv
                        className="relative aspect-square block overflow-hidden"
                        variants={mediaVariants}
                      >
                        <Link href={`/product/${item.productId}`}>
                          <Image
                            src={item.productDefaultImage ? `${API_URL}/api/image${item.productDefaultImage}` : "/placeholder.svg"}
                            alt={item.productName}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 25vw"
                          />
                          <MotionDiv
                            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
                            variants={overlayVariants}
                          />
                        </Link>
                      </MotionDiv>
                      <MotionDiv
                        className="absolute right-3 top-3 z-10"
                        variants={removeButtonVariants}
                      >
                        <MotionButton
                          variant="destructive"
                          size="icon"
                          className="rounded-full shadow-lg"
                          onClick={(e) => {
                            e.preventDefault()
                            removeFromWishlist(item.productId, item.productName)
                          }}
                        >
                          <X className="h-4 w-4"/>
                          <span className="sr-only">从愿望单移除</span>
                        </MotionButton>
                      </MotionDiv>
                      <CardContent className="p-5">
                        <Link href={`/product/${item.productId}`} className="hover:underline block">
                          <h3 className="font-medium text-lg leading-tight mb-1 line-clamp-2">{item.productName}</h3>
                        </Link>
                        <Badge variant="outline" className="rounded-full font-normal text-sm text-muted-foreground">
                          {item.productCategory}
                        </Badge>
                      </CardContent>
                      <CardFooter className="flex items-center justify-between p-5 pt-0">
                        <div className="font-bold text-lg text-primary">{formatPrice(item.productMinPrice)}</div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full hover:bg-primary dark:hover:text-black transition-colors group/cart-btn"
                            onClick={() => addItemToCart(item.productId, item.productName)}
                          >
                            <MotionPlusIcon
                              className="mr-1 h-4 w-4"
                              whileHover={{rotate: 90}}
                              transition={{duration: 0.3}}
                            />
                            购物车
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-full"
                            onClick={() => {
                              router.push(`/product/${item.productId}`)
                            }}
                          >
                            <ShoppingCart className="h-4 w-4"/>
                          </Button>
                        </div>
                      </CardFooter>
                    </MotionCard>
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
        <SiteFooter/>
      </div>
    </ShoppingCartProvider>
  )
}