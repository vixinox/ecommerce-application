package com.example.commerce.dao;

import com.example.commerce.dto.UserSearchDTO;
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

    public String findUsersByCriteria(Map<String, Object> params) {
        UserSearchDTO criteria = (UserSearchDTO) params.get("criteria");

        return new SQL() {{
            // 选择需要的字段，确保不选择密码
            SELECT("id, username, email, nickname, avatar, role, status, created_at, updated_at");
            FROM(USERS_TABLE + " u"); // 使用别名 u

            if (criteria.getUserId() != null) {
                WHERE("u.id = #{criteria.userId}");
            }
            if (StringUtils.hasText(criteria.getUsername())) {
                // 使用LOWER转换进行不区分大小写的模糊搜索
                WHERE("LOWER(u.username) LIKE LOWER(CONCAT('%', #{criteria.username}, '%'))");
            }
            if (StringUtils.hasText(criteria.getEmail())) {
                // 使用LOWER转换进行不区分大小写的模糊搜索
                WHERE("LOWER(u.email) LIKE LOWER(CONCAT('%', #{criteria.email}, '%'))");
            }
            if (StringUtils.hasText(criteria.getRole())) {
                WHERE("u.role = #{criteria.role}");
            }
            if (StringUtils.hasText(criteria.getStatus())) {
                WHERE("u.status = #{criteria.status}");
            } else {
            }
            // 添加注册日期范围条件
            if (criteria.getRegistrationDateStart() != null) {
                WHERE("DATE(u.created_at) >= #{criteria.registrationDateStart}");
                // 如果提供了开始日期但没有提供结束日期，则默认结束日期为当前日期
                if (criteria.getRegistrationDateEnd() == null) {
                    WHERE("DATE(u.created_at) <= CURRENT_DATE");
                }
            }
            if (criteria.getRegistrationDateEnd() != null) {

                WHERE("DATE(u.created_at) <= #{criteria.registrationDateEnd}");
            }

            ORDER_BY("u.username ASC"); // 默认按用户名升序排序
        }}.toString();
    }
} 