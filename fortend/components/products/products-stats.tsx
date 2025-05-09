import { AlertCircle, CheckCircle2, Package, ShoppingBag } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Product } from "@/lib/types";

export function ProductsStats({products}: { products: Product[] }) {
  const productList = products || [];

  const totalProductsCount = productList.length;

  const activeProductsCount = productList.filter(p => p.status === "ACTIVE").length;
  const activePercentage = totalProductsCount === 0
    ? "0%"
    : ((activeProductsCount / totalProductsCount) * 100).toFixed(1) + "%";

  const outOfStockCount = productList.filter(p => p.totalStock <= 0).length;
  const outOfStockPercentage = totalProductsCount === 0
    ? "0%"
    : ((outOfStockCount / totalProductsCount) * 100).toFixed(1) + "%";

  const uniqueCategoriesSet = new Set(productList.map(p => p.category));
  const categoryCount = uniqueCategoriesSet.size;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">总商品数</CardTitle>
          <ShoppingBag className="h-4 w-4 text-muted-foreground"/>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalProductsCount}</div>
          <p className="text-xs text-muted-foreground">全部商品总览</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">在售商品数</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground"/>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeProductsCount}</div>
          <p className="text-xs text-muted-foreground">占总商品数的 {activePercentage}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">缺货商品</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground"/>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{outOfStockCount}</div>
          <p className="text-xs text-muted-foreground">占总商品数的 {outOfStockPercentage}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">商品类目数</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground"/>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{categoryCount}</div>
          <p className="text-xs text-muted-foreground">覆盖全部商品</p>
        </CardContent>
      </Card>
    </div>
  )
}