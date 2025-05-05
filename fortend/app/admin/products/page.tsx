"use client"
import {useEffect, useState} from "react"
import {motion} from "framer-motion"
import {toast} from "sonner"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table"
import {Skeleton} from "@/components/ui/skeleton"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Badge} from "@/components/ui/badge"
import {Eye, RefreshCw, Tag} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {ScrollArea} from "@/components/ui/scroll-area"
import Image from "next/image"
import {API_URL, getProductDetail, getProductsAdmin, updateProductStatus} from "@/lib/api";
import {useAuth} from "@/components/auth-provider";
import {useRouter} from "next/navigation"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface UserDetail {
    id: number;
    username: string;
    email: string;
    avatar?: string;
    role?: string;
    status?: string;
    nickname?: string;
}

interface VariantDetail {
    id: number;
    color: string;
    size: string;
    price: number;
    stockQuantity: number;
}

interface ProductDetail {
    id: number;
    name: string;
    category: string;
    description: string;
    featuresJson: string;
    specificationsJson: string;
    variants: VariantDetail[];
    colorImageUrls: { [key: string]: string };
    status: string;
    ownerInfo: UserDetail;
}

interface Product {
    id: number
    ownerId: number
    name: string
    description: string
    category: string
    defaultImage: string
    minPrice: number
    status: string
    totalStock: number
    ownerUsername: string
}

interface ProductsResponse {
    list: Product[]
    total: number
    pages: number
    pageNum: number
    pageSize: number
}

interface SpecificationItem {
    key: string;
    value: string;
}

const container = {
    hidden: {opacity: 0},
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
}

