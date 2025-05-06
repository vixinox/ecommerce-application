package com.example.commerce.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserSearchDTO {
    private Long userId;
    private String username;    // 模糊搜索用户名
    private String email;       // 模糊搜索邮箱
    private String role;        // 精确匹配角色 (e.g., USER, ADMIN, MERCHANT)
    private String status;      // 精确匹配状态 (e.g., ACTIVE, INACTIVE, BANNED, DELETED)
    private java.time.LocalDate registrationDateStart; // 注册日期开始
    private java.time.LocalDate registrationDateEnd;   // 注册日期结束
    // 可以根据需要添加其他搜索字段，例如注册日期范围等
} 