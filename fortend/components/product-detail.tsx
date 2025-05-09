"use client"

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Heart, Loader2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useShoppingCart } from "@/components/shopping-cart-provider";
import { useAuth } from "@/components/auth-provider";
import { formatPrice } from "@/lib/utils";
import { ProductGallery } from "@/components/product-gallery";
import { ProductSpecifications } from "@/components/product-specifications";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { ProductDetails } from "@/lib/types";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export function ProductDetail({productDetail}: { productDetail: ProductDetails }) {
  const router = useRouter();
  const {addToCart} = useShoppingCart();
  const {user, token} = useAuth();
  const initialVariant = productDetail.variants?.[0];
  const [selectedColor, setSelectedColor] = useState<string>(initialVariant?.color || '');
  const [selectedSize, setSelectedSize] = useState<string>(initialVariant?.size || '');
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);

  const images: string[] = Array.from(new Set(
    productDetail.variants.map(variant => variant.image).filter((image): image is string => image !== null)
  ));

  const availableColors = useMemo(() => {
    if (!productDetail.variants) return [];
    return Array.from(new Set(productDetail.variants.map(v => v.color)));
  }, [productDetail.variants]);

  const availableSizesForColor = useMemo(() => {
    if (!productDetail.variants || !selectedColor) return [];
    const sizes = productDetail.variants.filter(variant => variant.color === selectedColor).map(variant => variant.size);
    return Array.from(new Set(sizes));
  }, [productDetail.variants, selectedColor]);

  const selectedVariant = useMemo(() => {
    if (!productDetail.variants || !selectedColor || !selectedSize)
      return undefined;
    return productDetail.variants.find(
      variant => variant.color === selectedColor && variant.size === selectedSize
    );
  }, [productDetail.variants, selectedColor, selectedSize]);

  useEffect(() => {
    if (selectedColor && availableSizesForColor.length > 0 && !availableSizesForColor.includes(selectedSize))
      setSelectedSize(availableSizesForColor[0]);
    else if (selectedColor && availableSizesForColor.length > 0 && selectedSize === '')
      setSelectedSize(availableSizesForColor[0]);
  }, [selectedColor, availableSizesForColor, selectedSize]);

  // 当用户登录时，检查商品是否在愿望单中
  useEffect(() => {
    if (user && token) {
      checkInWishlist();
    }
  }, [user, token, productDetail.id]);

  const checkInWishlist = async () => {
    try {
      const response = await fetch(`${API_URL}/api/wishlist`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        const wishlistItems = await response.json();
        const isInWishlist = wishlistItems.some((item: any) => item.productId === productDetail.id);
        setIsWishlisted(isInWishlist);
      }
    } catch (error) {
      console.error("检查愿望单状态失败:", error);
    }
  };

  const checkLogin = () => {
    if (!user) {
      toast.error("请先登录", {
        action: {
          label: "登录",
          onClick: () => router.push("/auth/login"),
        },
      });
      return false;
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!checkLogin()) return;

    if (!selectedVariant) {
      toast.error("请选择一个有效的款式");
      return;
    }

    if (!selectedVariant.inStock || selectedVariant.stockQuantity <= 0) {
      toast.error("当前选中的款式库存不足");
      return;
    }

    if (quantity <= 0 || quantity > selectedVariant.stockQuantity) {
      toast.error(`购买数量超出库存范围，请选择 1 到 ${selectedVariant.stockQuantity} 件`);
      setQuantity(Math.max(1, Math.min(quantity, selectedVariant.stockQuantity)));
      return;
    }

    addToCart(selectedVariant.id, quantity);
    toast.success(`${productDetail.name} 已加入购物车`, {
      description: `颜色：${selectedVariant.color}，尺寸：${selectedVariant.size}，数量：${quantity}`,
    });
  };

  const toggleWishlist = async () => {
    if (!checkLogin()) return;

    setIsWishlistLoading(true);
    try {
      // 修改URL和请求方法以匹配后端
      const url = isWishlisted
        ? `${API_URL}/api/wishlist/remove/${productDetail.id}`
        : `${API_URL}/api/wishlist/add/${productDetail.id}`;
      const method = isWishlisted ? "DELETE" : "POST";

      const requestOptions: RequestInit = {
        method,
        headers: {
          "Authorization": `Bearer ${token}`
        }
      };

      const response = await fetch(url, requestOptions);

      if (response.ok) {
        setIsWishlisted(!isWishlisted);
        if (!isWishlisted)
          toast.success(`${productDetail.name} 已加入愿望单`);
        else
          toast(`${productDetail.name} 已从愿望单移除`);
      } else {
        const errorText = await response.text(); // 获取错误信息
        throw new Error(errorText || "操作失败");
      }
    } catch (error) {
      toast.error((error as Error).message || (isWishlisted ? "移除商品失败" : "添加商品失败"));
      console.error("愿望单操作失败:", error);
    } finally {
      setIsWishlistLoading(false);
    }
  };

  if (!productDetail.variants || productDetail.variants.length === 0)
    return <div>商品信息不完整，无法显示详情。</div>;

  return (
    <div className="flex flex-col gap-8 lg:px-32 md:px-24">
      <div className="flex items-center gap-2">
        <Button onClick={() => router.back()} variant="outline" size="sm" className="flex items-center gap-1">
          <ChevronLeft className="h-4 w-4"/>
          返回
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <ProductGallery images={images || []}/>
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{productDetail.category}</Badge>
              {productDetail.overallInStock ? (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                >
                  有货
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                  缺货
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold">{productDetail.name}</h1>
            <div className="text-2xl font-semibold">
              {formatPrice(selectedVariant?.price ?? productDetail.minPrice)}
            </div>
            <p className="text-muted-foreground">{productDetail.description}</p>
          </div>
          <Separator/>
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 font-medium">颜色: {selectedColor}</h3>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((color, index) => (
                  <Button
                    key={index}
                    variant={selectedColor === color ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setSelectedColor(color)}
                  >
                    {color}
                  </Button>
                ))}
              </div>
            </div>
            {availableSizesForColor.length > 0 && (
              <div>
                <h3 className="mb-2 font-medium">尺寸: {selectedSize}</h3>
                <div className="flex flex-wrap gap-2">
                  {availableSizesForColor.map((size, index) => (
                    <Button
                      key={index}
                      variant={selectedSize === size ? "default" : "outline"}
                      onClick={() => setSelectedSize(size)}
                      disabled={!productDetail.variants.some(v => v.color === selectedColor && v.size === size && v.inStock)}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {selectedVariant && (
              <div>
                <h3 className="mb-2 font-medium">数量 (库存: {selectedVariant.stockQuantity})</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={quantity >= Math.min(10, selectedVariant.stockQuantity)}
                  >
                    +
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              size="lg"
              onClick={handleAddToCart}
              disabled={!selectedVariant || !selectedVariant.inStock || quantity <= 0 || quantity > selectedVariant.stockQuantity}
            >
              <ShoppingCart className="mr-2 h-5 w-5"/>
              加入购物车
            </Button>
            <Button
              variant="outline"
              size="lg"
              className={isWishlisted ? "text-red-500" : ""}
              onClick={toggleWishlist}
              disabled={isWishlistLoading}
            >
              {isWishlistLoading ? (
                <Loader2 className="h-5 w-5 animate-spin"/>
              ) : (
                <Heart className={`h-5 w-5 ${isWishlisted ? "fill-current" : ""}`}/>
              )}
              <span className="sr-only">添加到愿望单</span>
            </Button>
          </div>
          <Tabs defaultValue="specifications" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="specifications">规格</TabsTrigger>
              <TabsTrigger value="features">特性</TabsTrigger>
              <TabsTrigger value="shipping">配送</TabsTrigger>
            </TabsList>
            <TabsContent value="specifications" className="mt-4">
              <ProductSpecifications specifications={JSON.parse(productDetail.specifications)}/>
            </TabsContent>
            <TabsContent value="features" className="mt-4">
              <ul className="list-inside list-disc space-y-2">
                {JSON.parse(productDetail.features).map((feature: string, index: string) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </TabsContent>
            <TabsContent value="shipping" className="mt-4">
              <div className="space-y-4">
                <p>订单满 50 包邮，默认发顺丰</p>
                <p>偏远地区订单需联系客服协商运费</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}