const item = {
    hidden: {opacity: 0, y: 20},
    show: {opacity: 1, y: 0},
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [productDetails, setProductDetails] = useState<ProductDetail | null>(null)

    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
    const [isLoadingDetails, setIsLoadingDetails] = useState(false)

    const {token, isLoading} = useAuth()
    const [isFetching, setIsFetching] = useState(false)
    const router = useRouter()

    const fetchProducts = async () => {
        try {
            if (!token) return;
            setIsFetching(true);
            const data: ProductsResponse = await getProductsAdmin(token, currentPage, 10, statusFilter);
            setProducts(data.list);
            setTotalPages(data.pages);
            console.log(data.list)
        } catch (error: any) {
            toast.error("获取商品列表失败", {description: error.message});
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {

        if (!isLoading && token) {
            fetchProducts();
        } else if (!isLoading && !token) {

        }
    }, [currentPage, statusFilter, token, isLoading]);


    const fetchProductDetails = async (productId: number) => {
        setIsLoadingDetails(true);
        setProductDetails(null);
        try {
            if (!token) {
                toast.error("请先登录");
                router.push("/auth/login");
                return;
            }

            const data: ProductDetail = await getProductDetail(productId, token);
            setProductDetails(data);
        } catch (error: any) {
            toast.error("获取商品详情失败", {description: error.message});
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleStatusChange = async (productId: number, status: string) => {
        try {
            if (!token) {
                toast.error("请先登录");
                router.push("/auth/login");
                return;
            }
            await updateProductStatus(productId, status, token);
            toast.success("商品状态已更新");
            await fetchProducts();
        } catch (error: any) {
            toast.error("更新商品状态失败", {description: error.message});
        }
    };

    const getStatusBadge = (status: string) => {

        switch (status) {
            case "PENDING":
                return (
                    <Badge
                        className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white">
                        待审核
                    </Badge>
                );
            case "ACTIVE":
                return (
                    <Badge
                        className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white">
                        已上架
                    </Badge>
                );
            case "INACTIVE":
                return (
                    <Badge className="bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white">
                        已下架
                    </Badge>
                );
            case "REJECTED":
                return (
                    <Badge className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white">
                        未通过
                    </Badge>
                );
            case "DELETED":
                return (
                    <Badge
                        className="bg-stone-500 hover:bg-stone-600 dark:bg-stone-600 dark:hover:bg-stone-700 text-white">
                        已删除
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{status || "未知状态"}</Badge>;
        }
    }

    const formatCurrency = (amount: number | undefined) => {
        if (amount === undefined || amount === null) return "N/A";
        return new Intl.NumberFormat("zh-CN", {
            style: "currency",
            currency: "CNY",
        }).format(amount);
    };


    const calculateMinPrice = (variants: VariantDetail[] | undefined): number | undefined => {
        if (!variants || variants.length === 0) {
            return undefined;
        }
        return Math.min(...variants.map(v => v.price));
    };


    const calculateTotalStock = (variants: VariantDetail[] | undefined): number | undefined => {
        if (!variants || variants.length === 0) {
            return undefined;
        }
        return variants.reduce((sum, v) => sum + v.stockQuantity, 0);
    };


    const getImageUrl = (colorImageUrls: { [key: string]: string } | undefined): string | undefined => {
        if (!colorImageUrls) {
            return undefined;
        }

        const urls = Object.values(colorImageUrls);
        return urls.length > 0 ? urls[0] : undefined;
    };

    return (
        <motion.div initial="hidden" animate="show" variants={container} className="space-y-6 mt-6">
            <motion.div variants={item} className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">商品管理</h1>
                    <p className="text-muted-foreground">查看和管理所有商品</p>
                </div>
                <Select value={statusFilter || ""}
                        onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="所有状态"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">所有状态</SelectItem>
                        <SelectItem value="ACTIVE">上架中</SelectItem>
                        <SelectItem value="INACTIVE">已下架</SelectItem>
                        <SelectItem value="DELETED">已删除</SelectItem>
                        <SelectItem value="PENDING">待审核</SelectItem>
                        <SelectItem value="REJECTED">拒绝上架</SelectItem>
                    </SelectContent>
                </Select>
            </motion.div>

            <motion.div variants={item}>
                <Card>
                    <CardHeader>
                        <CardTitle>商品列表</CardTitle>
                        <CardDescription>平台上的所有商品</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isFetching ? (
                            <div className="space-y-2">
                                {Array.from({length: 5}).map((_, i) => (
                                    <Skeleton key={i} className="h-12 w-full"/>
                                ))}
                            </div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>商品图片</TableHead>
                                            <TableHead>商品ID</TableHead>
                                            <TableHead>商品名称</TableHead>
                                            <TableHead>分类</TableHead>
                                            <TableHead>价格</TableHead>
                                            <TableHead>库存</TableHead>
                                            <TableHead>状态</TableHead>
                                            <TableHead>商家ID</TableHead>
                                            <TableHead className="text-right">操作</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {products.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8}
                                                           className="text-center py-8 text-muted-foreground">
                                                    没有找到商品
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            products.map((product) => (
                                                <TableRow key={product.id}>
                                                    <TableCell>
                                                        <div className="relative w-10 h-10 overflow-hidden rounded-md">
                                                            <Image
                                                                src={product.defaultImage ? `${API_URL}/api/image${product.defaultImage}` : "/placeholder.svg"}
                                                                alt={product.name}
                                                                fill
                                                                className="object-cover"
                                                                onError={(e) => {
                                                                    e.currentTarget.src = "/placeholder.svg"
                                                                }}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-medium">{product.id}</TableCell>
                                                    <TableCell className="font-medium">{product.name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            <Tag className="h-3 w-3 mr-1"/>
                                                            {product.category}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{formatCurrency(product.minPrice)}</TableCell>
                                                    <TableCell>{product.totalStock}</TableCell>
                                                    <TableCell>{getStatusBadge(product.status)}</TableCell>
                                                    <TableCell>{product.ownerId}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Dialog
                                                                open={isDetailsDialogOpen && selectedProduct?.id === product.id}
                                                                onOpenChange={(open) => {
                                                                    setIsDetailsDialogOpen(open)
                                                                    if (!open) {
                                                                        setProductDetails(null)
                                                                        setSelectedProduct(null)
                                                                    }
                                                                }}
                                                            >
                                                                <DialogTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        onClick={() => {
                                                                            setSelectedProduct(product)
                                                                            fetchProductDetails(product.id)
                                                                        }}
                                                                    >
                                                                        <Eye className="h-4 w-4"/>
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="max-w-3xl">
                                                                    <DialogHeader>
                                                                        <DialogTitle>商品详情</DialogTitle>
                                                                        <DialogDescription>查看商品详细信息</DialogDescription>
                                                                    </DialogHeader>
                                                                    {isLoadingDetails ? (
                                                                        <div className="space-y-2 py-4">
                                                                            <Skeleton className="h-8 w-full"/>
                                                                            <Skeleton className="h-24 w-full"/>
                                                                            <Skeleton className="h-24 w-full"/>
                                                                        </div>
                                                                    ) : productDetails ? (
                                                                        <Tabs defaultValue="details" className="w-full">
                                                                            <TabsList
                                                                                className="grid w-full grid-cols-3">
                                                                                <TabsTrigger
                                                                                    value="details">基本信息</TabsTrigger>
                                                                                <TabsTrigger
                                                                                    value="features">特性与规格</TabsTrigger>
                                                                                <TabsTrigger
                                                                                    value="seller">商家信息</TabsTrigger>
                                                                            </TabsList>
                                                                            <TabsContent value="details"
                                                                                         className="space-y-4 py-4">
                                                                                <div className="flex gap-4">
                                                                                    <div
                                                                                        className="relative w-32 h-32 overflow-hidden rounded-md">

                                                                                        {productDetails.colorImageUrls && Object.keys(productDetails.colorImageUrls).length > 0 ? (
                                                                                            <Image
                                                                                                src={`${API_URL}/api/image${getImageUrl(productDetails.colorImageUrls)}` || "/placeholder.svg"}
                                                                                                alt={productDetails.name}
                                                                                                fill
                                                                                                className="object-cover"
                                                                                                onError={(e) => {
                                                                                                    e.currentTarget.src = "/placeholder.svg"
                                                                                                }}
                                                                                            />
                                                                                        ) : (
                                                                                            <Image
                                                                                                src="/placeholder.svg"
                                                                                                alt="No image"
                                                                                                fill
                                                                                                className="object-cover"
                                                                                            />
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                        <h3 className="text-xl font-bold">{productDetails.name}</h3>
                                                                                        <div
                                                                                            className="flex items-center gap-2 mt-2">
                                                                                            <Badge variant="outline">
                                                                                                <Tag
                                                                                                    className="h-3 w-3 mr-1"/>
                                                                                                {productDetails.category}
                                                                                            </Badge>
                                                                                            {getStatusBadge(productDetails.status)}
                                                                                        </div>
                                                                                        <p className="text-lg font-semibold mt-2">
                                                                                            {formatCurrency(calculateMinPrice(productDetails.variants))}
                                                                                        </p>
                                                                                        <p
                                                                                            className="text-sm mt-2">库存: {calculateTotalStock(productDetails.variants) ?? 'N/A'} 件</p>
                                                                                    </div>
                                                                                </div>
                                                                                <div>
                                                                                    <h4 className="text-sm font-medium text-muted-foreground mb-1">商品描述</h4>
                                                                                    <p className="text-sm">{productDetails.description}</p>
                                                                                </div>
                                                                            </TabsContent>
                                                                            <TabsContent value="features"
                                                                                         className="space-y-6 py-4">
                                                                                {(() => {
                                                                                    let parsedFeatures: string[] | null = null;
                                                                                    try {
                                                                                        if (productDetails?.featuresJson) {
                                                                                            const parsed = JSON.parse(productDetails.featuresJson);
                                                                                            if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
                                                                                                parsedFeatures = parsed;
                                                                                            } else {
                                                                                                console.error("Features JSON is not a string array:", parsed);
                                                                                            }
                                                                                        }
                                                                                    } catch (e) {
                                                                                        console.error("Failed to parse features JSON:", e);
                                                                                    }
                                                                                    let parsedSpecifications: SpecificationItem[] | null = null;
                                                                                    try {
                                                                                        if (productDetails?.specificationsJson) {
                                                                                            const parsed = JSON.parse(productDetails.specificationsJson);
                                                                                            if (Array.isArray(parsed) && parsed.every(item => typeof item === 'object' && item !== null && 'key' in item && 'value' in item)) {
                                                                                                parsedSpecifications = parsed as SpecificationItem[];
                                                                                            } else {
                                                                                                console.error("Specifications JSON is not an array of key/value objects:", parsed);
                                                                                            }
                                                                                        }
                                                                                    } catch (e) {
                                                                                        console.error("Failed to parse specifications JSON:", e);
                                                                                    }
                                                                                    return (
                                                                                        <>
                                                                                            <div>
                                                                                                <h4 className="text-base font-semibold mb-2">商品特性</h4>
                                                                                                {parsedFeatures && parsedFeatures.length > 0 ? (

                                                                                                    <ScrollArea
                                                                                                        className="h-[150px] rounded-md border p-4">
                                                                                                        <ul className="list-disc list-inside space-y-1 text-sm">
                                                                                                            {parsedFeatures.map((feature, index) => (
                                                                                                                <li key={index}>{feature}</li>
                                                                                                            ))}
                                                                                                        </ul>
                                                                                                    </ScrollArea>
                                                                                                ) : (
                                                                                                    <p
                                                                                                        className="text-sm text-muted-foreground">该商品没有详细特性描述。</p>
                                                                                                )}
                                                                                            </div>
                                                                                            <div>
                                                                                                <h4 className="text-base font-semibold mb-2">规格参数</h4>
                                                                                                {parsedSpecifications && parsedSpecifications.length > 0 ? (

                                                                                                    <ScrollArea
                                                                                                        className="h-[150px] rounded-md border p-4">
                                                                                                        <div
                                                                                                            className="space-y-2 text-sm">
                                                                                                            {parsedSpecifications.map((spec, index) => (
                                                                                                                <div
                                                                                                                    key={index}
                                                                                                                    className="grid grid-cols-2 gap-4">
                                                                                                                    <div
                                                                                                                        className="font-medium text-muted-foreground">{spec.key}:
                                                                                                                    </div>
                                                                                                                    <div>{spec.value}</div>
                                                                                                                </div>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </ScrollArea>
                                                                                                ) : (
                                                                                                    <p
                                                                                                        className="text-sm text-muted-foreground">该商品没有详细规格参数。</p>
                                                                                                )}
                                                                                            </div>

                                                                                            <div
                                                                                                className="border-t pt-6 mt-6 space-y-4">
                                                                                                <div>
                                                                                                    <h4 className="text-base font-semibold mb-2">商品款式</h4>
                                                                                                    {productDetails.variants && productDetails.variants.length > 0 ? (
                                                                                                        <ScrollArea
                                                                                                            className="h-[200px] rounded-md border">

                                                                                                            <Table>
                                                                                                                <TableHeader>
                                                                                                                    <TableRow>
                                                                                                                        <TableHead>颜色</TableHead>
                                                                                                                        <TableHead>尺寸</TableHead>
                                                                                                                        <TableHead>价格</TableHead>
                                                                                                                        <TableHead>库存</TableHead>
                                                                                                                    </TableRow>
                                                                                                                </TableHeader>
                                                                                                                <TableBody>

                                                                                                                    {productDetails.variants.map(variant => (
                                                                                                                        <TableRow
                                                                                                                            key={variant.id}>
                                                                                                                            <TableCell>{variant.color || '-'}</TableCell>
                                                                                                                            <TableCell>{variant.size || '-'}</TableCell>
                                                                                                                            <TableCell>{formatCurrency(variant.price)}</TableCell>
                                                                                                                            <TableCell>{variant.stockQuantity}</TableCell>
                                                                                                                        </TableRow>
                                                                                                                    ))}
                                                                                                                </TableBody>
                                                                                                            </Table>
                                                                                                        </ScrollArea>
                                                                                                    ) : (
                                                                                                        <p className="text-sm text-muted-foreground">该商品没有变体信息。</p>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        </>
                                                                                    );
                                                                                })()}
                                                                            </TabsContent>
                                                                            <TabsContent value="seller"
                                                                                         className="space-y-4 py-4">
                                                                                <div className="grid grid-cols-2 gap-4">
                                                                                    <div>
                                                                                        <h4 className="text-sm font-medium text-muted-foreground">商家ID</h4>
                                                                                        <p className="mt-1">{productDetails.ownerInfo?.id}</p>
                                                                                    </div>
                                                                                    <div>
                                                                                        <h4 className="text-sm font-medium text-muted-foreground">商家用户名</h4>
                                                                                        <p className="mt-1">{productDetails.ownerInfo?.username}</p>
                                                                                    </div>
                                                                                    <div>
                                                                                        <h4 className="text-sm font-medium text-muted-foreground">商家邮箱</h4>
                                                                                        <p className="mt-1">{productDetails.ownerInfo?.email}</p>
                                                                                    </div>
                                                                                    {productDetails.ownerInfo?.avatar && (
                                                                                        <div>
                                                                                            <h4 className="text-sm font-medium text-muted-foreground">商家头像</h4>
                                                                                            <div
                                                                                                className="relative w-10 h-10 overflow-hidden rounded-full mt-1">
                                                                                                <Image
                                                                                                    src={`${API_URL}/api/image${productDetails.ownerInfo.avatar}`}
                                                                                                    alt="Seller Avatar"
                                                                                                    fill
                                                                                                    className="object-cover"/>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </TabsContent>
                                                                        </Tabs>
                                                                    ) : (
                                                                        <div
                                                                            className="py-8 text-center text-muted-foreground">加载商品详情失败或无数据</div>
                                                                    )}
                                                                </DialogContent>
                                                            </Dialog>

                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        onClick={() => setIsDetailsDialogOpen(false)}
                                                                    >
                                                                        <RefreshCw className="h-4 w-4"/>
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent className="w-40">
                                                                    <DropdownMenuLabel>更新商品状态</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator/>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleStatusChange(product.id, "ACTIVE")}>
                                                                        已上架
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleStatusChange(product.id, "INACTIVE")}>
                                                                        已下架
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleStatusChange(product.id, "PENDING")}>
                                                                        待审核
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleStatusChange(product.id, "REJECTED")}>
                                                                        拒绝上架
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleStatusChange(product.id, "DELETED")}>
                                                                        已删除
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                                <div className="mt-4">
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                                    className={`${currentPage === 1 ? "cursor-not-allowed pointer-events-none" : ""}`}
                                                />
                                            </PaginationItem>
                                            {Array.from({length: totalPages}, (_, i) => i + 1).map((page) => (
                                                <PaginationItem key={page}>
                                                    <PaginationLink onClick={() => setCurrentPage(page)}
                                                                    isActive={currentPage === page}>
                                                        {page}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            ))}
                                            <PaginationItem>
                                                <PaginationNext
                                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                                    className={`${currentPage === totalPages ? "cursor-not-allowed pointer-events-none" : ""}`}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    )
}