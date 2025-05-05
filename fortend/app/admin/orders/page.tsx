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
import {Eye, RefreshCw} from "lucide-react"
import {getOrders, updateOrderStatus} from "@/lib/api"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {useAuth} from "@/components/auth-provider";
import {useRouter} from "next/navigation"

interface Order {
    id: number
    orderNumber: string
    userId: number
    status: string
    totalAmount: number
    createdAt: string
    updatedAt: string
}

interface OrdersResponse {
    list: {
        order: Order
        items: {
            id: number
            productId: number
            productName: string
            quantity: number
            price: number
            subtotal: number
        }[]
        buyerInfo: {
            id: number
            username: string
            email: string
            phone: string
            address: string
        }
    }[]
    total: number
    pageNum: number
    pageSize: number
    size: number
    pages: number
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
    const {token, isLoading} = useAuth()
    const [isFetching, setIsFetching] = useState(false)
    const router = useRouter()

    const fetchOrders = async () => {
        try {
            if (isLoading || !token) return;
            setIsFetching(true)
            let data: OrdersResponse;
            if (statusFilter)
                data = await getOrders(token, currentPage, 10, statusFilter)
            else
                data = await getOrders(token, currentPage, 10)
            console.log("data", data);
            console.log("statusFilter", statusFilter)
            setOrders(data.list.map(item => item.order));
            setTotalPages(data.pages);
        } catch (error: any) {
            console.error(error)
            toast.error("获取订单列表失败", {description: error.message})
        } finally {
            setIsFetching(false)
        }
    }

    useEffect(() => {
        fetchOrders()
    }, [currentPage, statusFilter, token, isLoading])

    const handleStatusChange = async (id: number, status: string) => {
        try {
            if (isLoading) return;
            if (!token) {
                toast.error("请先登录")
                router.push("/auth/login")
                return
            }
            await updateOrderStatus(id, status, token)
            toast.success("订单状态已更新")
            await fetchOrders()

        } catch (error: any) {
            toast.error("更新订单状态失败", {description: error.message})
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return <Badge variant="outline">待发货</Badge>
            case "SHIPPED":
                return <Badge className="bg-yellow-500">已发货</Badge>
            case "COMPLETED":
                return <Badge className="bg-green-500">已完成</Badge>
            case "CANCELED":
                return <Badge variant="destructive">已取消</Badge>
            default:
                return <Badge variant="secondary">{status}</Badge>
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return new Intl.DateTimeFormat("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("zh-CN", {
            style: "currency",
            currency: "CNY",
        }).format(amount)
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

    return (
        <motion.div initial="hidden" animate="show" variants={container} className="space-y-6 mt-6">
            <motion.div variants={item} className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">订单管理</h1>
                    <p className="text-muted-foreground">查看和管理所有订单</p>
                </div>
                <Select value={statusFilter || ""} onValueChange={(value) => setStatusFilter(value || undefined)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="所有状态"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">所有状态</SelectItem>
                        <SelectItem value="PENDING">待发货</SelectItem>
                        <SelectItem value="SHIPPED">已发货</SelectItem>
                        <SelectItem value="COMPLETED">已完成</SelectItem>
                        <SelectItem value="CANCELED">已取消</SelectItem>
                    </SelectContent>
                </Select>
            </motion.div>

            <motion.div variants={item}>
                <Card>
                    <CardHeader>
                        <CardTitle>订单列表</CardTitle>
                        <CardDescription>平台上的所有订单</CardDescription>
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
                                            <TableHead>订单号</TableHead>
                                            <TableHead>用户id</TableHead>
                                            <TableHead>状态</TableHead>
                                            <TableHead>金额</TableHead>
                                            <TableHead>创建时间</TableHead>
                                            <TableHead className="text-right">操作</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {!orders || orders.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6}
                                                           className="text-center py-8 text-muted-foreground">
                                                    没有找到订单
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            orders && orders.map((order) => (
                                                <TableRow key={order.id}>
                                                    <TableCell className="font-medium">{order.id}</TableCell>
                                                    <TableCell className="font-medium">{order.userId}</TableCell>
                                                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                                                    <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                                                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => router.push(`/admin/orders/${order.id}`)}
                                                            >
                                                                <Eye className="h-4 w-4"/>
                                                            </Button>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                    >
                                                                        <RefreshCw className="h-4 w-4"/>
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel>更新订单状态</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator/>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleStatusChange(order.id, 'PENDING')}>
                                                                        待发货
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleStatusChange(order.id, 'SHIPPED')}>
                                                                        已发货
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleStatusChange(order.id, 'COMPLETED')}>
                                                                        已完成
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleStatusChange(order.id, 'CANCELED')}>
                                                                        已取消
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
