package com.example.commerce.dao;

import com.example.commerce.dto.SpendingReportDTO;
import com.example.commerce.model.Order;
import com.example.commerce.model.OrderItem;
import org.apache.ibatis.annotations.*;

import java.util.List;
import java.util.Map;

@Mapper
public interface OrderDAO {
    @Insert("INSERT INTO orders (user_id, total_amount, status, created_at, updated_at) " +
            "VALUES (#{userId}, #{totalAmount}, #{status}, NOW(), NOW())")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int createOrder(Order order);

    @Insert({
            "<script>",
            "INSERT INTO order_items (order_id, product_id, product_variant_id, quantity, purchased_price, snapshot_product_name, snapshot_variant_color, snapshot_variant_size, snapshot_variant_image, created_at, updated_at) VALUES",
            "<foreach collection='list' item='item' separator=','>",
            "(#{item.orderId}, #{item.productId}, #{item.productVariantId}, #{item.quantity}, #{item.purchasedPrice}, #{item.snapshotProductName}, #{item.snapshotVariantColor}, #{item.snapshotVariantSize}, #{item.snapshotVariantImage}, NOW(), NOW())",
            "</foreach>",
            "</script>"
    })
    int createOrderItems(@Param("list") List<OrderItem> orderItems);

    @Results({
            @Result(property = "userId", column = "user_id"),
            @Result(property = "totalAmount", column = "total_amount"),
            @Result(property = "createdAt", column = "created_at"),
            @Result(property = "updatedAt", column = "updated_at")
    })
    @Select("SELECT * FROM orders WHERE user_id = #{userId}")
    List<Order> getOrdersByUserId(@Param("userId") Long userId);

    @Results({
            @Result(property = "orderId", column = "order_id"),
            @Result(property = "productId", column = "product_id"),
            @Result(property = "productVariantId", column = "product_variant_id"),
            @Result(property = "purchasedPrice", column = "purchased_price"),
            @Result(property = "snapshotProductName", column = "snapshot_product_name"),
            @Result(property = "snapshotVariantColor", column = "snapshot_variant_color"),
            @Result(property = "snapshotVariantSize", column = "snapshot_variant_size"),
            @Result(property = "snapshotVariantImage", column = "snapshot_variant_image"),
            @Result(property = "createdAt", column = "created_at"),
            @Result(property = "updatedAt", column = "updated_at")
    })
    @Select({
            "<script>",
            "SELECT * FROM order_items",
            "WHERE order_id IN",
            "<foreach collection='orderIds' item='orderId' open='(' separator=',' close=')'>",
            "#{orderId}",
            "</foreach>",
            "</script>"
    })
    List<OrderItem> getOrderItemsByOrderIds(@Param("orderIds") List<Long> orderIds);

    /**
     * 获取用户订单汇总数据 (总消费、总订单数、平均单笔金额)
     */
    @Select("SELECT " +
            "   SUM(total_amount) AS totalSpend, " +
            "   COUNT(id) AS totalOrders, " +
            "   AVG(total_amount) AS averageOrderValue " +
            "FROM orders " +
            "WHERE user_id = #{userId}")
    Map<String, Object> getUserOrderSummary(@Param("userId") Long userId);

    /**
     * 获取用户按月消费趋势
     */
    @Select("SELECT " +
            "   DATE_FORMAT(created_at, '%Y-%m') AS period, " +
            "   SUM(total_amount) AS amount " +
            "FROM orders " +
            "WHERE user_id = #{userId} " +
            "GROUP BY period " +
            "ORDER BY period ASC")
    List<SpendingReportDTO.TimeBasedSpend> getUserMonthlySpendTrend(@Param("userId") Long userId);


    /**
     * 获取用户按商品分类消费构成
     */
    @Select("SELECT " +
            "   COALESCE(p.category, '未知分类') AS category, " +
            "   SUM(oi.purchased_price * oi.quantity) AS amount " +
            "FROM order_items oi " +
            "JOIN orders o ON oi.order_id = o.id " +
            "LEFT JOIN products p ON oi.product_id = p.id " +
            "WHERE o.user_id = #{userId} " +
            "GROUP BY COALESCE(p.category, '未知分类') " +
            "ORDER BY amount DESC")
    List<SpendingReportDTO.CategorySpend> getUserCategorySpend(@Param("userId") Long userId);


    /**
     * 获取用户消费最多的商品/变体 (按消费金额，最多显示前10条)
     */
    @Select("SELECT " +
            "   oi.snapshot_product_name AS name, " +
            "   CONCAT(" +
            "       COALESCE(oi.snapshot_variant_color, ''), " +
            "       CASE WHEN oi.snapshot_variant_color IS NOT NULL AND oi.snapshot_variant_size IS NOT NULL THEN '/' ELSE '' END, " + // 如果颜色和尺寸都非NULL，添加分隔符'/'
            "       COALESCE(oi.snapshot_variant_size, '')" +
            "   ) AS variant, " +
            "   SUM(oi.purchased_price * oi.quantity) AS spend, " +
            "   SUM(oi.quantity) AS quantity " +
            "FROM order_items oi " +
            "JOIN orders o ON oi.order_id = o.id " +
            "WHERE o.user_id = #{userId} " +
            "GROUP BY oi.snapshot_product_name, oi.snapshot_variant_color, oi.snapshot_variant_size " +
            "ORDER BY spend DESC, quantity DESC " +
            "LIMIT 10")
    List<SpendingReportDTO.ItemSpend> getUserTopItemSpend(@Param("userId") Long userId);
}