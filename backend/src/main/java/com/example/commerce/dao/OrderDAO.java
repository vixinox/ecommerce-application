package com.example.commerce.dao;

import com.example.commerce.dto.AdminDashboardDTO;
import com.example.commerce.dto.OrderSearchDTO;
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
    Map<String, Object> getUserOrderSummary(@Param("userId") Long userId);

    /**
     * 获取用户按月消费趋势
     */
    List<SpendingReportDTO.TimeBasedSpend> getUserMonthlySpendTrend(@Param("userId") Long userId);


    /**
     * 获取用户按商品分类消费构成
     */
    List<SpendingReportDTO.CategorySpend> getUserCategorySpend(@Param("userId") Long userId);


    /**
     * 获取用户消费最多的商品/款式 (按消费金额，最多显示前10条)
     */
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

    /**
     * 更新订单状态为支付成功，并清除过期时间。
     * 此方法仅当订单当前状态为 PENDING_PAYMENT 时才会成功更新。
     * @param orderId 订单ID
     * @param newStatus 新状态 (通常是"已支付待发货"状态)
     * @return 更新的行数 (1表示成功，0表示失败)
     */
    @Update("UPDATE orders SET status = #{newStatus}, expires_at = NULL, updated_at = NOW() " +
            "WHERE id = #{orderId} AND status = 'PENDING_PAYMENT'")
    int updateOrderStatusAndClearExpiry(@Param("orderId") Long orderId, 
                                       @Param("newStatus") String newStatus);

    List<AdminDashboardDTO.RecentSaleDTO> getRecentSales(@Param("days") int days);

    List<AdminDashboardDTO.OrderStatusCountDTO> getOrderStatusCounts();

    /**
     * 根据动态条件搜索订单列表 (主要供管理员使用)
     * @param criteria 搜索条件
     * @return 订单列表
     */
    @SelectProvider(type = OrderSqlProvider.class, method = "searchOrdersByCriteria")
    @Results({
            @Result(property = "id", column = "o_id"), // 使用别名以防与join的表冲突
            @Result(property = "userId", column = "user_id"),
            @Result(property = "totalAmount", column = "total_amount"),
            @Result(property = "status", column = "o_status"), // 使用别名
            @Result(property = "createdAt", column = "o_created_at"), // 使用别名
            @Result(property = "updatedAt", column = "o_updated_at") // 使用别名
    })
    List<Order> searchOrdersByCriteria(@Param("criteria") OrderSearchDTO criteria);
    
    /**
     * 查找所有已过期但仍处于"待支付"状态的订单
     * 即当前时间已超过expires_at且status为PENDING_PAYMENT的订单
     * @return 过期未支付订单列表
     */
    @Select("SELECT * FROM orders WHERE status = 'PENDING_PAYMENT' AND expires_at < NOW()")
    @Results({
            @Result(property = "userId", column = "user_id"),
            @Result(property = "totalAmount", column = "total_amount"),
            @Result(property = "createdAt", column = "created_at"),
            @Result(property = "updatedAt", column = "updated_at"),
            @Result(property = "expiresAt", column = "expires_at")
    })
    List<Order> findExpiredPendingPaymentOrders();
    
    /**
     * 将订单状态更新为超时取消，并清除过期时间
     * 仅当订单当前状态为"待支付"时才会更新
     * @param orderId 订单ID
     * @param timeoutStatus 超时状态（通常为"超时取消"）
     * @return 更新的行数（1表示成功，0表示失败）
     */
    @Update("UPDATE orders SET status = #{timeoutStatus}, updated_at = NOW() " +
            "WHERE id = #{orderId} AND status = 'PENDING_PAYMENT'")
    int updateOrderStatusToTimeout(@Param("orderId") Long orderId, 
                                  @Param("timeoutStatus") String timeoutStatus);

    /**
     * 获取用户待支付的订单列表
     * @param userId 用户ID
     * @return 待支付订单列表
     */
    @Select("SELECT * FROM orders WHERE user_id = #{userId} AND status = 'PENDING_PAYMENT' ORDER BY created_at DESC")
    @Results({
            @Result(property = "userId", column = "user_id"),
            @Result(property = "totalAmount", column = "total_amount"),
            @Result(property = "createdAt", column = "created_at"),
            @Result(property = "updatedAt", column = "updated_at"),
            @Result(property = "expiresAt", column = "expires_at")
    })
    List<Order> getPendingPaymentOrdersByUserId(@Param("userId") Long userId);

    /**
     * 用户取消自己的订单
     * 只有当订单属于该用户并且状态是指定状态时才能更新
     * @param orderId 订单ID
     * @param userId 用户ID
     * @param currentStatus 当前状态
     * @param newStatus 新状态（通常是"已取消"）
     * @return 更新的行数（1表示成功，0表示失败）
     */
    @Update("UPDATE orders SET status = #{newStatus}, updated_at = NOW() " +
            "WHERE id = #{orderId} AND user_id = #{userId} AND status = #{currentStatus}")
    int updateOrderStatusByUser(@Param("orderId") Long orderId, 
                               @Param("userId") Long userId,
                               @Param("currentStatus") String currentStatus,
                               @Param("newStatus") String newStatus);
}