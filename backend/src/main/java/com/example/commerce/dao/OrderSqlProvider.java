package com.example.commerce.dao;

import com.example.commerce.dto.OrderSearchDTO;
import org.apache.ibatis.builder.annotation.ProviderMethodResolver;
import org.apache.ibatis.jdbc.SQL;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;

public class OrderSqlProvider implements ProviderMethodResolver {

    private static final String ORDERS_TABLE = "orders o";
    private static final String ORDER_ITEMS_TABLE = "order_items oi";
    private static final String PRODUCTS_TABLE = "products p";

    /**
     * 构建查询商家相关订单ID的SQL (支持状态过滤和分页 - 分页由PageHelper处理)
     */
    public String getMerchantOrderIds(Map<String, Object> params) {
        Long merchantId = (Long) params.get("merchantId");
        String status = (String) params.get("status");

        return new SQL() {{
            SELECT_DISTINCT("o.id");
            FROM(ORDERS_TABLE);
            INNER_JOIN(ORDER_ITEMS_TABLE + " ON o.id = oi.order_id");
            INNER_JOIN(PRODUCTS_TABLE + " ON oi.product_id = p.id");
            WHERE("p.owner_id = #{merchantId}");
            if (StringUtils.hasText(status)) {
                WHERE("o.status = #{status}");
            }
            ORDER_BY("o.created_at DESC"); // 默认按创建时间降序
        }}.toString();
    }

    /**
     * 构建根据订单ID列表查询订单基本信息的SQL
     */
    public String getOrdersByIds(Map<String, Object> params) {
        @SuppressWarnings("unchecked")
        List<Long> orderIds = (List<Long>) params.get("orderIds");

        return new SQL() {{
            SELECT("o.id, o.user_id, o.total_amount, o.status, o.created_at, o.updated_at"); // 选择需要的字段
            FROM(ORDERS_TABLE);
            WHERE("o.id IN (" + buildInClause(orderIds) + ")");
            ORDER_BY("o.created_at DESC"); // 与 getMerchantOrderIds 保持一致或根据需要调整
        }}.toString();
    }

    /**
     * 构建查询商家相关订单项的SQL
     */
    public String getMerchantOrderItems(Map<String, Object> params) {
        @SuppressWarnings("unchecked")
        List<Long> orderIds = (List<Long>) params.get("orderIds");
        Long merchantId = (Long) params.get("merchantId");

        return new SQL() {{
            SELECT("oi.*, p.owner_id"); // 选择所有订单项字段，并包含owner_id用于验证
            FROM(ORDER_ITEMS_TABLE);
            INNER_JOIN(PRODUCTS_TABLE + " ON oi.product_id = p.id");
            WHERE("oi.order_id IN (" + buildInClause(orderIds) + ")");
            WHERE("p.owner_id = #{merchantId}");
        }}.toString();
    }

     /**
      * 构建商家更新订单状态的SQL (包含权限检查)
      */
     public String updateOrderStatusByMerchant(Map<String, Object> params) {
        Long orderId = (Long) params.get("orderId");
        String status = (String) params.get("status");
        Long merchantId = (Long) params.get("merchantId");

        return new SQL() {{
            UPDATE(ORDERS_TABLE.split(" ")[0]); // UPDATE orders ...
            SET("status = #{status}");
            SET("updated_at = NOW()");
            WHERE("id = #{orderId}");
            // 关键：确保这个订单至少包含一个该商家的商品
            WHERE("EXISTS (" +
                  "SELECT 1 FROM " + ORDER_ITEMS_TABLE + " " +
                  "JOIN " + PRODUCTS_TABLE + " ON oi.product_id = p.id " +
                  "WHERE oi.order_id = #{orderId} AND p.owner_id = #{merchantId}" +
                  ")");
        }}.toString();
    }

