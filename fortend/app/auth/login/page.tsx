import type { Metadata } from "next"
import Link from "next/link"

import { LoginForm } from "@/components/login-form"

export const metadata: Metadata = {
  title: "登录 | Modern E-commerce",
  description: "登录您的账号",
}

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">欢迎回来</h1>
        <p className="text-muted-foreground">请登录您的账号</p>
      </div>
      <LoginForm/>
      <div className="text-center text-sm">
        <p className="text-muted-foreground">
          还没有账号？{" "}
          <Link href="/auth/register" className="font-medium underline underline-offset-4 hover:text-primary">
            注册
          </Link>
        </p>
      </div>
    </div>
  )
}
