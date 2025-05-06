"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, UserCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation"
import { deleteUser, getUsers, updateUserRole, updateUserStatus } from "@/lib/api";
import { motion } from "framer-motion"

interface User {
  id: number
  username: string
  email: string
  role: string
  status: string
  createdAt?: string | null
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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [newStatus, setNewStatus] = useState("")
  const [newRole, setNewRole] = useState("")

  const {token, isLoading} = useAuth()
  const [isFetching, setIsFetching] = useState(false);
  const router = useRouter()

  const fetchUsers = async (page: number, size: number, status?: string) => {
    setIsFetching(true);
    try {
      if (!token) {
        toast.error("请先登录");
        router.push("/auth/login");
        return;
      }

      const data = await getUsers(token, page, size, status);
      console.log("Fetched data:", data);


      if (data && Array.isArray(data.list)) {
        setUsers(data.list as User[]);
        setTotalPages(data.pages || 1);
        setTotalUsers(data.total || 0);
      } else {
        console.error("Unexpected data structure:", data);
        setUsers([]);
        setTotalPages(1);
        setTotalUsers(0);
        toast.error("获取用户列表失败", {description: "API 返回了非预期的数据格式。"});
      }

    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("获取用户列表失败", {description: error.message || "未知错误"});
      setUsers([]);
      setTotalPages(1);
      setTotalUsers(0);
    } finally {
      setIsFetching(false);
    }
  }


  useEffect(() => {
    if (!isLoading && token) {
      fetchUsers(currentPage, pageSize, statusFilter);
    } else if (!isLoading && !token) {
      toast.error("请先登录", {description: "需要登录才能查看用户列表。"});
      router.push("/auth/login");
    }
  }, [currentPage, pageSize, statusFilter, token, isLoading, router]);


