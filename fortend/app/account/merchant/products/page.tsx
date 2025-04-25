import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ProductsTable } from "@/components/products-table"
import { ProductsStats } from "@/components/products-stats"

export const metadata: Metadata = {
  title: "Products | Merchant Dashboard",
  description: "Manage your product inventory",
}

export default function ProductsPage() {
  return (
    <div className="space-y-6 ml-2 ">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Products</h3>
          <p className="text-sm text-muted-foreground">
            Manage your product inventory, add new products, or update existing ones.
          </p>
        </div>
        <Button asChild>
          <Link href="/account/merchant/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>
      <Separator />
      <ProductsStats />
      <ProductsTable />
    </div>
  )
}
