"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";

import { API_URL } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { FetchedProductDTO } from "@/lib/types";

type ProductStatus = 'loading' | 'success' | 'error' | 'unauthorized' | 'notFound';

export function ProductView({param}: { param: string }) {
  const {token, isLoading} = useAuth();
  const router = useRouter();
  const [productData, setProductData] = useState<FetchedProductDTO | null>(null);
  const [status, setStatus] = useState<ProductStatus>('loading');
  const [parsedSpecs, setParsedSpecs] = useState<Record<string, string>>({});
  const [parsedFeatures, setParsedFeatures] = useState<string[]>([]);
  const [imageUrlMap, setImageUrlMap] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isLoading) return;

    if (!param) {
      setStatus('notFound');
      toast.error("未提供商品ID");
      router.back();
      return;
    }

    if (!token) {
      setStatus('unauthorized');
      toast.error("请先登录");
      router.push("/auth/login");
      return;
    }

    setStatus('loading');

    const fetchProduct = async () => {
      try {
        const res = await fetch(`${API_URL}/api/products/edit/${param}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data: FetchedProductDTO = await res.json();
          setProductData(data);

          try {
            setParsedFeatures(JSON.parse(data.featuresJson || '[]'));
          } catch (e) {
            console.error("Failed to parse featuresJson", e);
            setParsedFeatures([]);
          }

          try {
            const specsArray = JSON.parse(data.specificationsJson || '[]');
            const specsObject = specsArray.reduce((acc: Record<string, string>, item: {
              key: string,
              value: string
            }) => {
              acc[item.key] = item.value;
              return acc;
            }, {});
            setParsedSpecs(specsObject);
          } catch (e) {
            console.error("Failed to parse specificationsJson", e);
            setParsedSpecs({});
          }

          setImageUrlMap(data.colorImageUrls || {});
          setStatus('success');

        } else {
          const errorText = await res.text();
          console.error(`Fetch Error (${res.status}):`, errorText);

          if (res.status === 401) {
            setStatus('unauthorized');
            toast.error("登录状态过期，请重新登录");
            router.push("/auth/login");
          } else if (res.status === 404) {
            setStatus('notFound');
            toast.error("商品不存在");
          } else {
            setStatus('error');
            toast.error(`获取商品详情失败`, {description: errorText || res.statusText});
          }
        }
      } catch (error: any) {
        console.error("Fetch error:", error);
        setStatus('error');
        toast.error(`获取商品详情失败`, {description: error.message || "网络请求失败"});
      }
    };

    fetchProduct();
  }, [param, token, router, isLoading]);

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-60 p-4">
        <Loader2 className="mr-2 h-8 w-8 animate-spin"/>
        <span className="text-lg text-muted-foreground">加载商品详情...</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex justify-center items-center min-h-60 p-4 text-destructive">
        <p>加载商品详情失败。请检查网络或稍后再试。</p>
      </div>
    );
  }

  if (status === 'unauthorized') {
    return (
      <div className="flex justify-center items-center min-h-60 p-4 text-destructive">
        <p>您没有权限查看此商品或登录状态已过期。请重新登录。</p>
      </div>
    );
  }

  if (status === 'notFound') {
    return (
      <div className="flex justify-center items-center min-h-60 p-4 text-destructive">
        <p>找不到该商品。</p>
      </div>
    );
  }

  if (!productData) {
    return null;
  }

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle>{productData.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium leading-none">商品分类</h4>
            <p className="text-sm text-muted-foreground">{productData.category || "未设置"}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium leading-none">商品描述</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{productData.description || "暂无描述"}</p>
          </div>
        </CardContent>
      </Card>

      <Separator/>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">商品图片</CardTitle>
          <p className="text-sm text-muted-foreground">每种颜色对应一张图片。</p>
        </CardHeader>
        <CardContent>
          {Object.keys(imageUrlMap).length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Object.entries(imageUrlMap).map(([color, imageUrl]) => (
                <div
                  key={color}
                  className="group relative aspect-square overflow-hidden rounded-md border"
                >
                  <Image
                    src={`${API_URL}/api/image${imageUrl}`}
                    alt={`商品图片 - ${color}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <Badge className="absolute left-1 top-1 z-10">{color}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无商品图片。</p>
          )}
        </CardContent>
      </Card>

      <Separator/>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">商品规格</CardTitle>
          <p className="text-sm text-muted-foreground">商品的技术规格参数。</p>
        </CardHeader>
        <CardContent>
          {Object.keys(parsedSpecs).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(parsedSpecs).map(([key, value]) => (
                <div key={key} className="flex justify-between border-b py-2 last:border-b-0">
                  <span className="text-sm font-medium">{key}:</span>
                  <span className="text-sm text-muted-foreground text-right">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无规格项。</p>
          )}
        </CardContent>
      </Card>

      <Separator/>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">商品特性</CardTitle>
          <p className="text-sm text-muted-foreground">商品的特性或卖点。</p>
        </CardHeader>
        <CardContent>
          {parsedFeatures.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {parsedFeatures.map((feature, index) => (
                <Badge key={index} variant="secondary">
                  {feature}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无特性项。</p>
          )}
        </CardContent>
      </Card>

      <Separator/>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">商品款式</CardTitle>
          <p className="text-sm text-muted-foreground">不同颜色和尺寸组合的库存与价格信息。</p>
        </CardHeader>
        <CardContent>
          {productData.variants && productData.variants.length > 0 ? (
            <div className="border rounded-md overflow-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>颜色</TableHead>
                    <TableHead>尺寸</TableHead>
                    <TableHead className="text-right">价格</TableHead>
                    <TableHead className="text-right">库存</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productData.variants.map((variant, index) => (
                    <TableRow key={variant.id || index}>
                      <TableCell>{variant.color}</TableCell>
                      <TableCell>{variant.size}</TableCell>
                      <TableCell className="text-right">¥{variant.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{variant.stockQuantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无款式组合信息。</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          返回列表
        </Button>
      </div>
    </div>
  );
}