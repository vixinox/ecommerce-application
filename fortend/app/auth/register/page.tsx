import type { Metadata } from "next"
import Link from "next/link"

import { RegisterForm } from "@/components/register-form"

export const metadata: Metadata = {
  title: "Register | Modern E-commerce",
  description: "Create a new account",
}

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">注册</h1>
        <p className="text-muted-foreground">输入你的邮箱地址和密码</p>
      </div>
      <RegisterForm/>
      <div className="text-center text-sm">
        <p className="text-muted-foreground">
          已有账户？{" "}
          <Link href="/auth/login" className="font-medium underline underline-offset-4 hover:text-primary">
            登录
          </Link>
        </p>
      </div>
    </div>
  )
}
