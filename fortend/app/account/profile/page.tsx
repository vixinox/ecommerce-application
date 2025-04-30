import type { Metadata } from "next"

import { ProfileForm } from "@/components/profile-form"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "个人信息 | Modern E-commerce",
  description: "管理您的个人信息",
}

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">个人信息</h3>
        <p className="text-sm text-muted-foreground">
          管理您的个人信息，包括您的姓名、电子邮件地址、密码等
        </p>
      </div>
      <Separator/>
      <ProfileForm/>
    </div>
  )
}
