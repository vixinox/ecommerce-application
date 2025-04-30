import type { Metadata } from "next";
import { Separator } from "@/components/ui/separator";
import { ProductForm } from "@/components/product-form";

export const metadata: Metadata = {
  title: "编辑商品 | 商家面板",
  description: "编辑您的商品详情",
};

interface ProductEditPageProps {
  params: {
    id: string;
  };
}

export default async function ProductEditPage({params}: ProductEditPageProps) {
  const id = params.id;
  const isNewProduct = id === "new";
  const shouldPassParam = !isNewProduct && !isNaN(Number(params.id));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{isNewProduct ? "添加新商品" : "编辑商品"}</h3>
        <p className="text-sm text-muted-foreground">
          {isNewProduct
            ? "为您的店铺创建一个新商品。"
            : "更新您的商品信息、图片和库存。"}
        </p>
      </div>
      <Separator />
      {shouldPassParam ? (
        <ProductForm param={params.id}/>
      ) : (
        <ProductForm/>
      )}
    </div>
  );
}