import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfileLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-10 w-1/4"/>
        <Skeleton className="h-6 w-1/2"/>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        {[...Array(4)].map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20"/>
              <Skeleton className="h-4 w-4"/>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24"/>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" disabled>
              <Skeleton className="h-5 w-16"/>
            </TabsTrigger>
            <TabsTrigger value="analytics" disabled>
              <Skeleton className="h-5 w-16"/>
            </TabsTrigger>
            <TabsTrigger value="reports" disabled>
              <Skeleton className="h-5 w-16"/>
            </TabsTrigger>
          </TabsList>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/4 mb-2"/>
                <Skeleton className="h-4 w-1/3"/>
              </CardHeader>
              <CardContent className="h-80 flex items-center justify-center">
                <Skeleton className="h-full w-full"/>
              </CardContent>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-1/3 mb-2"/>
                  <Skeleton className="h-4 w-1/2"/>
                </CardHeader>
                <CardContent className="h-80 flex items-center justify-center">
                  <Skeleton className="h-full w-full"/>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-1/3 mb-2"/>
                  <Skeleton className="h-4 w-1/2"/>
                </CardHeader>
                <CardContent className="h-80 flex items-center justify-center">
                  <Skeleton className="h-full w-full"/>
                </CardContent>
              </Card>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}