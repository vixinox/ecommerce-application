"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarIcon, Loader2, SlidersHorizontal } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductCard } from "@/components/product-card";
import { cn, formatPrice } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { API_URL } from "@/lib/api";
import { Product } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isValid, parseISO } from "date-fns";

interface PageInfo<T> {
  pageNum: number;
  pageSize: number;
  total: number;
  pages: number;
  list: T[];
}

interface SearchResultsProps {
  query: string;
  initialCategory?: string;
  initialStatus?: string;
  initialDateAddedStart?: string;
  initialDateAddedEnd?: string;
  initialMinPrice?: number;
  initialMaxPrice?: number;
  initialSort: string;
  initialPage: number;
  initialSize: number;
}

const DEFAULT_SLIDER_MAX_PRICE = 100000;
const MAX_PRICE_INPUT_STEP = 1;
const CATEGORIES = ["全部", "电子产品", "服装", "图书", "家居", "户外"];
const STATUSES = ["全部", "ACTIVE", "INACTIVE", "DRAFT"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {opacity: 1, y: 0},
  exit: {opacity: 0, y: 20, transition: {duration: 0.2}},
};

export function SearchResults({
                                query,
                                initialCategory,
                                initialStatus,
                                initialDateAddedStart,
                                initialDateAddedEnd,
                                initialMinPrice,
                                initialMaxPrice,
                                initialSort,
                                initialPage,
                                initialSize,
                              }: SearchResultsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [appliedCategory, setAppliedCategory] = useState(initialCategory || "全部");
  const [appliedStatus, setAppliedStatus] = useState(initialStatus || "全部");
  const [appliedDateAddedStart, setAppliedDateAddedStart] = useState(initialDateAddedStart || '');
  const [appliedDateAddedEnd, setAppliedDateAddedEnd] = useState(initialDateAddedEnd || '');
  const [appliedPriceRange, setAppliedPriceRange] = useState<[number, number]>([
    initialMinPrice ?? 0,
    initialMaxPrice ?? DEFAULT_SLIDER_MAX_PRICE,
  ]);
  const [appliedSort, setAppliedSort] = useState(initialSort);
  const [appliedPage, setAppliedPage] = useState(initialPage);
  const [appliedSize, setAppliedSize] = useState(initialSize);

  const [sliderPriceRange, setSliderPriceRange] = useState<[number, number]>(appliedPriceRange);
  const initialSliderMax = Math.max(DEFAULT_SLIDER_MAX_PRICE, initialMaxPrice ?? 0);
  const [sliderDisplayMaxPrice, setSliderDisplayMaxPrice] = useState(initialSliderMax);
  const [inputMaxPrice, setInputMaxPrice] = useState(String(initialSliderMax));
  const [inputMaxPriceError, setInputMaxPriceError] = useState<string | null>(null);

  const setOrDelete = useCallback((params: URLSearchParams, key: string, value: string | number | null | undefined, defaultValue?: string | number | string[]) => {
    const stringValue = String(value);
    const isDefault = Array.isArray(defaultValue) ? defaultValue.some(def => String(def) === stringValue) : String(defaultValue) === stringValue;

    if (value !== undefined && value !== null && stringValue !== '') {
      if (!isDefault) {
        params.set(key, stringValue);
      } else {
        params.delete(key);
      }
    } else {
      params.delete(key);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();

        setOrDelete(params, "name", query, "");

        if (appliedCategory !== "全部") {
          setOrDelete(params, "categoryName", appliedCategory);
        }

        if (appliedStatus !== "全部") {
          setOrDelete(params, "status", appliedStatus);
        }

        setOrDelete(params, "dateAddedStart", appliedDateAddedStart, "");
        setOrDelete(params, "dateAddedEnd", appliedDateAddedEnd, "");

        setOrDelete(params, "minPrice", appliedPriceRange[0], 0);
        setOrDelete(params, "maxPrice", appliedPriceRange[1], DEFAULT_SLIDER_MAX_PRICE);

        setOrDelete(params, "sort", appliedSort, "relevance");

        setOrDelete(params, "pageNum", appliedPage, 1);
        setOrDelete(params, "pageSize", appliedSize, initialSize);

        const url = `${API_URL}/api/products/search?${params.toString()}`;
        const response = await fetch(url, {signal});

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({message: '未知错误或无法解析的响应'}));
          throw new Error(`API Error: ${response.status} ${response.statusText}${errorData.message ? ' - ' + errorData.message : ''}`);
        }

        const data: PageInfo<Product> = await response.json();
        setProducts(data.list);
        setTotalItems(data.total);

      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log("Fetch aborted");
        } else {
          console.error("Error fetching products:", err);
          setError(`Failed to load products: ${err.message}`);
          setProducts([]);
          setTotalItems(0);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [query, appliedCategory, appliedStatus, appliedDateAddedStart, appliedDateAddedEnd, appliedPriceRange, appliedSort, appliedPage, appliedSize, setOrDelete, initialSize]);

  useEffect(() => {
    const params = new URLSearchParams();
    setOrDelete(params, "q", query, "");
    setOrDelete(params, "category", appliedCategory, "全部");
    setOrDelete(params, "status", appliedStatus, "全部");
    setOrDelete(params, "dateAddedStart", appliedDateAddedStart, "");
    setOrDelete(params, "dateAddedEnd", appliedDateAddedEnd, "");
    setOrDelete(params, "minPrice", appliedPriceRange[0], 0);
    setOrDelete(params, "maxPrice", appliedPriceRange[1], DEFAULT_SLIDER_MAX_PRICE);
    setOrDelete(params, "sort", appliedSort, "relevance");
    setOrDelete(params, "page", appliedPage, 1);
    setOrDelete(params, "size", appliedSize, initialSize);

    const currentParamsString = searchParams.toString();
    const nextParamsString = params.toString();

    if (currentParamsString !== nextParamsString) {
      router.replace(`/search?${params.toString()}`, {scroll: false});
    }

  }, [query, appliedCategory, appliedStatus, appliedDateAddedStart, appliedDateAddedEnd, appliedPriceRange, appliedSort, appliedPage, appliedSize, router, searchParams, setOrDelete, initialSize]);

  const dateStringToDate = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    const date = parseISO(dateString);
    return isValid(date) ? date : undefined;
  };

  const handleCategoryChange = useCallback((cat: string) => {
    setAppliedCategory(cat);
    setAppliedPage(1);
  }, [setAppliedCategory, setAppliedPage]);

  const handleStatusChange = useCallback((status: string) => {
    setAppliedStatus(status);
    setAppliedPage(1);
  }, [setAppliedStatus, setAppliedPage]);

  const handleDateAddedStartChange = useCallback((date: Date | undefined) => {
    setAppliedDateAddedStart(date ? format(date, "yyyy-MM-dd") : '');
    setAppliedPage(1);
  }, [setAppliedDateAddedStart, setAppliedPage]);

  const handleDateAddedEndChange = useCallback((date: Date | undefined) => {
    setAppliedDateAddedEnd(date ? format(date, "yyyy-MM-dd") : '');
    setAppliedPage(1);
  }, [setAppliedDateAddedEnd, setAppliedPage]);

  const handleSliderValueChange = useCallback((value: number[]) => {
    if (value && value.length === 2) {
      setSliderPriceRange(value as [number, number]);
    }
  }, [setSliderPriceRange]);

  const handleConfirmPriceFilter = useCallback(() => {
    setAppliedPriceRange(sliderPriceRange);
    setAppliedPage(1);
  }, [sliderPriceRange, setAppliedPriceRange, setAppliedPage]);

  const handleSortChange = useCallback((val: string) => {
    setAppliedSort(val);
    setAppliedPage(1);
  }, [setAppliedSort, setAppliedPage]);

  const handlePageChange = useCallback((page: number) => {
    const totalPages = Math.ceil(totalItems / appliedSize);
    if (page >= 1 && page <= totalPages) {
      setAppliedPage(page);
      window.scrollTo({top: 0, behavior: 'smooth'});
    }
  }, [totalItems, appliedSize, setAppliedPage]);

  const handleInputMaxPriceChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setInputMaxPrice(event.target.value);
  }, [setInputMaxPrice]);

  const handleApplyMaxPrice = useCallback(() => {
    const value = parseFloat(inputMaxPrice);
    if (isNaN(value) || value < 0) {
      setInputMaxPriceError("请输入有效的非负数字");
      return;
    }
    if (value <= 0) {
      setInputMaxPriceError("最高价需大于 0");
      return;
    }
    setInputMaxPriceError(null);

    setSliderDisplayMaxPrice(value);
    setSliderPriceRange(prevRange => {
      const [min,] = prevRange;
      let newMax = Math.min(prevRange[1], value);
      let newMin = Math.min(min, newMax);
      if (newMin > newMax) newMin = newMax;
      return [newMin, newMax] as [number, number];
    });

    setAppliedPriceRange(prevAppliedRange => {
      const [appliedMin,] = prevAppliedRange;
      const newAppliedMax = Math.min(prevAppliedRange[1], value);
      let newAppliedMin = Math.min(appliedMin, newAppliedMax);
      if (newAppliedMin > newAppliedMax) newAppliedMin = newAppliedMax;

      if (newAppliedMax !== prevAppliedRange[1] || newAppliedMin !== prevAppliedRange[0]) {
        setAppliedPage(1);
        return [newAppliedMin, newAppliedMax] as [number, number];
      }
      return prevAppliedRange;
    });

  }, [inputMaxPrice, setSliderDisplayMaxPrice, setSliderPriceRange, setAppliedPriceRange, setAppliedPage]);

  const totalPages = Math.ceil(totalItems / appliedSize);

  useEffect(() => {
    setSliderPriceRange(appliedPriceRange);
  }, [appliedPriceRange]);

  useEffect(() => {
    setInputMaxPrice(String(sliderDisplayMaxPrice));
  }, [sliderDisplayMaxPrice]);

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <motion.div
        className="hidden md:block w-64 shrink-0 space-y-6"
        initial={{opacity: 0, x: -20}}
        animate={{opacity: 1, x: 0}}
        transition={{delay: 0.1}}
      >
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4"/>
            筛选
          </h3>
          <Separator className="mb-4"/>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-3">分类</h4>
              <div className="flex flex-col gap-2">
                {CATEGORIES.map((cat) => (
                  <Badge
                    key={cat}
                    variant={appliedCategory === cat ? "default" : "outline"}
                    className="cursor-pointer justify-start"
                    onClick={() => handleCategoryChange(cat)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">状态</h4>
              <Select value={appliedStatus} onValueChange={handleStatusChange} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="选择状态"/>
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>{status === "全部" ? "全部状态" : status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <h4 className="font-medium mb-3">添加日期</h4>
              <div className="space-y-2">
                <Label htmlFor="date-added-start-trigger" className="text-sm font-medium">开始日期</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-added-start-trigger"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal px-3 relative",
                        !appliedDateAddedStart && "text-muted-foreground"
                      )}
                      disabled={isLoading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4"/>
                      {appliedDateAddedStart ? format(parseISO(appliedDateAddedStart), "yyyy-MM-dd") :
                        <span>选择开始日期</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateStringToDate(appliedDateAddedStart)}
                      onSelect={handleDateAddedStartChange}
                      initialFocus
                      disabled={isLoading}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2 mt-2">
                <Label htmlFor="date-added-end-trigger" className="text-sm font-medium">结束日期</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-added-end-trigger"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal px-3 relative",
                        !appliedDateAddedEnd && "text-muted-foreground"
                      )}
                      disabled={isLoading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4"/>
                      {appliedDateAddedEnd ? format(parseISO(appliedDateAddedEnd), "yyyy-MM-dd") :
                        <span>选择结束日期</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateStringToDate(appliedDateAddedEnd)}
                      onSelect={handleDateAddedEndChange}
                      initialFocus
                      disabled={isLoading}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">价格范围</h4>
              <Slider
                value={sliderPriceRange}
                min={0}
                max={sliderDisplayMaxPrice}
                step={1}
                onValueChange={handleSliderValueChange}
                className="mb-2"
                disabled={isLoading}
              />
              <div className="flex justify-between text-sm mb-3">
                <span>{formatPrice(sliderPriceRange[0])}</span>
                <span>{formatPrice(sliderPriceRange[1])}</span>
              </div>
              <Button
                onClick={handleConfirmPriceFilter}
                className="w-full mb-4"
                disabled={isLoading}
              >
                确认价格范围
              </Button>
              <div className="space-y-2">
                <Label htmlFor="max-price-input" className="text-sm font-medium">最高价格限制</Label>
                <div className="flex gap-2">
                  <Input
                    id="max-price-input"
                    type="number"
                    value={inputMaxPrice}
                    onChange={handleInputMaxPriceChange}
                    className="flex-1"
                    step={MAX_PRICE_INPUT_STEP}
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyMaxPrice();
                      }
                    }}
                  />
                  <Button
                    onClick={handleApplyMaxPrice}
                    disabled={isLoading || inputMaxPriceError !== null || inputMaxPrice.trim() === '' || parseFloat(inputMaxPrice || '0') <= 0}
                  >
                    应用
                  </Button>
                </div>
                {inputMaxPriceError && (
                  <p className="text-xs text-destructive">{inputMaxPriceError}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      <div className="flex-1">
        <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
          {isLoading && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
              加载中...
            </div>
          )}
          {!isLoading && !error && (
            <p className="text-sm text-muted-foreground">
              找到 {totalItems} 个商品
            </p>
          )}
          <div className="hidden md:block">
            <Select value={appliedSort} onValueChange={handleSortChange} disabled={isLoading}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="排序方式"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">相关性</SelectItem>
                <SelectItem value="price-asc">价格：低到高</SelectItem>
                <SelectItem value="price-desc">价格：高到低</SelectItem>
                <SelectItem value="name-asc">名称：A 到 Z</SelectItem>
                <SelectItem value="name-desc">名称：Z 到 A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="loading-message" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
                        className="flex items-center justify-center py-12 text-lg">
              <Loader2 className="mr-2 h-6 w-6 animate-spin"/>
              加载中...
            </motion.div>
          ) : error ? (
            <motion.div key="error-message" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
                        className="flex flex-col items-center justify-center py-12 text-destructive">
              <p className="text-lg font-medium">加载失败</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </motion.div>
          ) : products.length === 0 ? (
            <motion.div
              key="no-products-message"
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: 20}}
              className="flex flex-col items-center justify-center py-12"
            >
              <p className="text-lg font-medium">未找到商品</p>
              <p className="text-sm text-muted-foreground mt-1">请尝试调整搜索或筛选条件</p>
            </motion.div>
          ) : (
            <>
              <motion.div
                key="product-grid"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence>
                  {products.map((product) => (
                    <motion.div
                      key={product.id}
                      variants={itemVariants}
                      exit="exit"
                      layout
                    >
                      <ProductCard product={product}/>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(appliedPage - 1)}
                          isActive={appliedPage > 1}
                        />
                      </PaginationItem>
                      {appliedPage > 3 && (
                        <PaginationItem>
                          <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
                        </PaginationItem>
                      )}
                      {appliedPage > 4 && (
                        <PaginationItem><span className="px-2">...</span></PaginationItem>
                      )}
                      {Array.from({length: totalPages}, (_, i) => i + 1).filter(page => page >= Math.max(1, appliedPage - 2) && page <= Math.min(totalPages, appliedPage + 2)).map(page => (
                        <PaginationItem key={page}>
                          <PaginationLink onClick={() => handlePageChange(page)} isActive={appliedPage === page}>
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      {appliedPage < totalPages - 3 && (
                        <PaginationItem><span className="px-2">...</span></PaginationItem>
                      )}
                      {appliedPage < totalPages - 2 && (
                        <PaginationItem>
                          <PaginationLink onClick={() => handlePageChange(totalPages)}>{totalPages}</PaginationLink>
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(appliedPage + 1)}
                          isActive={appliedPage < totalPages}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}