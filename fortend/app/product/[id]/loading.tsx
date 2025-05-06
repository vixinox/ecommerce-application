import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 mx-auto w-2/3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled>
          <Skeleton className="h-4 w-4 mr-1"/>
          <Skeleton className="h-4 w-12"/>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full rounded-lg"/>
          <div className="flex gap-2">
            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} className="h-16 w-16 rounded-md"/>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16 rounded-full"/>
            <Skeleton className="h-6 w-12 rounded-full"/>
          </div>

          <Skeleton className="h-9 w-3/4"/>

          <Skeleton className="h-8 w-32"/>

          <div className="space-y-2">
            <Skeleton className="h-4 w-full"/>
            <Skeleton className="h-4 w-5/6"/>
            <Skeleton className="h-4 w-2/3"/>
          </div>

          <Separator/>

          <div className="space-y-4">
            <div>
              <Skeleton className="h-5 w-24 mb-2"/>
              <div className="flex flex-wrap gap-2">
                {[...Array(4)].map((_, index) => (
                  <Skeleton key={index} className="h-10 w-20 rounded-full"/>
                ))}
              </div>
            </div>

            <div>
              <Skeleton className="h-5 w-24 mb-2"/>
              <div className="flex flex-wrap gap-2">
                {[...Array(3)].map((_, index) => (
                  <Skeleton key={index} className="h-10 w-16 rounded-md"/>
                ))}
              </div>
            </div>

            <div>
              <Skeleton className="h-5 w-32 mb-2"/>
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-md"/>
                <Skeleton className="h-6 w-8"/>
                <Skeleton className="h-10 w-10 rounded-md"/>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Skeleton className="h-12 flex-1 rounded-md"/>
            <Skeleton className="h-12 w-12 rounded-md"/>
          </div>

          <Tabs defaultValue="specifications" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="specifications" disabled>
                <Skeleton className="h-4 w-16"/>
              </TabsTrigger>
              <TabsTrigger value="features" disabled>
                <Skeleton className="h-4 w-16"/>
              </TabsTrigger>
              <TabsTrigger value="shipping" disabled>
                <Skeleton className="h-4 w-16"/>
              </TabsTrigger>
            </TabsList>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-full"/>
              <Skeleton className="h-4 w-5/6"/>
              <Skeleton className="h-4 w-2/3"/>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}