import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48"/>
      <Skeleton className="h-10 w-full"/>
      <div className="border rounded-md p-4">
        <Skeleton className="h-8 w-full mb-2"/>
        {[...Array(5)].map((_, i) => ( // 模拟几行数据
          <div key={i} className="flex justify-between items-center py-2 border-b last:border-b-0">
            <Skeleton className="h-6 w-1/4"/>
            <Skeleton className="h-6 w-1/4"/>
            <Skeleton className="h-6 w-1/4"/>
            <Skeleton className="h-6 w-1/6"/>
          </div>
        ))}
      </div>
    </div>
  )
}