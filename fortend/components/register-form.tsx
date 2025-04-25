"use client"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type { z } from "zod"


import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"



import { useDebouncedApiCheck } from "@/hooks/use-debouncedApiCheck" 
import { registrationSchema, sha256 } from "@/lib/auth"
import { API_URL } from "@/lib/api"


type RegistrationFormValues = z.infer<typeof registrationSchema>;


const DEBOUNCE_DELAY = 1000;


const getStatusColorClass = (status: 'available' | 'taken' | 'error') => {
  switch (status) {
    case 'available':
      return 'text-green-600 dark:text-green-400';
    case 'taken':
      return 'text-red-600 dark:text-red-400';
    case 'error':
      return 'text-yellow-600 dark:text-yellow-400';
    default:
      return '';
  }
};

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema), 
    defaultValues: {
      username: "",
      email: "",
      password: "",
      nickname: "",
    },
    mode: "onChange",
  });

  const watchedUsername = form.watch("username");
  const watchedEmail = form.watch("email");
  const { errors } = form.formState;

  const checkUsernameAvailability = useCallback(async (username: string): Promise<string> => {
    if (!username) return '';
    const response = await fetch(`${API_URL}/api/user/check/username?username=${username}`, {
      method: 'GET',
    });

    if (!response.ok) {
      let errorText: string;
      try {
        const errorBody = await response.json(); 
        errorText = errorBody.message || JSON.stringify(errorBody); 
      } catch (e) {
        errorText = await response.text(); 
      }
      throw new Error(errorText || '未知错误');
    }

    return await response.text(); 
  }, []); 

  const checkEmailAvailability = useCallback(async (email: string): Promise<string> => {
    
    if (!email) return '';

    const response = await fetch(`${API_URL}/api/user/check/email?email=${email}`, {
      method: 'GET',
    });

    if (!response.ok) {
      let errorText: string;
      try {
        const errorBody = await response.json(); 
        errorText = errorBody.message || JSON.stringify(errorBody); 
      } catch (e) {
        errorText = await response.text(); 
      }
      throw new Error(errorText || '未知错误');
    }

    return await response.text(); 
  }, []); 

  const usernameCheck = useDebouncedApiCheck(
    watchedUsername,
    checkUsernameAvailability,
    DEBOUNCE_DELAY,
    watchedUsername.length > 0 && !errors.username 
  );

  const emailCheck = useDebouncedApiCheck(
    watchedEmail,
    checkEmailAvailability,
    DEBOUNCE_DELAY,
    watchedEmail.length > 0 && !errors.email 
  );

  
  async function onSubmit(data: RegistrationFormValues) {
    setIsLoading(true);
    try {
      if (usernameCheck.status === 'taken' || emailCheck.status === 'taken') {
        toast.error("提交失败", { description: "用户名或邮箱已被占用，请修改。" });
        setIsLoading(false);
        return;
      }
      if (usernameCheck.status === 'error' || emailCheck.status === 'error') {
        toast.error("提交失败", { description: "可用性检查出错，请稍后再试或检查输入。" });
        setIsLoading(false);
        return;
      }
      if (Object.keys(errors).length > 0) {
        toast.error("提交失败", { description: "请检查表单输入是否存在错误。" });
        setIsLoading(false);
        return;
      }
      
      const hashedPassword = await sha256(data.password);

      const response = await fetch(`${API_URL}/api/user/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({...data, password: hashedPassword}),
      });

      if (response.ok) {
        toast.success("注册成功", {
          action: {
            label: "前往登录",
            onClick: () => router.push("/auth/login"),
          },
          description: "您已成功注册账户。",
        });

      } else {
        let errorMessage: string;
        try {
          const errorBody = await response.json(); 
          errorMessage = errorBody.message || JSON.stringify(errorBody);
        } catch (e) {
          errorMessage = await response.text(); 
        }
        toast.error("注册失败", { description: errorMessage || '服务器未知错误' });
      }
    } catch (error) {
      toast.error("发生异常", { description: error instanceof Error ? error.message : "发生未知错误" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>用户名</FormLabel>
              <FormControl>
                <Input placeholder="请填写用户名" {...field} />
              </FormControl>
              <FormMessage />

              {watchedUsername.length > 0 && !errors.username && usernameCheck.status !== 'idle' && (
                usernameCheck.status === 'loading' ? (
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Loader2 className="h-4 w-4 animate-spin" /> 检查中...
                  </p>
                ) : (
                  
                  <p className={`text-sm ${getStatusColorClass(usernameCheck.status)}`}>
                    {usernameCheck.message}
                  </p>
                )
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>邮箱</FormLabel>
              <FormControl>
                <Input placeholder="email@example.com" {...field} />
              </FormControl>
              <FormMessage />
              {watchedEmail.length > 0 && !errors.email && emailCheck.status !== 'idle' && (
                emailCheck.status === 'loading' ? (
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Loader2 className="h-4 w-4 animate-spin" /> 检查中...
                  </p>
                ) : (
                  <p className={`text-sm ${getStatusColorClass(emailCheck.status)}`}>
                    {emailCheck.message}
                  </p>
                )
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>密码</FormLabel>
              <FormControl>
                <Input type="password" placeholder="请输入密码" {...field} />
              </FormControl>
              <FormDescription>
                至少 6 个字符
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nickname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>昵称 (可选)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={
            isLoading ||
            usernameCheck.status === 'loading' ||
            emailCheck.status === 'loading' ||
            usernameCheck.status === 'taken' ||
            emailCheck.status === 'taken' ||
            usernameCheck.status === 'error' || 
            emailCheck.status === 'error' ||    
            Object.keys(errors).length > 0      
          }
        >
          {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                注册中...
              </>
            ): "注册"}
        </Button>
      </form>
    </Form>
  );
}
