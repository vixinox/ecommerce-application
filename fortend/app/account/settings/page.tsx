import type { Metadata } from "next"
import { Settings } from "lucide-react"

import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "设置 | Modern E-commerce",
  description: "管理您的帐户设置和偏好",
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">设置</h3>
        <p className="text-sm text-muted-foreground">管理您的帐户设置和偏好</p>
      </div>
      <Separator/>
      <div
        className="flex h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <Settings className="h-10 w-10 text-muted-foreground"/>
          <h3 className="mt-4 text-lg font-semibold">正在开发中</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            还没想好怎么做，先占个位置
          </p>
        </div>
      </div>
    </div>
  )
}
