"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Edit, Trash2, UserCheck, CalendarIcon, FilterIcon, X, Loader2 } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, isValid } from "date-fns"
import { cn } from "@/lib/utils"

interface User {
  id: number
  username: string
  email: string
  role: string
  status: string
  createdAt?: string | null
}

interface UserFilters {
  searchTerm?: string;
  searchField?: 'username' | 'email' | 'id';
  role?: string;
  status?: string;
  registrationDateStart?: Date;
  registrationDateEnd?: Date;
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

const buildQueryParams = (filters: UserFilters, page: number, size: number): string => {
  const params = new URLSearchParams();

  params.append('page', String(page));
  params.append('size', String(size));

  if (filters.searchTerm) {
    const field = filters.searchField || 'username';
    params.append('searchTerm', filters.searchTerm);
    params.append('searchField', field);
  }

  if (filters.role) {
    params.append('role', filters.role);
  }
  if (filters.status) {
    params.append('status', filters.status);
  }
  if (filters.registrationDateStart && isValid(filters.registrationDateStart)) {
    params.append('registrationDateStart', format(filters.registrationDateStart, 'yyyy-MM-dd'));
  }
  if (filters.registrationDateEnd && isValid(filters.registrationDateEnd)) {
    params.append('registrationDateEnd', format(filters.registrationDateEnd, 'yyyy-MM-dd'));
  }

  console.log("filters", filters);
  console.log("queryParams", params.toString());


  return params.toString();
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0);

