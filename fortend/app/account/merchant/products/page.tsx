import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import ProductDashboard from "@/components/products/product-dashboard";

export const metadata: Metadata = {
  title: "商品管理 | 管理面板",
  description: "管理您的商品库存，添加新商品，或更新现有商品。",
}

export default function ProductsPage() {
  return (
    <div className="space-y-6 ml-2 ">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">商品管理</h3>
          <p className="text-sm text-muted-foreground">
            管理您的商品库存，添加新商品，或更新现有商品。
          </p>
        </div>
        <Button asChild>
          <Link href="/account/merchant/products/new">
            <Plus className="mr-2 h-4 w-4"/>
            创建新商品
          </Link>
        </Button>
      </div>
      <Separator/>
      <ProductDashboard/>
    </div>
  )
}
