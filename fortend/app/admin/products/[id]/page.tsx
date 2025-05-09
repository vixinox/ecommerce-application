import type { Metadata } from "next";
import { Separator } from "@/components/ui/separator";
import { ProductView } from "@/components/products/product-view";

export const metadata: Metadata = {
  title: "商品详情 | 管理员面板",
  description: "查看商品详情",
};

export default function ProductEditPageAdmin({params}: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">查看商品详情</h3>
        <p className="text-sm text-muted-foreground">
          查看并审核商品信息
        </p>
      </div>
      <Separator/>
      <ProductView param={params.id}/>
    </div>
  );
}