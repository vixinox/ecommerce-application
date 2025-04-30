package com.example.commerce.dao;

import org.apache.ibatis.builder.annotation.ProviderMethodResolver;
import org.apache.ibatis.jdbc.SQL;
import org.springframework.util.StringUtils;

import java.util.Map;

public class UserSqlProvider implements ProviderMethodResolver {

    private static final String USERS_TABLE = "users";

    public String findAllUsersFiltered(Map<String, Object> params) {
        String statusFilter = (String) params.get("statusFilter");

        return new SQL() {{
            SELECT("id, username, email, nickname, avatar, role, status");
            FROM(USERS_TABLE);
            if (StringUtils.hasText(statusFilter)) {
                // 按指定状态过滤
                WHERE("status = #{statusFilter}");
            } else {
                // 默认排除 DELETED 状态
                WHERE("status != 'DELETED'");
            }
            ORDER_BY("username ASC"); // 按用户名排序
        }}.toString();
    }

    // 可以将 OrderSqlProvider 中的类似方法移到这里或创建一个通用的 SQL Provider
} 