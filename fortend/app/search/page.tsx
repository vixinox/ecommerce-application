import { Suspense } from "react";
import { SearchResults } from "@/components/search-results";
import SiteHeader from "@/components/site-header";
import { ShoppingCartProvider } from "@/components/shopping-cart-provider";
import SiteFooter from "@/components/site-footer";

interface SearchPageProps {
  searchParams: {
    q?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    status?: string;
    dateAddedStart?: string;
    dateAddedEnd?: string;
    page?: string;
    size?: string;
  };
}

export default function SearchPage({searchParams}: SearchPageProps) {
  const query = searchParams.q || "";
  const category = searchParams.category || "";
  const minPrice = searchParams.minPrice ? Number.parseFloat(searchParams.minPrice) : undefined;
  const maxPrice = searchParams.maxPrice ? Number.parseFloat(searchParams.maxPrice) : undefined;
  const sort = searchParams.sort || "relevance";
  const dateAddedStart = searchParams.dateAddedStart;
  const dateAddedEnd = searchParams.dateAddedEnd;
  const page = searchParams.page ? Number.parseInt(searchParams.page, 10) : 1;
  const size = searchParams.size ? Number.parseInt(searchParams.size, 10) : 12;

  return (
    <ShoppingCartProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader/>
        <main className="flex-1 w-full max-w-7xl mx-auto">
          <div className="container py-6 md:py-10">
            <h1 className="text-3xl font-bold tracking-tight mb-6">
              {query ? `搜索： "${query}"` : "所有商品"}
            </h1>
            <Suspense fallback={<div>正在加载搜索结果...</div>}>
              <SearchResults
                query={query}
                category={category}
                initialDateAddedStart={dateAddedStart}
                initialDateAddedEnd={dateAddedEnd}
                minPrice={minPrice}
                maxPrice={maxPrice}
                sort={sort}
                initialPage={page}
                initialSize={size}
              />
            </Suspense>
          </div>
        </main>
        <SiteFooter/>
      </div>
    </ShoppingCartProvider>
  );
}