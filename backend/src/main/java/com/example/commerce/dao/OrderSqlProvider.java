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
    private static final String SQL_ORDER_STATUS_PENDING_PAYMENT = "PENDING_PAYMENT";

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

            WHERE("o.status != '" + SQL_ORDER_STATUS_PENDING_PAYMENT + "'");
            if (StringUtils.hasText(status)) {
                WHERE("o.status = #{status}");
            }
            ORDER_BY("o.created_at DESC"); 
        }}.toString();
    }

    /**
     * 构建根据订单ID列表查询订单基本信息的SQL
     */
    public String getOrdersByIds(Map<String, Object> params) {
        @SuppressWarnings("unchecked")
        List<Long> orderIds = (List<Long>) params.get("orderIds");

        return new SQL() {{
            SELECT("o.id, o.user_id, o.total_amount, o.status, o.created_at, o.updated_at");
            FROM(ORDERS_TABLE);
            WHERE("o.id IN (" + buildInClause(orderIds) + ")");
            ORDER_BY("o.created_at DESC");
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
            SELECT("oi.*, p.owner_id");
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
            UPDATE(ORDERS_TABLE.split(" ")[0]);
            SET("status = #{status}");
            SET("updated_at = NOW()");
            WHERE("id = #{orderId}");

            WHERE("EXISTS (" +
                  "SELECT 1 FROM " + ORDER_ITEMS_TABLE + " " +
                  "JOIN " + PRODUCTS_TABLE + " ON oi.product_id = p.id " +
                  "WHERE oi.order_id = #{orderId} AND p.owner_id = #{merchantId}" +
                  ")");
        }}.toString();
    }


    private String buildInClause(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return "-1";
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < ids.size(); i++) {
            sb.append(ids.get(i));
            if (i < ids.size() - 1) {
                sb.append(",");
            }
        }
        return sb.toString();
    }



    /**
     * 构建统计商家特定状态订单数量的SQL
     */
    public String countMerchantOrdersByStatus(Map<String, Object> params) {
        Long merchantId = (Long) params.get("merchantId");
        String status = (String) params.get("status");
        return new SQL() {{

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
        String validStatusesClause = "o.status IN ('PENDING', 'SHIPPED', 'COMPLETED')";
        return new SQL() {{
            SELECT("COUNT(DISTINCT o.id)");
            FROM(ORDERS_TABLE);
            INNER_JOIN(ORDER_ITEMS_TABLE + " ON o.id = oi.order_id");
            INNER_JOIN(PRODUCTS_TABLE + " ON oi.product_id = p.id");
            WHERE("p.owner_id = #{merchantId}");
            WHERE(validStatusesClause);
        }}.toString();
    }

    /**
     * 构建计算商家总销售额的SQL
     */
    public String calculateTotalMerchantSales(Map<String, Object> params) {
        Long merchantId = (Long) params.get("merchantId");
        String validStatusesClause = "o.status IN ('PENDING', 'SHIPPED', 'COMPLETED')";
        return new SQL() {{
            SELECT("SUM(oi.purchased_price * oi.quantity)");
            FROM(ORDER_ITEMS_TABLE);
            INNER_JOIN(PRODUCTS_TABLE + " ON oi.product_id = p.id");
            INNER_JOIN(ORDERS_TABLE + " ON oi.order_id = o.id");
            WHERE("p.owner_id = #{merchantId}");
            WHERE(validStatusesClause);
        }}.toString();
    }

    /**
     * 构建管理员查询所有订单的SQL (支持状态过滤)
     */
    public String findAllOrdersAdmin(Map<String, Object> params) {
        String statusFilter = (String) params.get("statusFilter");
        return new SQL() {{
            SELECT("o.id, o.user_id, o.total_amount, o.status, o.created_at, o.updated_at");
            FROM(ORDERS_TABLE);
            if (StringUtils.hasText(statusFilter)) {
                WHERE("o.status = #{statusFilter}");
            }
            ORDER_BY("o.created_at DESC");
        }}.toString();
    }

    /**
     * 构建管理员更新订单状态的SQL
     */
    public String updateOrderStatusAdmin(Map<String, Object> params) {
        Long orderId = (Long) params.get("orderId");
        String status = (String) params.get("status");

        return new SQL() {{
            UPDATE(ORDERS_TABLE.split(" ")[0]);
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


            FROM(ORDERS_TABLE);


            boolean joinUsers = StringUtils.hasText(criteria.getUsername());
            boolean joinOrderItemsAndProducts = StringUtils.hasText(criteria.getProductName());

            if (joinUsers) {
                LEFT_OUTER_JOIN("users u ON o.user_id = u.id");
            }
            if (joinOrderItemsAndProducts) {
                LEFT_OUTER_JOIN(ORDER_ITEMS_TABLE + " ON o.id = oi.order_id");
                LEFT_OUTER_JOIN(PRODUCTS_TABLE + " ON oi.product_id = p.id");
            }
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
                WHERE("o.created_at >= #{criteria.dateFrom}");
            }
            if (criteria.getDateTo() != null) {
                WHERE("DATE(o.created_at) <= #{criteria.dateTo}");
            }
            if (joinUsers && StringUtils.hasText(criteria.getUsername())) {
                WHERE("LOWER(u.username) LIKE LOWER(CONCAT('%', #{criteria.username}, '%'))");
            }
            if (joinOrderItemsAndProducts && StringUtils.hasText(criteria.getProductName())) {
                WHERE("LOWER(oi.snapshot_product_name) LIKE LOWER(CONCAT('%', #{criteria.productName}, '%'))");
            }

            ORDER_BY("o.created_at DESC");
        }}.toString();
    }
}