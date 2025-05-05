"use client";

import React, {useEffect} from "react";
import {NavItem} from "@/components/nav-item";
import {useRouter} from "next/navigation";
import {ChartNoAxesCombined, FileText, Package, Settings, UserIcon, Warehouse} from "lucide-react";
import {useAuth} from "@/components/auth-provider";
import SiteHeader from "@/components/site-header";
import {ShoppingCartProvider} from "@/components/shopping-cart-provider";


interface AccountLayoutProps {
  children: React.ReactNode;
}

export default function AccountLayout({children}: AccountLayoutProps) {
  const {user, isLoading} = useAuth();
  const router = useRouter();

  useEffect(() => {
      if (!isLoading && !user)
          router.push(`/auth/login`);
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="absolute flex min-h-screen w-screen flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">加载中...</h2>
          <p className="text-sm text-muted-foreground">正在加载您的账户信息</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col">
        <ShoppingCartProvider>
            <SiteHeader/>
        </ShoppingCartProvider>
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 md:py-10 mx-auto">
        <aside className="fixed top-14 z-30 -ml-2 hidden w-full shrink-0 overflow-y-auto border-r md:sticky md:block">
          <div className="py-6 pr-6 lg:py-8">
            <h2 className="mb-4 text-lg font-semibold">用户中心</h2>
            <nav className="flex flex-col space-y-1">
              <NavItem href="/account/profile" icon={<UserIcon className="mr-2 h-4 w-4"/>}>
                个人信息
              </NavItem>
              <NavItem href="/account/orders" icon={<Package className="mr-2 h-4 w-4"/>}>
                订单
              </NavItem>
              <NavItem href="/account/spending" icon={<FileText className="mr-2 h-4 w-4"/>}>
                消费报告
              </NavItem>
              <NavItem href="/account/settings" icon={<Settings className="mr-2 h-4 w-4"/>}>
                设置
              </NavItem>
                {user && user.role === "MERCHANT" && (
                    <>
                        <NavItem href="/account/merchant/dashboard"
                                 icon={<ChartNoAxesCombined className="mr-2 h-4 w-4"/>}>
                            经营面板
                        </NavItem>
                        <NavItem href="/account/merchant/products" icon={<Warehouse className="mr-2 h-4 w-4"/>}>
                            商品管理
                        </NavItem>
                    </>
                )}
            </nav>
          </div>
        </aside>
        <main className="flex w-full flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}