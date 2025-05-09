"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from 'next-themes'
import { CheckIcon, Heart, LogOut, Receipt, Search, ShoppingBag, SunMoon, User, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useShoppingCart } from "@/providers/shopping-cart-provider"
import ShoppingCart from "@/components/products/shopping-cart"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/providers/auth-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { API_URL, changeRoleForTest } from "@/lib/api";
import NavLinks from "@/components/nav-links";
import PendingPayment from "@/components/orders/pending-orderlist";
import { usePendingPayment } from "@/hooks/usePendingPayment";
import { toast } from "sonner";

export default function SiteHeader() {
  const router = useRouter()
  const {user, logout} = useAuth()
  const {setTheme, theme} = useTheme()
  const [searchQuery, setSearchQuery] = useState("")
  const { pendingOrders } = usePendingPayment();

  const {cartItems} = useShoppingCart()
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0)

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
  }

  const changeRole = async (role: string) => {
    try {
      await changeRoleForTest(user!.username, role);
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur transition-all flex justify-center items-center">
      <div className="container flex h-16 items-center">
        <NavLinks/>
        <form onSubmit={handleSearch} className="relative w-full max-w-sm mr-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input
            type="search"
            placeholder="搜索产品..."
            className="w-full pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`${API_URL}/api/image${user?.avatar}`} alt={user?.username || "?"}
                                   className="object-cover"/>
                      <AvatarFallback> {user.nickname?.[0] || user.username?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user.nickname || user.username}</DropdownMenuLabel>
                  <DropdownMenuSeparator/>
                  <DropdownMenuItem asChild>
                    <Link href="/account/profile">个人资料</Link>
                  </DropdownMenuItem>
                  {user.role === "ADMIN" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/dashboard">管理员面板</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator/>
                  <DropdownMenuItem onClick={() => {
                    logout();
                    router.push("/auth/login");
                  }}>
                    <LogOut className="mr-2 h-4 w-4"/>
                    <span>退出登录</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 rounded-full">
                    <UserCog className="pointer-events-none"/>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>修改角色(测试用)</DropdownMenuLabel>
                  <DropdownMenuSeparator/>
                  <DropdownMenuItem asChild>
                    <div onClick={() => changeRole("USER")}>普通用户 {user.role === "USER" && <CheckIcon className="h-4 w-4"/>}</div>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <div onClick={() => changeRole("MERCHANT")}>商家 {user.role === "MERCHANT" && <CheckIcon className="h-4 w-4"/>}</div>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <div onClick={() => changeRole("ADMIN")}>管理员 {user.role === "ADMIN" && <CheckIcon className="h-4 w-4"/>}</div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/login">
                <User className="mr-2 h-4 w-4"/>
                登录
              </Link>
            </Button>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label="待付款订单">
                <Receipt className="h-5 w-5"/>
                {pendingOrders && pendingOrders.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {pendingOrders.length}
                  </Badge>
                )}
                <span className="sr-only">待付款订单</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md">
              <SheetTitle/>
              <PendingPayment/>
            </SheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label="打开购物车">
                <ShoppingBag className="h-5 w-5"/>
                {itemCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {itemCount}
                  </Badge>
                )}
                <span className="sr-only">打开购物车</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md">
              <SheetTitle/>
              <ShoppingCart/>
            </SheetContent>
          </Sheet>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8"
            aria-label="愿望单"
            onClick={() => router.push("/wishlist")}
          >
            <Heart className="h-5 w-5"/>
            <span className="sr-only">愿望单</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8"
            aria-label="切换主题模式"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            <SunMoon className="h-5 w-5"/>
            <span className="sr-only">切换主题模式</span>
          </Button>
        </div>
      </div>
    </header>
  )
}