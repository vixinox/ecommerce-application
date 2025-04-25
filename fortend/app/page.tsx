import ProductGrid from "@/components/product-grid";
import { ShoppingCartProvider } from "@/components/shopping-cart-provider";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { API_URL } from "@/lib/api";
import { Product } from "@/lib/products";

async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_URL}/api/products`, {});

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.list || [];

  } catch (error: any) {
    return [];
  }
}

export default async function HomePage() {
  const products = await getProducts();

  return (
    <ShoppingCartProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1 w-full max-w-7xl mx-auto">
          <section className="con tainer py-6 md:py-10">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">欢迎来到（TODO：网站名称）</h1>
                <p className="text-muted-foreground">TODO: 标语</p>
              </div>
              {(products === null || products.length === 0) ?
              <div>
                无法获取商品信息，请检查网络连接
              </div> :
                <ProductGrid initialProducts={products} />
              }
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </ShoppingCartProvider>
  );
}
