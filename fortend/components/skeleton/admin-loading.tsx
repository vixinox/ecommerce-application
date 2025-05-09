import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6 mt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Skeleton className="h-10 w-48"/>
        <Skeleton className="h-10 w-full sm:w-[350px]"/>
      </div>

      <div className="border rounded-md p-4 space-y-2">
        <Skeleton className="h-8 w-1/3 mb-4"/>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center py-3 border-b last:border-b-0">
            <Skeleton className="h-5 flex-grow w-1/5 mr-2"/>
            <Skeleton className="h-5 flex-grow w-[10%] mr-2 hidden sm:block"/>
            <Skeleton className="h-5 flex-grow w-1/4 mr-2"/>
            <Skeleton className="h-5 flex-grow w-[15%] mr-2"/>
            <Skeleton className="h-5 flex-grow w-[10%] mr-2"/>
            <Skeleton className="h-5 flex-grow w-[15%] mr-2"/>
            <Skeleton className="h-5 flex-grow w-[10%]"/>
          </div>
        ))}
      </div>
      <div className="flex justify-center sm:justify-between items-center gap-4">
        <Skeleton className="h-8 w-48"/>
        <Skeleton className="h-8 w-24"/>
      </div>
    </div>
  );
}