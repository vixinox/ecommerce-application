package com.example.commerce.dao;

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

        return new SQL() {{
            SELECT("COUNT(DISTINCT o.id)");
            FROM(ORDERS_TABLE);
            INNER_JOIN(ORDER_ITEMS_TABLE + " ON o.id = oi.order_id");
            INNER_JOIN(PRODUCTS_TABLE + " ON oi.product_id = p.id");
            WHERE("p.owner_id = #{merchantId}");
        }}.toString();
    }

    /**
     * 构建计算商家总销售额的SQL
     */
    public String calculateTotalMerchantSales(Map<String, Object> params) {
        Long merchantId = (Long) params.get("merchantId");

        return new SQL() {{
            // 只计算该商家商品的销售额
            SELECT("SUM(oi.purchased_price * oi.quantity)");
            FROM(ORDER_ITEMS_TABLE);
            INNER_JOIN(PRODUCTS_TABLE + " ON oi.product_id = p.id");
            // 可以选择是否只计算特定状态订单的销售额，例如已完成或已发货+已完成
            // INNER_JOIN(ORDERS_TABLE + " ON oi.order_id = o.id");
            // WHERE("o.status IN ('已完成', '已发货')"); // 根据需要调整
            WHERE("p.owner_id = #{merchantId}");
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
}