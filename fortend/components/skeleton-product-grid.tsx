import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonProductGrid() {
  const numberOfSkeletons = 8;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({length: numberOfSkeletons}).map((_, index) => (
        <div className="flex flex-col space-y-3 border rounded-lg p-4" key={index}>
          <Skeleton className="h-[180px] w-full rounded-xl"/>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[200px]"/>
            <Skeleton className="h-4 w-[150px]"/>
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-[80px]"/>
            <Skeleton className="h-8 w-[100px] rounded-full"/>
          </div>
        </div>
      ))}
    </div>
  );
}