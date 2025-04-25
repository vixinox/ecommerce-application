import { z } from "zod"

export const userSchema = z.object({
  username: z.string().min(1, "请输入用户名").max(20, "用户名不能超过 20 个字符").regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
  email: z.string().email("请输入有效的电子邮件地址"),
  password: z.string().min(6, "密码至少包含 6 个字符"),
  nickname: z.string().max(30, "昵称不能超过 30 个字符").optional(),
})

export const loginSchema = z.object({
  email: z.string().email("请输入有效的电子邮件地址"),
  password: z.string().min(1, "请输入密码"),
})

export const registrationSchema = userSchema
z.object({
  email: z.string().email("请输入有效的电子邮件地址"),
});

z.object({
  password: userSchema.shape.password,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次密码不匹配",
  path: ["confirmPassword"],
});

export type User = z.infer<typeof userSchema>

export async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("");
}
