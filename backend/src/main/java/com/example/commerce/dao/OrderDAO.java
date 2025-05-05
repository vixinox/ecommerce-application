package com.example.commerce.dao;

import com.example.commerce.dto.AdminDashboardDTO;
import com.example.commerce.dto.SpendingReportDTO;
import com.example.commerce.model.Order;
import com.example.commerce.model.OrderItem;
import org.apache.ibatis.annotations.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Mapper
public interface OrderDAO {
    int createOrder(Order order);

    int createOrderItems(@Param("list") List<OrderItem> orderItems);

    @Results({
            @Result(property = "userId", column = "user_id"),
            @Result(property = "totalAmount", column = "total_amount"),
            @Result(property = "createdAt", column = "created_at"),
            @Result(property = "updatedAt", column = "updated_at")
    })
    @Select("SELECT * FROM orders WHERE user_id = #{userId}")
    List<Order> getOrdersByUserId(@Param("userId") Long userId);

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
            "ORDER BY period ")
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
     * 获取用户消费最多的商品/款式 (按消费金额，最多显示前10条)
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

    /**
     * 查询与指定商家相关的订单ID列表 (分页)
     * 注意: 这里只查询订单ID，是为了方便后续加载订单详情和订单项，避免在分页查询中进行过多JOIN。
     * @param merchantId 商家用户ID
     * @param status 订单状态过滤 (可选)
     * @return 相关订单ID列表
     */
    @SelectProvider(type = OrderSqlProvider.class, method = "getMerchantOrderIds")
    List<Long> getMerchantOrderIds(@Param("merchantId") Long merchantId, @Param("status") String status);


    /**
     * 根据订单ID列表查询订单基本信息
     * @param orderIds 订单ID列表
     * @return 订单列表
     */
    @SelectProvider(type = OrderSqlProvider.class, method = "getOrdersByIds")
    @Results({
            @Result(property = "userId", column = "user_id"),
            @Result(property = "totalAmount", column = "total_amount"),
            @Result(property = "createdAt", column = "created_at"),
            @Result(property = "updatedAt", column = "updated_at")
            // 可以补充其他需要的字段映射
    })
    List<Order> getOrdersByIds(@Param("orderIds") List<Long> orderIds);


    /**
     * 根据订单ID列表和商家ID查询相关的订单项
     * @param orderIds 订单ID列表
     * @param merchantId 商家用户ID
     * @return 相关订单项列表
     */
    @SelectProvider(type = OrderSqlProvider.class, method = "getMerchantOrderItems")
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
    List<OrderItem> getMerchantOrderItems(@Param("orderIds") List<Long> orderIds, @Param("merchantId") Long merchantId);

    /**
     * 根据订单ID查询订单基本信息
     * @param orderId 订单ID
     * @return 订单对象，如果不存在则返回null
     */
    @Select("SELECT * FROM orders WHERE id = #{orderId}")
    @Results({
            @Result(property = "userId", column = "user_id"),
            @Result(property = "totalAmount", column = "total_amount"),
            @Result(property = "createdAt", column = "created_at"),
            @Result(property = "updatedAt", column = "updated_at")
    })
    Order getOrderById(@Param("orderId") Long orderId);


    /**
     * 更新订单状态
     * @param orderId 订单ID
     * @param status 新状态
     * @param merchantId 商家ID (用于校验权限，确保只有该商家相关的订单才能被更新)
     * @return 更新的行数 (如果订单不属于该商家或不存在，则返回0)
     */
     @UpdateProvider(type = OrderSqlProvider.class, method = "updateOrderStatusByMerchant")
     int updateOrderStatusByMerchant(@Param("orderId") Long orderId, @Param("status") String status, @Param("merchantId") Long merchantId);

    // --- 新增商家仪表盘统计方法 ---

    /**
     * 统计商家特定状态的订单数量
     * @param merchantId 商家ID
     * @param status 订单状态
     * @return 订单数量
     */
    @SelectProvider(type = OrderSqlProvider.class, method = "countMerchantOrdersByStatus")
    Long countMerchantOrdersByStatus(@Param("merchantId") Long merchantId, @Param("status") String status);

    /**
     * 统计商家总订单数量 (指包含该商家商品的订单数量，不去重)
     * @param merchantId 商家ID
     * @return 订单ID数量 (去重后)
     */
    @SelectProvider(type = OrderSqlProvider.class, method = "countTotalMerchantOrders")
    Long countTotalMerchantOrders(@Param("merchantId") Long merchantId);

    /**
     * 计算商家的总销售额 (仅计算该商家商品的销售额)
     * @param merchantId 商家ID
     * @return 总销售额，如果没有则返回 null 或 0
     */
    @SelectProvider(type = OrderSqlProvider.class, method = "calculateTotalMerchantSales")
    BigDecimal calculateTotalMerchantSales(@Param("merchantId") Long merchantId);

    List<Order> findAllOrdersAdmin(@Param("statusFilter") String statusFilter);

    @UpdateProvider(type = OrderSqlProvider.class, method = "updateOrderStatusAdmin")
    int updateOrderStatusAdmin(@Param("orderId") Long orderId, @Param("status") String status);

    @Select("SELECT COUNT(*) FROM orders")
    Long countTotalOrders();

    @Select("SELECT COUNT(*) FROM orders WHERE status = #{status}")
    Long countOrdersByStatus(@Param("status") String status);

    @Select("SELECT SUM(total_amount) FROM orders")
    BigDecimal calculateTotalRevenue();

    List<AdminDashboardDTO.RecentSaleDTO> getRecentSales(@Param("days") int days);

    List<AdminDashboardDTO.OrderStatusCountDTO> getOrderStatusCounts();
}