import type {Metadata} from "next"
import {ShoppingCartProvider} from "@/components/shopping-cart-provider"
import SiteHeader from "@/components/site-header"
import {WishlistContent} from "@/components/wishlist-content"
import SiteFooter from "@/components/site-footer";

export const metadata: Metadata = {
    title: "我的愿望单 | 现代电商",
    description: "查看和管理您的愿望单",
}

export default function WishlistPage() {
    return (
        <ShoppingCartProvider>
            <div className="flex min-h-screen flex-col">
                <SiteHeader/>
                <main className="flex-1">
                    <div className="container py-6 md:py-10 mx-auto">
                        <WishlistContent/>
                    </div>
                </main>
                <SiteFooter/>
            </div>
        </ShoppingCartProvider>
    )
}
