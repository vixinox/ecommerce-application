"use client"

import { ProductsStats } from "@/components/products-stats";
import { ProductsTable } from "@/components/products-table";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Product } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function ProductDashboard() {
  const router = useRouter();
  const {token} = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getProducts(): Promise<void> {
      const res = await fetch(`${API_URL}/api/products/manage`, {
        method: "GET",
        headers: {"Authorization": `Bearer ${token}`}
      });

      if (!res.ok) {
        if (res.status === 401) {
          toast.error("请先登录");
          router.push("/auth/login");
          return;
        }
        console.error("无法获取商品列表");
      } else {
        const data: Product[] = await res.json();
        setProducts(data);
      }
      setIsLoading(false);
    }

    getProducts();
  }, [token]);

  return (
    <>
      <ProductsStats products={products}/>
      <ProductsTable products={products} isLoading={isLoading}/>
    </>
  )
}