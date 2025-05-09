"use client";

import { useEffect, useState } from 'react';
import ProductGrid from "@/components/products/product-grid";
import { ShoppingCartProvider } from "@/providers/shopping-cart-provider";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { API_URL } from "@/lib/api";
import { Product } from "@/lib/types";
import { ProductGridLoading } from "@/components/skeleton/product-grid-loading";
import { useAuth } from "@/providers/auth-provider";

export default function HomePage() {
  const {token} = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);

  async function getProducts(token: string | null): Promise<Product[]> {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/api/products`, {
        method: "GET",
        headers: headers,
        cache: 'no-store',
      });

      if (!res.ok) {
        console.error("无法获取产品列表:", res.status, res.statusText);
        setError(true)
        return [];
      }

      const data = await res.json();
      return data.list;

    } catch (error: any) {
      console.error("其它错误:", error);
      setError(true)
      return [];
    }
  }

  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true);
      const fetchedProducts = await getProducts(token);
      setProducts(fetchedProducts);
      setIsLoading(false);
    }

    fetchProducts();
  }, [token]);

  return (
    <ShoppingCartProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader/>
        <main className="flex-1 w-full max-w-7xl mx-auto">
          <section className="container py-6 md:py-10">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">电商网站</h1>
                <p className="text-muted-foreground">浏览、购买或发布产品</p>
              </div>
              {isLoading ? (
                <ProductGridLoading/>
              ) : (
                <ProductGrid initialProducts={products} isNetworkError={error}/>
              )}
            </div>
          </section>
        </main>
        <SiteFooter/>
      </div>
    </ShoppingCartProvider>
  );
}