import Link from "next/link"
import { ShoppingBag } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function ProductNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <ShoppingBag className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-3xl font-bold">找不到商品</h1>
      <p className="text-muted-foreground">你所访问的商品不存在，或已下架，请返回首页</p>
      <Button asChild>
        <Link href="/">回到主页</Link>
      </Button>
    </div>
  )
}