  const handleStatusChange = async () => {
    if (!selectedUser || !newStatus || !token) return

    try {
      await updateUserStatus(selectedUser.id, newStatus, token)
      toast.success("用户状态已更新")
      await fetchUsers(currentPage, pageSize, statusFilter)
      setIsStatusDialogOpen(false)
    } catch (error: any) {
      toast.error("更新用户状态失败", {description: error.message || "未知错误"})
    }
  }

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole || !token) return

    try {
      await updateUserRole(selectedUser.id, newRole, token)
      toast.success("用户角色已更新")
      await fetchUsers(currentPage, pageSize, statusFilter)
      setIsRoleDialogOpen(false)
    } catch (error: any) {
      toast.error("更新用户角色失败", {description: error.message || "未知错误"})
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser || !token) return

    try {
      await deleteUser(selectedUser.id, token)
      toast.success("用户已删除")
      await fetchUsers(currentPage, pageSize, statusFilter)
      setIsDeleteDialogOpen(false)
    } catch (error: any) {
      toast.error("删除用户失败", {description: error.message || "未知错误"})
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return <Badge className="bg-green-500 hover:bg-green-500/80">激活</Badge>
      case "deleted":
        return <Badge variant="outline">未激活</Badge>
      case "suspended":
        return <Badge variant="destructive">挂起</Badge>
      default:
        return <Badge variant="secondary">{status || '未知状态'}</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return <Badge className="bg-purple-500 hover:bg-purple-500/80">管理员</Badge>
      case "user":
        return <Badge variant="secondary">普通用户</Badge>
      case "merchant":
        return <Badge className="bg-blue-500 hover:bg-blue-500/80">商家</Badge>
      default:
        return <Badge variant="outline">{role || '未知角色'}</Badge>
    }
  }

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="space-y-6 mt-6">
      <motion.div variants={item} className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">用户管理</h1>
          <p className="text-muted-foreground">管理平台用户账号和权限</p>
        </div>
        <Select
          value={statusFilter === undefined ? "all" : statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value === "all" ? undefined : value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="所有状态"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有状态</SelectItem>
            <SelectItem value="ACTIVE">活跃</SelectItem>
            <SelectItem value="DELETED">删除</SelectItem>
            <SelectItem value="SUSPENDED">挂起</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle>用户列表</CardTitle>
            <CardDescription>平台上的所有注册用户 (共 {totalUsers} 条)</CardDescription>
          </CardHeader>
          <CardContent>
            {isFetching ? (
              <div className="space-y-2">
                {Array.from({length: pageSize}).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full"/>
                ))}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户名</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>状态</TableHead>

                      <TableHead>注册时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 && !isFetching ? (
                      <TableRow>
                        <TableCell colSpan={6}
                                   className="text-center py-8 text-muted-foreground">
                          没有找到用户
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>

                          <TableCell>
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Dialog
                                open={isStatusDialogOpen && selectedUser?.id === user.id}
                                onOpenChange={setIsStatusDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setNewStatus(user.status);
                                      setIsStatusDialogOpen(true);
                                    }}
                                  >
                                    <UserCheck className="h-4 w-4"/>
                                  </Button>
                                </DialogTrigger>
                                {selectedUser && isStatusDialogOpen && selectedUser.id === user.id && (
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>更改用户状态</DialogTitle>
                                      <DialogDescription>更改用户 {selectedUser.username} 的状态</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 space-y-2">
                                      <Label htmlFor="status">状态</Label>
                                      <Select value={newStatus}
                                              onValueChange={setNewStatus}>
                                        <SelectTrigger id="status">
                                          <SelectValue
                                            placeholder="选择状态"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem
                                            value="ACTIVE">活跃</SelectItem>
                                          <SelectItem
                                            value="INACTIVE">删除</SelectItem>
                                          <SelectItem
                                            value="SUSPENDED">挂起</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <DialogFooter>
                                      <Button variant="outline"
                                              onClick={() => setIsStatusDialogOpen(false)}>
                                        取消
                                      </Button>
                                      <Button
                                        onClick={handleStatusChange}>保存</Button>
                                    </DialogFooter>
                                  </DialogContent>
                                )}
                              </Dialog>


                              <Dialog
                                open={isRoleDialogOpen && selectedUser?.id === user.id}
                                onOpenChange={setIsRoleDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setNewRole(user.role);
                                      setIsRoleDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4"/>
                                  </Button>
                                </DialogTrigger>

                                {selectedUser && isRoleDialogOpen && selectedUser.id === user.id && (
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>更改用户角色</DialogTitle>
                                      <DialogDescription>更改用户 {selectedUser.username} 的角色</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 space-y-2">
                                      <Label htmlFor="role">角色</Label>
                                      <Select value={newRole}
                                              onValueChange={setNewRole}>
                                        <SelectTrigger id="role">
                                          <SelectValue
                                            placeholder="选择角色"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem
                                            value="ADMIN">管理员</SelectItem>
                                          <SelectItem
                                            value="USER">普通用户</SelectItem>
                                          <SelectItem
                                            value="MERCHANT">商家</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <DialogFooter>
                                      <Button variant="outline"
                                              onClick={() => setIsRoleDialogOpen(false)}>
                                        取消
                                      </Button>
                                      <Button
                                        onClick={handleRoleChange}>保存</Button>
                                    </DialogFooter>
                                  </DialogContent>
                                )}
                              </Dialog>


                              <Dialog
                                open={isDeleteDialogOpen && selectedUser?.id === user.id}
                                onOpenChange={setIsDeleteDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500"/>
                                  </Button>
                                </DialogTrigger>

                                {selectedUser && isDeleteDialogOpen && selectedUser.id === user.id && (
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>删除用户</DialogTitle>
                                      <DialogDescription>
                                        确定要删除用户 {selectedUser.username} 吗？此操作不可撤销。
                                      </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                      <Button variant="outline"
                                              onClick={() => setIsDeleteDialogOpen(false)}>
                                        取消
                                      </Button>
                                      <Button variant="destructive"
                                              onClick={handleDeleteUser}>
                                        删除
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                )}
                              </Dialog>
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
                          className={`select-none cursor-pointer ${currentPage === 1 ? "cursor-not-allowed" : ""}`}
                        />
                      </PaginationItem>
                      {Array.from({length: totalPages}, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className={`select-none cursor-pointer ${currentPage === page ? "cursor-not-allowed" : ""}`}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          className={`select-none cursor-pointer ${currentPage === totalPages ? "cursor-not-allowed" : ""}`}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                  {totalPages > 0 && (
                    <div className="text-center text-sm text-muted-foreground mt-2">
                      第 {currentPage} / {totalPages} 页
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}