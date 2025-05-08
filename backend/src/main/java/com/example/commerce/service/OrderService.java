package com.example.commerce.service;

import com.example.commerce.dto.CartItemDTO;
import com.example.commerce.dto.OrderDTO;
import com.example.commerce.dto.OrderSearchDTO;
import com.example.commerce.dto.SpendingReportDTO;
import com.example.commerce.model.User;
import com.github.pagehelper.PageInfo;

import java.math.BigDecimal;
import java.util.List;

public interface OrderService {
    List<Long> createOrder(User user, List<CartItemDTO> items);

    List<OrderDTO> getOrder(User user);

    SpendingReportDTO getSpendingReport(User user);

    /**
     * 获取商家的订单列表 (分页)
     * @param merchant 商家用户对象
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @param status 状态过滤 (可选)
     * @return 包含商家订单信息的 PageInfo 对象
     */
    PageInfo<OrderDTO> getMerchantOrders(User merchant, int pageNum, int pageSize, String status);

    /**
     * 获取商家视角的单个订单详情
     * @param merchant 商家用户对象
     * @param orderId 订单ID
     * @return 订单详情 DTO，如果订单不存在或不属于该商家则返回 null 或抛出异常
     */
    OrderDTO getMerchantOrderDetail(User merchant, Long orderId);

    /**
     * 商家更新订单状态
     * @param merchant 商家用户对象
     * @param orderId 订单ID
     * @param newStatus 新的订单状态
     * @return 更新成功返回 true，失败（如无权限、状态无效）返回 false 或抛出异常
     */
    boolean updateOrderStatusByMerchant(User merchant, Long orderId, String newStatus);

    // 添加管理员获取所有订单列表的方法 (分页)
    PageInfo<OrderDTO> getAllOrdersAdmin(int pageNum, int pageSize, String statusFilter);

    void updateOrderStatusAdmin(Long orderId, String newStatus, User user);

    OrderDTO getOrderDetailsAdmin(Long orderId);

    /**
     * 根据条件搜索订单 (分页)
     * @param criteria 搜索条件
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @return 包含订单信息的 PageInfo 对象
     */
    PageInfo<OrderDTO> searchOrders(OrderSearchDTO criteria, int pageNum, int pageSize);

    /**
     * 获取用户待支付的订单列表
     * @param user 当前用户
     * @return 待支付订单DTO列表
     */
    List<OrderDTO> getPendingPaymentOrders(User user);

    /**
     * 处理支付成功的回调。
     * 更新相关订单状态为"待发货"，确认库存扣减，并记录支付信息。
     *
     * @param orderIds                  此次支付成功对应的所有订单ID列表
     * @param paymentGatewayTransactionId 支付网关返回的交易流水号
     * @param paidAmount                用户实际支付的金额
     * @throws IllegalArgumentException 如果订单状态不正确或支付金额不匹配等
     * @throws RuntimeException         如果库存确认失败或其他系统级错误
     */
    void processPaymentSuccess(List<Long> orderIds, String paymentGatewayTransactionId, BigDecimal paidAmount);

    /**
     * 用户取消订单
     * 用户只能取消自己的、处于特定状态（如待支付、待发货）的订单
     * 取消待支付订单时会释放预留的库存
     * 
     * @param user 当前用户
     * @param orderId 要取消的订单ID
     * @return 取消成功返回true，否则返回false
     * @throws IllegalStateException 如果订单状态不允许取消或发生其他错误
     * @throws IllegalArgumentException 如果订单不存在或不属于该用户
     */
    boolean cancelOrder(User user, Long orderId);
}
