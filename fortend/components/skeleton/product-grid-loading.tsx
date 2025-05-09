export function ProductGridLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 rounded-full bg-gray-200 dark:bg-gray-900 animate-pulse"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(12)].map((_, i) => (
          <div className="group relative h-full flex flex-col overflow-hidden rounded-md border bg-card text-card-foreground shadow-sm" key={i}>
            <div className="relative block aspect-[3/4] overflow-hidden rounded-t-md bg-gray-200 dark:bg-gray-900">
              <div className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-gray-300/80 dark:bg-gray-600/80 backdrop-blur-sm"/>
              <div className="absolute bottom-0 left-0 right-0 z-10 h-10 bg-gray-300/50 dark:bg-gray-600/50 translate-y-full group-hover:translate-y-0 transition-transform duration-200"/>
            </div>
            <div className="flex-grow space-y-1 p-4">
              <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-900"/>
              <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-900"/>
            </div>

            <div className="flex items-center justify-between p-4 pt-0">
              <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-900"/>
              <div className="h-8 w-24 rounded-full bg-gray-200 dark:bg-gray-900"/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}