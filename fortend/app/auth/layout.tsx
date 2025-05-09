import { ReactNode } from "react"
import Link from "next/link"
import { ShoppingBag } from "lucide-react"
import SiteFooter from "@/components/site-footer";

export default function AuthLayout({children}: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background/95 backdrop-blur flex justify-between ml-12">
        <div className="container flex h-16 items-center">
          <Link href="/" className="flex items-center space-x-2">
            <ShoppingBag className="h-6 w-6"/>
            <span className="text-xl font-bold">STORE</span>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md space-y-8 px-4">{children}</div>
      </main>
      <SiteFooter/>
    </div>
  )
}
