import { notFound } from "next/navigation"
import { ShoppingCartProvider } from "@/providers/shopping-cart-provider"
import SiteHeader from "@/components/site-header"
import { ProductDetail } from "@/components/products/product-detail"
import { ProductDetails } from "@/lib/types"
import SiteFooter from "@/components/site-footer";
import { API_URL } from "@/lib/api";

export default async function ProductPage({params}: { params: { id: string } }) {
  const productDetail = await getProductDetail(params.id);

  async function getProductDetail(id: string): Promise<ProductDetails> {
    try {
      const res = await fetch(`${API_URL}/api/products/${id}`);

      if (!res.ok) {
        console.error("获取商品数据失败:", res.status);
        notFound();
      }
      return await res.json();

    } catch (error) {
      console.error("获取商品数据失败:", error);
      notFound();
    }
  }

  return (
    <ShoppingCartProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader/>
        <main className="flex-1">
          <div className="container py-6 md:py-10 mx-auto">
            <ProductDetail productDetail={productDetail}/>
          </div>
        </main>
        <SiteFooter/>
      </div>
    </ShoppingCartProvider>
  )
}