  const [filters, setFilters] = useState<UserFilters>({});
  const [tempFilters, setTempFilters] = useState<UserFilters>({searchField: 'username'});
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isStatusDialogTriggered, setIsStatusDialogTriggered] = useState(false);
  const [isRoleDialogTriggered, setIsRoleDialogTriggered] = useState(false);
  const [isDeleteDialogOpenTriggered, setIsDeleteDialogOpenTriggered] = useState(false);

  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [newStatus, setNewStatus] = useState("")
  const [newRole, setNewRole] = useState("")

  const {token, isLoading: isAuthLoading} = useAuth()
  const [isFetching, setIsFetching] = useState(true);
  const router = useRouter()

  const fetchUsersWithFilters = async (page: number, currentFilters: UserFilters, size: number) => {

    if (!isFetching) {
      setIsFetching(true);
    }

    try {
      if (!token) {
        if (!isAuthLoading) {
          toast.error("请先登录");
          router.push("/auth/login");
        }
        return;
      }

      const queryParams = buildQueryParams(currentFilters, page, size);
      const data = await getUsers(token, queryParams);
      console.log("Fetched data:", data);

      if (data && Array.isArray(data.list)) {
        setUsers(data.list as User[]);
        setTotalPages(data.pages || 1);
        setTotalUsers(data.total || 0);

        if (page > (data.pages || 1) && (data.pages || 1) > 0) {
          setCurrentPage(data.pages);
        } else if ((data.pages || 1) === 0) {
          setCurrentPage(1);
        } else {
          setCurrentPage(page);
        }

      } else {
        console.error("Unexpected data structure:", data);
        setUsers([]);
        setTotalPages(1);
        setTotalUsers(0);
        toast.error("获取用户列表失败", {description: "API 返回了非预期的数据格式或数据结构。"});
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
    if (!isAuthLoading) {
      if (token) {
        fetchUsersWithFilters(currentPage, filters, pageSize);
      } else {
        toast.error("请先登录");
        router.push("/auth/login");
        setIsFetching(false);
      }
    }
  }, [currentPage, pageSize, filters, token, isAuthLoading, router]);

  useEffect(() => {
    if (isStatusDialogTriggered) {
      setIsStatusDialogOpen(true);
      setIsStatusDialogTriggered(false);
    }
  }, [isStatusDialogTriggered]);

  useEffect(() => {
    if (isRoleDialogTriggered) {
      setIsRoleDialogOpen(true);
      setIsRoleDialogTriggered(false);
    }
  }, [isRoleDialogTriggered]);

  useEffect(() => {
    if (isDeleteDialogOpenTriggered) {
      setIsDeleteDialogOpen(true);
      setIsDeleteDialogOpenTriggered(false);
    }
  }, [isDeleteDialogOpenTriggered]);

  const handleStatusDialogClose = (open: boolean) => {
    setIsStatusDialogOpen(open);
    if (!open) setSelectedUser(null);
  };

  const handleRoleDialogClose = (open: boolean) => {
    setIsRoleDialogOpen(open);
    if (!open) setSelectedUser(null);
  };

  const handleDeleteDialogClose = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open) setSelectedUser(null);
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setFilters({...tempFilters});
    setIsFilterPopoverOpen(false);
  };

  const handleResetFilters = () => {
    const resetState = {searchField: 'username'} as UserFilters;
    setTempFilters(resetState);
    setCurrentPage(1);
    setFilters(resetState);
    setIsFilterPopoverOpen(false);
  };


  useEffect(() => {
    if (isFilterPopoverOpen) {
      setTempFilters(prevTempFilters => ({
        ...filters,
        searchTerm: (prevTempFilters.searchTerm !== undefined || filters.searchTerm === undefined) ? prevTempFilters.searchTerm : filters.searchTerm,
        searchField: (prevTempFilters.searchField !== undefined || filters.searchField === undefined) ? prevTempFilters.searchField : filters.searchField,
        registrationDateStart: filters.registrationDateStart ? new Date(filters.registrationDateStart) : undefined,
        registrationDateEnd: filters.registrationDateEnd ? new Date(filters.registrationDateEnd) : undefined,
        role: filters.role,
        status: filters.status,
      }));
    } else {
      setTempFilters({...filters, searchField: filters.searchField || 'username'});
    }
  }, [isFilterPopoverOpen, filters]);
  
  const handleStatusChange = async () => {
    if (!selectedUser || !newStatus || !token) return
    try {
      await updateUserStatus(selectedUser.id, newStatus, token)
      toast.success("用户状态已更新")
      setIsStatusDialogOpen(false);
      await fetchUsersWithFilters(currentPage, filters, pageSize)
    } catch (error: any) {
      toast.error("更新用户状态失败", {description: error.message || "未知错误"})
    }
  }

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole || !token) return
    try {
      await updateUserRole(selectedUser.id, newRole, token)
      toast.success("用户角色已更新")
      setIsRoleDialogOpen(false);
      await fetchUsersWithFilters(currentPage, filters, pageSize)
    } catch (error: any) {
      toast.error("更新用户角色失败", {description: error.message || "未知错误"})
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser || !token) return
    try {
      await deleteUser(selectedUser.id, token)
      toast.success("用户已删除")
      setIsDeleteDialogOpen(false);
      await fetchUsersWithFilters(currentPage, filters, pageSize); 
    } catch (error: any) {
      toast.error("删除用户失败", {description: error.message || "未知错误"})
    }
  }


  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return <Badge className="bg-green-500 hover:bg-green-500/80">激活</Badge>
      case "DELETED":
        return <Badge variant="outline">已删除</Badge>
      case "SUSPENDED":
        return <Badge variant="destructive">禁用</Badge>
      default:
        return <Badge variant="secondary">{status || '未知状态'}</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role?.toUpperCase()) {
      case "ADMIN":
        return <Badge className="bg-purple-500 hover:bg-purple-500/80">管理员</Badge>
      case "USER":
        return <Badge variant="secondary">普通用户</Badge>
      case "MERCHANT":
        return <Badge className="bg-blue-500 hover:bg-blue-500/80">商家</Badge>
      default:
        return <Badge variant="outline">{role || '未知角色'}</Badge>
    }
  }

  const isInitialLoading = isFetching && users.length === 0;
  
  return (
    <motion.div initial="hidden" animate="show" variants={container} className="space-y-6 mt-6">
      <motion.div variants={item}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">用户管理</h1>
          <p className="text-muted-foreground">管理平台用户账号和权限</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            placeholder={`搜索${tempFilters.searchField === 'id' ? '用户ID' : tempFilters.searchField === 'email' ? '邮箱' : '用户名'}...`}
            value={tempFilters.searchTerm || ''}
            onChange={(e) => setTempFilters(prev => ({...prev, searchTerm: e.target.value}))}
            className="w-full sm:w-[250px]"
            disabled={isFetching} 
          />
          <Button
            onClick={() => handleApplyFilters()} 
            disabled={isFetching} 
          >
            搜索
          </Button>
          <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2" disabled={isFetching}> 
                <FilterIcon className="h-4 w-4"/>
                <span>搜索设置</span>

                {(filters.searchTerm || filters.searchField !== 'username' || filters.role || filters.status || filters.registrationDateStart || filters.registrationDateEnd) && (
                  <Badge variant="secondary" className="h-5 min-w-5 p-0 flex items-center justify-center">
                    <FilterIcon className="h-3 w-3"/> 
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-4 space-y-4" align="end">
              
              <div className="grid gap-2">
                <Label htmlFor="search-field">搜索字段</Label>
                <Select
                  value={tempFilters.searchField || 'username'}
                  onValueChange={(value: 'username' | 'email' | 'id') => setTempFilters(prev => ({
                    ...prev,
                    searchField: value
                  }))}
                  disabled={isFetching}
                >
                  <SelectTrigger id="search-field">
                    <SelectValue placeholder="选择搜索字段"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="username">用户名</SelectItem>
                    <SelectItem value="email">邮箱</SelectItem>
                    <SelectItem value="id">用户ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role-filter">角色</Label>
                <Select
                  value={tempFilters.role}
                  onValueChange={(value) => setTempFilters(prev => ({
                    ...prev,
                    role: value === "all" ? undefined : value
                  }))}
                  disabled={isFetching}
                >
                  <SelectTrigger id="role-filter">
                    <SelectValue placeholder="所有角色"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有角色</SelectItem>
                    <SelectItem value="ADMIN">管理员</SelectItem>
                    <SelectItem value="USER">普通用户</SelectItem>
                    <SelectItem value="MERCHANT">商家</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status-filter">状态</Label>
                <Select
                  value={tempFilters.status}
                  onValueChange={(value) => setTempFilters(prev => ({
                    ...prev,
                    status: value === "all" ? undefined : value
                  }))}
                  disabled={isFetching}
                >
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="所有状态"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有状态</SelectItem>
                    <SelectItem value="ACTIVE">活跃</SelectItem>
                    <SelectItem value="DELETED">已删除</SelectItem>
                    <SelectItem value="SUSPENDED">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>注册时间范围</Label>
                <div
                  className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    isFetching && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Popover>
                    <PopoverTrigger asChild disabled={isFetching}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "flex-grow justify-start text-left font-normal rounded-r-none",
                          !tempFilters.registrationDateStart && "text-muted-foreground"
                        )}
                        disabled={isFetching}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4"/>
                        {tempFilters.registrationDateStart ? format(tempFilters.registrationDateStart, "yyyy-MM-dd") :
                          <span>开始日期</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={tempFilters.registrationDateStart}
                        onSelect={(date) => setTempFilters(prev => ({...prev, registrationDateStart: date}))}
                        initialFocus
                        disabled={isFetching}
                      />
                    </PopoverContent>
                  </Popover>
                  {tempFilters.registrationDateStart && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-full p-1 disabled:pointer-events-none rounded-l-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTempFilters(prev => ({...prev, registrationDateStart: undefined}));
                      }}
                      disabled={isFetching}
                      type="button"
                    >
                      <X/>
                    </Button>
                  )}
                </div>

                <div
                  className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    isFetching && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Popover>
                    <PopoverTrigger asChild disabled={isFetching}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "flex-grow justify-start text-left font-normal rounded-r-none",
                          !tempFilters.registrationDateEnd && "text-muted-foreground"
                        )}
                        disabled={isFetching}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4"/>
                        {tempFilters.registrationDateEnd ? format(tempFilters.registrationDateEnd, "yyyy-MM-dd") :
                          <span>结束日期</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={tempFilters.registrationDateEnd}
                        onSelect={(date) => setTempFilters(prev => ({...prev, registrationDateEnd: date}))}
                        initialFocus
                        disabled={isFetching}
                      />
                    </PopoverContent>
                  </Popover>
                  {tempFilters.registrationDateEnd && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-full p-1 disabled:pointer-events-none rounded-l-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTempFilters(prev => ({...prev, registrationDateEnd: undefined}));
                      }}
                      disabled={isFetching}
                      type="button"
                    >
                      <X/>
                    </Button>
                  )}
                </div>

              </div>


              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleResetFilters} disabled={isFetching}>
                  重置
                </Button>
                <Button onClick={handleApplyFilters} disabled={isFetching}>
                  {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                  应用筛选
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </motion.div>
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle>用户列表</CardTitle>
            <CardDescription>
              平台上的所有注册用户 ({isInitialLoading ? '加载中...' : `共 ${totalUsers} 条`}) 
            </CardDescription>
          </CardHeader>
          
          <CardContent className="relative">
            {isFetching && (
              <div className="absolute inset-0 flex items-center justify-center z-10 rounded-md transition-opacity">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            )}
            <div className={`overflow-x-auto ${isFetching ? 'opacity-50 pointer-events-none' : ''} transition-opacity duration-200`}>
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>用户名</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>注册时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!isFetching && users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {Object.keys(filters).some(key => filters[key as keyof UserFilters] !== undefined && (filters[key as keyof UserFilters] !== (key === 'searchField' ? 'username' : undefined)))
                          ? "根据当前筛选条件未找到用户"
                          : "没有找到用户"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.id}</TableCell>
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
                              onOpenChange={handleStatusDialogClose}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setNewStatus(user.status);
                                    setIsStatusDialogTriggered(true);
                                  }}
                                  disabled={isFetching}
                                >
                                  <UserCheck className="h-4 w-4"/>
                                </Button>
                              </DialogTrigger>

                              {isStatusDialogOpen && selectedUser?.id === user.id && (
                                <DialogContent>
                                  
                                  <DialogHeader>
                                    <DialogTitle>更改用户状态</DialogTitle>
                                    <DialogDescription>更改用户 {selectedUser.username} 的状态</DialogDescription>
                                  </DialogHeader>
                                  <div className="py-4 space-y-2">
                                    <Label htmlFor="status">状态</Label>
                                    <Select value={newStatus} onValueChange={setNewStatus}>
                                      <SelectTrigger id="status">
                                        <SelectValue placeholder="选择状态"/>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="ACTIVE">活跃</SelectItem>
                                        <SelectItem value="DELETED">已删除</SelectItem>
                                        <SelectItem value="SUSPENDED">禁用</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                                      取消
                                    </Button>
                                    <Button onClick={handleStatusChange} disabled={isFetching}> 
                                      {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                      保存
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              )}
                            </Dialog>

                            <Dialog
                              open={isRoleDialogOpen && selectedUser?.id === user.id}
                              onOpenChange={handleRoleDialogClose}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setNewRole(user.role);
                                    setIsRoleDialogTriggered(true);
                                  }}
                                  disabled={isFetching}
                                >
                                  <Edit className="h-4 w-4"/>
                                </Button>
                              </DialogTrigger>

                              {isRoleDialogOpen && selectedUser?.id === user.id && (
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>更改用户角色</DialogTitle>
                                    <DialogDescription>更改用户 {selectedUser.username} 的角色</DialogDescription>
                                  </DialogHeader>
                                  <div className="py-4 space-y-2">
                                    <Label htmlFor="role">角色</Label>
                                    <Select value={newRole} onValueChange={setNewRole}>
                                      <SelectTrigger id="role">
                                        <SelectValue placeholder="选择角色"/>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="ADMIN">管理员</SelectItem>
                                        <SelectItem value="USER">普通用户</SelectItem>
                                        <SelectItem value="MERCHANT">商家</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                                      取消
                                    </Button>
                                    <Button onClick={handleRoleChange} disabled={isFetching}> 
                                      {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                      保存
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              )}
                            </Dialog>


                            <Dialog
                              open={isDeleteDialogOpen && selectedUser?.id === user.id}
                              onOpenChange={handleDeleteDialogClose}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsDeleteDialogOpenTriggered(true);
                                  }}
                                  disabled={isFetching}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500"/>
                                </Button>
                              </DialogTrigger>

                              {isDeleteDialogOpen && selectedUser?.id === user.id && (
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>删除用户</DialogTitle>
                                    <DialogDescription>
                                      确定要删除用户 {selectedUser.username} 吗？此操作不可撤销。
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                                      取消
                                    </Button>
                                    <Button variant="destructive" onClick={handleDeleteUser} disabled={isFetching}> 
                                      {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
            </div>

            {totalUsers > 0 && (
              <div className={`mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 ${isFetching ? 'opacity-50 pointer-events-none' : ''} transition-opacity duration-200`}>
                <Pagination className="mx-auto sm:mx-0">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        className={`select-none cursor-pointer ${currentPage === 1 || isFetching ? "cursor-not-allowed opacity-50" : ""}`}
                        aria-disabled={currentPage === 1 || isFetching}
                      />
                    </PaginationItem>
                    {totalPages <= 7 ? (
                      Array.from({length: totalPages}, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}

                            className={`select-none cursor-pointer ${currentPage === page || isFetching ? "cursor-not-allowed " : ""}`}
                            aria-disabled={isFetching}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))
                    ) : (
                      <>
                        <PaginationItem><PaginationLink onClick={() => setCurrentPage(1)} isActive={currentPage === 1} aria-disabled={isFetching} className={`select-none cursor-pointer ${currentPage === 1 || isFetching ? "cursor-not-allowed" : ""}`}>1</PaginationLink></PaginationItem>
                        {currentPage > 3 && <PaginationItem> ... </PaginationItem>}
                        {
                          Array.from({length: Math.min(totalPages - 2, 3)}, (_, i) => {
                            let page = currentPage - 1 + i;
                            if (currentPage <= 3) page = 2 + i;
                            if (currentPage > totalPages - 3) page = totalPages - 3 + i;
                            return page;
                          }).filter(page => page > 1 && page < totalPages)
                          .map(page => (
                            <PaginationItem key={page}>
                              <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} aria-disabled={isFetching} className={`select-none cursor-pointer ${currentPage === page || isFetching ? "cursor-not-allowed" : ""}`}>
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))
                        }

                        {currentPage < totalPages - 2 && <PaginationItem> ... </PaginationItem>}
                        <PaginationItem><PaginationLink onClick={() => setCurrentPage(totalPages)} isActive={currentPage === totalPages} aria-disabled={isFetching} className={`select-none cursor-pointer ${currentPage === totalPages || isFetching ? "cursor-not-allowed" : ""}`}>{totalPages}</PaginationLink></PaginationItem>
                      </>
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        className={`select-none cursor-pointer ${currentPage === totalPages || isFetching ? "cursor-not-allowed opacity-50" : ""}`}
                        aria-disabled={currentPage === totalPages || isFetching}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
                <div className="text-sm text-muted-foreground">
                  第 {currentPage} / {totalPages} 页
                </div>
              </div>
            )}
            {!isFetching && totalUsers === 0 && users.length === 0 && (
              <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}