"use client";

import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {LayoutDashboard, LogOut, Moon, Package, ShoppingBag, Sun, Users,} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useTheme} from "next-themes";
import {toast} from "sonner";
import {cn} from "@/lib/utils";
import {useAuth} from "@/components/auth-provider";
import {ReactNode, useEffect, useState} from "react";

interface NavItem {
    title: string;
    href: string;
    icon: React.ReactNode;
}

const navItems: NavItem[] = [
    {
        title: "仪表盘",
        href: "/admin/dashboard",
        icon: <LayoutDashboard className="h-5 w-5"/>,
    },
    {
        title: "用户管理",
        href: "/admin/users",
        icon: <Users className="h-5 w-5"/>,
    },
    {
        title: "商品管理",
        href: "/admin/products",
        icon: <ShoppingBag className="h-5 w-5"/>,
    },
    {
        title: "订单管理",
        href: "/admin/orders",
        icon: <Package className="h-5 w-5"/>,
    },
];

interface AdminLayoutProps {
    children: ReactNode;
}

export default function AdminLayout({children}: AdminLayoutProps) {
    const {user, isLoading, logout} = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const {theme, setTheme} = useTheme();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push(`/auth/login`);
        }
    }, [isLoading, user, router]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleLogout = async () => {
        try {
            logout();
            router.push("/auth/login");
        } catch (error) {
            console.error("退出登录失败", error);
            toast.error("退出登录失败");
        }
    };

    if (isLoading) {
        return (
            <div className="absolute flex min-h-screen w-screen flex-col items-center justify-center">
                <div className="text-center">
                    <h2 className="text-lg font-semibold">
                        加载中...
                    </h2>
                    <p className="text-sm ">
                        正在加载管理员面板
                    </p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen flex">
            <aside className="hidden lg:flex flex-col w-64 border-r">
                <div className="p-6">
                    <Link className="text-xl font-bold" href="/">电商管理系统</Link>
                </div>
                <nav className="flex-1 px-4 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center px-4 py-3 text-sm rounded-md transition-colors",
                                pathname === item.href
                                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                        >
                            {item.icon}
                            <span className="ml-3">{item.title}</span>
                        </Link>
                    ))}
                </nav>
                <div className="p-4 border-t">
                    <div className="flex items-center justify-between mb-4">
            <span className="text-sm">
              主题
            </span>
                        {isMounted && (
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                                aria-label={theme === "dark" ? "切换到亮色模式" : "切换到暗色模式"}
                            >
                                {theme === "dark" ? (
                                    <Sun className="h-5 w-5"/>
                                ) : (
                                    <Moon className="h-5 w-5"/>
                                )}
                            </Button>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        className="w-full flex items-center justify-center"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-4 w-4 mr-2"/>
                        退出登录
                    </Button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto">
                <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>
        </div>
    );
}