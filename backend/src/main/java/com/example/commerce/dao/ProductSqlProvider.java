package com.example.commerce.dao;

import org.apache.ibatis.builder.annotation.ProviderMethodResolver;
import org.apache.ibatis.jdbc.SQL;
import org.springframework.util.StringUtils;

import java.util.Map;

public class ProductSqlProvider implements ProviderMethodResolver {

    private static final String PRODUCTS_TABLE = "products p";
    private static final String USERS_TABLE = "users u";

    public String findAllProductsAdminFiltered(Map<String, Object> params) {
        String statusFilter = (String) params.get("statusFilter");

        return new SQL() {{
            SELECT("p.id, p.owner_id, p.name, p.category, p.description, p.status, " +
                   "p.created_at, p.updated_at, p.min_price, p.total_stock, p.default_image, " +
                   "u.username AS ownerUsername");
            FROM(PRODUCTS_TABLE);
            LEFT_OUTER_JOIN(USERS_TABLE + " ON p.owner_id = u.id");

            if (StringUtils.hasText(statusFilter)) {
                // 按指定状态过滤
                WHERE("p.status = #{statusFilter}");
            } else {
                // 默认排除 DELETED 状态
                WHERE("p.status != 'DELETED'");
            }
            ORDER_BY("p.created_at DESC");
        }}.toString();
    }
} 