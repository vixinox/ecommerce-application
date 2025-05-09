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
                WHERE("status = #{statusFilter}");
            } else {
                WHERE("status != 'DELETED'");
            }
            ORDER_BY("username ASC");
        }}.toString();
    }



    public String findUsersByCriteria(Map<String, Object> params) {
        UserSearchDTO criteria = (UserSearchDTO) params.get("criteria");

        return new SQL() {{

            SELECT("id, username, email, nickname, avatar, role, status, created_at, updated_at");
            FROM(USERS_TABLE + " u");
            if (criteria.getUserId() != null) {
                WHERE("u.id = #{criteria.userId}");
            }
            if (StringUtils.hasText(criteria.getUsername())) {
                WHERE("LOWER(u.username) LIKE LOWER(CONCAT('%', #{criteria.username}, '%'))");
            }
            if (StringUtils.hasText(criteria.getEmail())) {
                WHERE("LOWER(u.email) LIKE LOWER(CONCAT('%', #{criteria.email}, '%'))");
            }
            if (StringUtils.hasText(criteria.getNickname())) {
                WHERE("LOWER(u.nickname) LIKE LOWER(CONCAT('%', #{criteria.nickname}, '%'))");
            }
            if (StringUtils.hasText(criteria.getRole())) {
                WHERE("u.role = #{criteria.role}");
            }
            if (StringUtils.hasText(criteria.getStatus())) {
                WHERE("u.status = #{criteria.status}");
            } else {
            }

            if (criteria.getRegistrationDateStart() != null) {
                WHERE("DATE(u.created_at) >= #{criteria.registrationDateStart}");
                if (criteria.getRegistrationDateEnd() == null) {
                    WHERE("DATE(u.created_at) <= CURRENT_DATE");
                }
            }
            if (criteria.getRegistrationDateEnd() != null) {
                WHERE("DATE(u.created_at) <= #{criteria.registrationDateEnd}");
            }
            ORDER_BY("u.username ASC");
        }}.toString();
    }
} 