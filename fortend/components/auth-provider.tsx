"use client";

import { createContext, type ReactNode, useContext, useEffect, useState, } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";

interface StoredUser {
  username: string;
  nickname: string;
  email: string;
  avatar: string;
  role: string;
}

interface AuthContextType {
  user: StoredUser | null;
  token: string | null;
  isLoading: boolean;
  login: (userData: StoredUser, token: string, needToast?: boolean) => void;
  logout: (toastInfo?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth 必须在 AuthProvider 中使用");
  }
  return context;
}

export function AuthProvider({children}: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkLogin = async () => {
      let storedUser: StoredUser | null = null;
      let storedToken: string | null = null;
      const storedUserStr = localStorage.getItem("user");
      const storedTokenStr = localStorage.getItem("token");

      if (storedUserStr) {
        try {
          storedUser = JSON.parse(storedUserStr);
        } catch (e) {
          console.error("无法解析本地存储的用户信息:", e);
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          storedUser = null;
        }
      }

      if (storedTokenStr) {
        storedToken = storedTokenStr;
      }

      if (storedUser && storedToken) {
        try {
          const res = await fetch(`${API_URL}/api/user/info`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${storedToken}`,
              "Content-Type": "application/json",
            },
          });
          if (res.ok) {
            const data = await res.json();
            login(data, storedToken, false);
          } else {
            console.warn("Token验证失败，清除认证信息。状态码:", res.status);
            setUser(null);
            setToken(null);
            localStorage.removeItem("user");
            localStorage.removeItem("token");
          }
        } catch (error) {
          console.error("用户信息验证请求出错:", error);
          setUser(null);
          setToken(null);
          localStorage.removeItem("user");
          localStorage.removeItem("token");
        }
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
      setIsLoading(false);
    };

    checkLogin();
  }, []);

  const login = (
    userData: StoredUser,
    token: string,
    needToast: boolean = true
  ) => {
    setUser(userData);
    setToken(token);
    console.log("用户已登录:", userData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);

    if (needToast) {
      toast.success(`欢迎回来，${userData.nickname || userData.username}！`);
    }
  };

  const logout = (toastInfo: string = "已退出登录") => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    toast.success(toastInfo);
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{user, token, isLoading, login, logout}}>
      {children}
    </AuthContext.Provider>
  );
}