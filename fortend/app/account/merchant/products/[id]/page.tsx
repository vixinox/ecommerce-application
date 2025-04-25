import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { ProductForm } from "@/components/product-form"
import { mockProducts } from "@/lib/mock-products"

export const metadata: Metadata = {
  title: "Edit Product | Merchant Dashboard",
  description: "Edit your product details",
}

interface ProductEditPageProps {
  params: {
    id: string
  }
}

export default function ProductEditPage({ params }: ProductEditPageProps) {
  const product = mockProducts.find((p) => p.id === params.id)

  if (!product && params.id !== "new") {
    notFound()
  }

  const isNewProduct = params.id === "new"

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{isNewProduct ? "Add New Product" : "Edit Product"}</h3>
        <p className="text-sm text-muted-foreground">
          {isNewProduct
            ? "Create a new product for your store."
            : "Update your product information, images, and inventory."}
        </p>
      </div>
      <Separator />
      <ProductForm product={isNewProduct ? undefined : product} />
    </div>
  )
}
