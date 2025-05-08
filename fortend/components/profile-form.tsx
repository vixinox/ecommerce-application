"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth-provider";
import { API_URL } from "@/lib/api";
import { sha256 } from "@/lib/auth";

const profileSchema = z.object({
  email: z.string().email("请输入有效的电子邮件地址").min(1, "电子邮件地址不能为空"),
  nickname: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "请输入当前密码"),
  newPassword: z.string().min(6, "密码至少需要6个字符"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "新密码与确认密码不匹配",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export function ProfileForm() {
  const {user, token, login, logout, isLoading} = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user?.email || "",
      nickname: user?.nickname || "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    profileForm.reset({
      email: user?.email || "",
      nickname: user?.nickname || "",
    });
  }, [user, profileForm]);

  async function onProfileSubmit(data: ProfileFormValues) {
    if (isLoading) return;
    if (!token) {
      setIsUpdating(false);
      return;
    }
    setIsUpdating(true);
    try {
      const response = await fetch(`${API_URL}/api/user/update/info`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const userData = await response.json();
        if (login) {
          login(userData, token, false);
        }
        toast.success("个人资料更新成功");
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.message || response.statusText || "未知错误";
        if (response.status === 401) {
          logout("登录凭据已过期，请重新登录");
        } else {
          toast.error("个人信息更新失败", {description: errorMessage});
        }
      }
    } catch (error) {
      toast.error("网络连接异常", {description: error instanceof Error ? error.message : "未知错误"});
    } finally {
      setIsUpdating(false);
    }
  }

  async function onPasswordSubmit(data: PasswordFormValues) {
    setIsChangingPassword(true);
    if (!token) {
      setIsChangingPassword(false);
      return;
    }

    try {
      const hashedCurrentPassword = await sha256(data.currentPassword);
      const hashedNewPassword = await sha256(data.newPassword);

      const response = await fetch(`${API_URL}/api/user/update/password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({currentPassword: hashedCurrentPassword, newPassword: hashedNewPassword}),
      });

      if (response.ok) {
        toast.success("密码修改成功");
        logout("密码已修改，请重新登录");
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.message || response.statusText || "未知错误";
        if (response.status === 401) {
          logout("登录凭据已过期，请重新登录");
        } else {
          toast.error("密码修改失败", {description: errorMessage});
        }
      }
    } catch (error) {
      toast.error("网络连接异常", {description: error instanceof Error ? error.message : "未知错误"});
    } finally {
      setIsChangingPassword(false);
    }
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error("仅支持 JPEG 或 PNG 格式");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size >= 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUpdating(true);
    const formData = new FormData();
    formData.append('file', file);

    if (!token) {
      setIsUpdating(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.error("未登录");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/image/upload/avatar`, {
        method: 'POST',
        headers: {Authorization: `Bearer ${token}`},
        body: formData,
      });
      if (response.ok) {
        toast.success("头像上传成功");
      } else {
        toast.error("上传失败", {description: response.text()});
      }
    } catch (error) {
      toast.error("网络连接异常", {description: error instanceof Error ? error.message : "未知错误"});
    } finally {
      setIsUpdating(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const currentAvatarSrc = user?.avatar ? `${API_URL}/api/image${user.avatar}` : 'placeholder.svg';

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="general">基本信息</TabsTrigger>
        <TabsTrigger value="security">安全设置</TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="space-y-6 pt-6">
        <div className="flex flex-col gap-8 md:flex-row">
          <Card className="w-full md:w-1/3">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={currentAvatarSrc} alt={user?.username || "?"} className="object-cover"/>
                  <AvatarFallback className="text-2xl">
                    {user?.nickname?.[0] || user?.username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h4 className="text-lg font-medium">{user?.nickname || user?.username || "用户名称"}</h4>
                  <p className="text-sm text-muted-foreground">{user?.email || "未设置邮箱"}</p>
                </div>
                <div className="w-full">
                  <label
                    htmlFor="avatar-upload"
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mb-4"
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
                    {isUpdating ? "正在上传..." : "更改头像"}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/jpeg, image/png"
                    className="hidden"
                    onChange={handleAvatarChange}
                    ref={fileInputRef}
                    disabled={isUpdating}
                  />
                  <label
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => window.location.reload()}
                  >
                    刷新
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex-1">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                <FormItem>
                  <FormLabel>用户名</FormLabel>
                  <FormControl>
                    <Input value={user?.username || ''} disabled/>
                  </FormControl>
                  <FormDescription>这是您的用户名 (不可更改)</FormDescription>
                </FormItem>

                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>电子邮件</FormLabel>
                      <FormControl>
                        <Input placeholder="your.email@example.com" {...field} disabled={isUpdating}/>
                      </FormControl>
                      <FormDescription>我们不会与任何人分享您的电子邮件</FormDescription>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="nickname"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>昵称</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入昵称" {...field} disabled={isUpdating}/>
                      </FormControl>
                      <FormDescription>您希望在平台上被如何称呼</FormDescription>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isUpdating || !profileForm.formState.isDirty}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                      正在更新...
                    </>
                  ) : (
                    "更新资料"
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="security" className="space-y-6 pt-6 pl-2 pr-2">
        <div>
          <h4 className="text-lg font-medium">修改密码</h4>
          <p className="text-sm text-muted-foreground">定期更换您的密码以确保账户安全</p>
        </div>
        <Separator/>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
            <FormField
              control={passwordForm.control}
              name="currentPassword"
              render={({field}) => (
                <FormItem>
                  <FormLabel>当前密码</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="请输入当前密码" {...field} disabled={isChangingPassword}/>
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name="newPassword"
              render={({field}) => (
                <FormItem>
                  <FormLabel>新密码</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="请输入新密码" {...field} disabled={isChangingPassword}/>
                  </FormControl>
                  <FormDescription>
                    密码至少6个字符
                  </FormDescription>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name="confirmPassword"
              render={({field}) => (
                <FormItem>
                  <FormLabel>确认新密码</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="请确认新密码" {...field} disabled={isChangingPassword}/>
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isChangingPassword || !passwordForm.formState.isValid}>
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                  正在修改密码...
                </>
              ) : (
                "修改密码"
              )}
            </Button>
          </form>
        </Form>
      </TabsContent>
    </Tabs>
  );
}