    // 辅助方法：构建 IN (...) 子句，防止SQL注入 (虽然MyBatis参数绑定通常能处理)
    private String buildInClause(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            // 或者可以抛出异常，或者返回一个永远为假的条件，例如 '-1'
            return "-1";
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < ids.size(); i++) {
            sb.append(ids.get(i)); // 直接拼接ID，假设ID是安全的Long类型
            if (i < ids.size() - 1) {
                sb.append(",");
            }
        }
        return sb.toString();
    }

    // --- 新增商家仪表盘统计 SQL 构建方法 ---

    /**
     * 构建统计商家特定状态订单数量的SQL
     */
    public String countMerchantOrdersByStatus(Map<String, Object> params) {
        Long merchantId = (Long) params.get("merchantId");
        String status = (String) params.get("status");

        return new SQL() {{
            // SELECT COUNT(DISTINCT o.id) 避免一个订单含多个该商家商品时重复计数
            SELECT("COUNT(DISTINCT o.id)");
            FROM(ORDERS_TABLE);
            INNER_JOIN(ORDER_ITEMS_TABLE + " ON o.id = oi.order_id");
            INNER_JOIN(PRODUCTS_TABLE + " ON oi.product_id = p.id");
            WHERE("p.owner_id = #{merchantId}");
            WHERE("o.status = #{status}");
        }}.toString();
    }

    /**
     * 构建统计商家总订单数量的SQL (去重后的订单数)
     */
    public String countTotalMerchantOrders(Map<String, Object> params) {
        Long merchantId = (Long) params.get("merchantId");

        // Valid statuses for counting total merchant orders
        String validStatusesClause = "o.status IN ('PENDING', 'SHIPPED', 'COMPLETED')";

        return new SQL() {{
            SELECT("COUNT(DISTINCT o.id)");
            FROM(ORDERS_TABLE); // Alias o is applied by default by convention in other methods
            INNER_JOIN(ORDER_ITEMS_TABLE + " ON o.id = oi.order_id");
            INNER_JOIN(PRODUCTS_TABLE + " ON oi.product_id = p.id");
            WHERE("p.owner_id = #{merchantId}");
            WHERE(validStatusesClause); // Filter by valid statuses
        }}.toString();
    }

    /**
     * 构建计算商家总销售额的SQL
     */
    public String calculateTotalMerchantSales(Map<String, Object> params) {
        Long merchantId = (Long) params.get("merchantId");

        // Valid statuses for calculating sales
        String validStatusesClause = "o.status IN ('PENDING', 'SHIPPED', 'COMPLETED')";

        return new SQL() {{
            SELECT("SUM(oi.purchased_price * oi.quantity)");
            FROM(ORDER_ITEMS_TABLE);
            INNER_JOIN(PRODUCTS_TABLE + " ON oi.product_id = p.id");
            INNER_JOIN(ORDERS_TABLE + " ON oi.order_id = o.id"); // Ensure join with orders table
            WHERE("p.owner_id = #{merchantId}");
            WHERE(validStatusesClause); // Filter by valid statuses for sales calculation
        }}.toString();
    }

    /**
     * 构建管理员查询所有订单的SQL (支持状态过滤)
     */
    public String findAllOrdersAdmin(Map<String, Object> params) {
        String statusFilter = (String) params.get("statusFilter");

        return new SQL() {{
            SELECT("o.id, o.user_id, o.total_amount, o.status, o.created_at, o.updated_at");
            // 可以考虑 JOIN users 表获取购买者用户名: LEFT JOIN users u ON o.user_id = u.id
            // 然后在 SELECT 中添加 u.username AS buyerUsername
            FROM(ORDERS_TABLE);
            if (StringUtils.hasText(statusFilter)) {
                WHERE("o.status = #{statusFilter}");
            }
            ORDER_BY("o.created_at DESC"); // 按创建时间降序
        }}.toString();
    }

    /**
     * 构建管理员更新订单状态的SQL
     */
    public String updateOrderStatusAdmin(Map<String, Object> params) {
        Long orderId = (Long) params.get("orderId");
        String status = (String) params.get("status");

        return new SQL() {{
            UPDATE(ORDERS_TABLE.split(" ")[0]); // UPDATE orders ...
            SET("status = #{status}");
            SET("updated_at = NOW()");
            WHERE("id = #{orderId}");
        }}.toString();
    }

    /**
     * 构建根据动态条件搜索订单的SQL (主要供管理员使用)
     * 注意：此方法将构建一个复杂的SQL，包含多个可选的JOIN和WHERE条件。
     */
    public String searchOrdersByCriteria(Map<String, Object> params) {
        OrderSearchDTO criteria = (OrderSearchDTO) params.get("criteria");

        return new SQL() {{
            SELECT_DISTINCT("o.id as o_id, o.user_id, o.total_amount, o.status as o_status, o.created_at as o_created_at, o.updated_at as o_updated_at");
            // 如果需要显示用户名等，可以在这里添加更多字段，并确保JOIN了相应的表
            // 例如: , u.username as buyer_username
            FROM(ORDERS_TABLE); // 使用别名 o

            // 条件JOIN：只有当需要按用户名或商品名搜索时才JOIN
            boolean joinUsers = StringUtils.hasText(criteria.getUsername());
            boolean joinOrderItemsAndProducts = StringUtils.hasText(criteria.getProductName());

            if (joinUsers) {
                LEFT_OUTER_JOIN("users u ON o.user_id = u.id");
            }
            if (joinOrderItemsAndProducts) {
                // 使用 LEFT JOIN 以确保即使某些订单没有匹配的商品名（理论上不应发生），订单本身仍能被查询到（如果其他条件满足）
                LEFT_OUTER_JOIN(ORDER_ITEMS_TABLE + " ON o.id = oi.order_id");
                LEFT_OUTER_JOIN(PRODUCTS_TABLE + " ON oi.product_id = p.id");
            }

            // 构建WHERE子句
            if (criteria.getOrderId() != null) {
                WHERE("o.id = #{criteria.orderId}");
            }
            if (criteria.getUserId() != null) {
                WHERE("o.user_id = #{criteria.userId}");
            }
            if (StringUtils.hasText(criteria.getStatus())) {
                WHERE("o.status = #{criteria.status}");
            }
            if (criteria.getDateFrom() != null) {
                // 注意：数据库日期比较的格式，这里假设数据库字段是DATETIME或TIMESTAMP类型
                // MyBatis 会自动处理 LocalDate 到数据库兼容类型的转换
                WHERE("o.created_at >= #{criteria.dateFrom}");
            }
            if (criteria.getDateTo() != null) {
                // 对于 dateTo，通常我们希望包含当天，所以可以设置为 dateTo + 1 天 或 在SQL中使用 '<' dateTo.plusDays(1)
                // 或者确保数据库查询时，如果dateTo是 '2023-10-26'，则条件是 <= '2023-10-26 23:59:59.999'
                // 使用Java端处理：params.put("dateToFormatted", criteria.getDateTo().plusDays(1));
                // WHERE("o.created_at < #{dateToFormatted}");
                // 或者直接使用 <= ，依赖数据库对 DATE 类型的处理
                WHERE("DATE(o.created_at) <= #{criteria.dateTo}");
            }
            if (joinUsers && StringUtils.hasText(criteria.getUsername())) {
                // 使用LOWER转换进行不区分大小写的模糊搜索
                WHERE("LOWER(u.username) LIKE LOWER(CONCAT('%', #{criteria.username}, '%'))");
            }
            if (joinOrderItemsAndProducts && StringUtils.hasText(criteria.getProductName())) {
                // 使用LOWER转换进行不区分大小写的模糊搜索
                // 注意：snapshot_product_name 存在于 order_items 表
                WHERE("LOWER(oi.snapshot_product_name) LIKE LOWER(CONCAT('%', #{criteria.productName}, '%'))");
            }

            ORDER_BY("o.created_at DESC"); // 默认按创建时间降序
        }}.toString();
    }
}