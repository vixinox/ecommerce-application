"use client";

import {useEffect, useState} from 'react';
import ProductGrid from "@/components/product-grid";
import {ShoppingCartProvider} from "@/components/shopping-cart-provider";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import {API_URL} from "@/lib/api";
import {Product} from "@/lib/types";
import {SkeletonProductGrid} from "@/components/skeleton-product-grid";
import {useAuth} from "@/components/auth-provider";

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
        console.error("Failed to fetch products:", res.status, res.statusText);
      return [];
    }

    const data = await res.json();

      if (!data || !Array.isArray(data.list)) {
          console.error("API response format unexpected:", data);
          return [];
      }

      return data.list;

  } catch (error: any) {
      console.error("Error fetching products:", error);
    return [];
  }
}

export default function HomePage() {
    const {token} = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
                <h1 className="text-3xl font-bold tracking-tight">欢迎来到（TODO：网站名称）</h1>
                <p className="text-muted-foreground">TODO: 标语</p>
              </div>
                {isLoading ? (
                    <SkeletonProductGrid/>
                ) : (
                    <ProductGrid initialProducts={products}/>
                )}
            </div>
          </section>
        </main>
        <SiteFooter/>
      </div>
    </ShoppingCartProvider>
  );
}