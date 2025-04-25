import type { Metadata } from "next";
import { Separator } from "@/components/ui/separator";
import SpendingReportDashboard from "@/components/spending-report-dashboard";

export const metadata: Metadata = {
  title: "消费报告 | Modern E-commerce",
  description: "查看您的消费报告",
};

export default function SpendingReportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">消费报告</h3>
        <p className="text-sm text-muted-foreground">查看您的消费报告</p>
      </div>
      <Separator />

      <SpendingReportDashboard />

    </div>
  );
}