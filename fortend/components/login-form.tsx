"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {SubmitHandler, useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "sonner";
import {Loader2} from "lucide-react";
import type {z} from "zod";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {loginSchema, sha256} from "@/lib/auth";
import {useAuth} from "@/components/auth-provider";
import {API_URL} from "@/lib/api";

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const {login} = useAuth();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsLoading(true);
    try {
      const hashedPassword = await sha256(data.password);
      const response = await fetch(`${API_URL}/api/user/login`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email: data.email, password: hashedPassword}),
      });

      if (response.ok) {
        const userData = await response.json();
        login(userData.user, userData.token);
          if (userData.user.role === "ADMIN")
              router.push("/admin/dashboard");
          else
              router.push("/");
      }
      else
        toast.error("登录失败", {description: response.text()});
    } catch (error) {
      toast.error("网络连接异常", {description: error instanceof Error ? error.message : "未知错误"});
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="email" render={({field}) => (
          <FormItem>
            <FormLabel>邮箱</FormLabel>
            <FormControl>
              <Input placeholder="email@example.com" {...field} />
            </FormControl>
            <FormMessage/>
          </FormItem>
        )}/>
        <FormField control={form.control} name="password" render={({field}) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>密码</FormLabel>
            </div>
            <FormControl>
              <Input type="password" placeholder="••••••••" {...field} />
            </FormControl>
            <FormMessage/>
          </FormItem>
        )}/>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
              请稍候...
            </>
          ) : (
            "登录"
          )}
        </Button>
      </form>
    </Form>
  );
}