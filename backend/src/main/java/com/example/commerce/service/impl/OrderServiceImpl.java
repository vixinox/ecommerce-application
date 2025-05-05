package com.example.commerce.service.impl;

import com.example.commerce.dao.CartDAO;
import com.example.commerce.dao.OrderDAO;
import com.example.commerce.dao.ProductDAO;
import com.example.commerce.dto.CartItemDTO;
import com.example.commerce.dto.OrderDTO;
import com.example.commerce.dto.SpendingReportDTO;
import com.example.commerce.model.Order;
import com.example.commerce.model.OrderItem;
import com.example.commerce.model.ProductVariant;
import com.example.commerce.model.User;
import com.example.commerce.service.OrderService;
import com.example.commerce.service.UserService;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderServiceImpl implements OrderService {

    private static final Logger logger = LoggerFactory.getLogger(OrderServiceImpl.class);

    private static final String ORDER_STATUS_PENDING = "PENDING";
    private static final String ORDER_STATUS_SHIPPED = "SHIPPED";
    private static final String ORDER_STATUS_COMPLETED = "COMPLETED";
    private static final String ORDER_STATUS_CANCELED = "CANCELED";

    // 定义合法的状态集合，方便校验
    private static final Set<String> VALID_ORDER_STATUSES = Set.of(
            ORDER_STATUS_PENDING,
            ORDER_STATUS_SHIPPED,
            ORDER_STATUS_COMPLETED,
            ORDER_STATUS_CANCELED
    );

    @Autowired
    private UserService userService;

    @Autowired
    private OrderDAO orderDao;
    @Autowired
    private ProductDAO productDao;
    @Autowired
    private CartDAO cartDao;

    private static Integer checkQuantity(CartItemDTO item, ProductVariant variant) {
        Integer requiredQuantity = item.getQuantity();
        if (requiredQuantity == null || requiredQuantity <= 0)
            throw new IllegalArgumentException("商品数量无效");

        //TODO: DAO检查库存
        Integer availableStock = variant.getStockQuantity();

        if (availableStock == null || availableStock < requiredQuantity)
            throw new RuntimeException("商品 [" + item.getProductName() + " - " + variant.getColor() + "/" +
                    variant.getSize() + "] 库存不足，需要 " + requiredQuantity + " 库存只有 " + availableStock);

        return requiredQuantity;
    }

    /**
     * 创建新订单。
     * 包含库存检查、订单/明细保存、库存扣减和购物车清理等步骤。
     * 使用 @Transactional 注解确保操作的原子性。
     *
     * @param user  用户信息
     * @param items 购物车中选定的商品列表（CartItemDTO）
     * @throws RuntimeException 如果库存不足或订单创建失败
     */
    @Transactional
    public void createOrder(User user, List<CartItemDTO> items) {
        if (items == null || items.isEmpty())
            throw new IllegalArgumentException("订单商品列表不能为空");

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderItem> orderItemsToCreate = new ArrayList<>();

        for (CartItemDTO item : items) {
            ProductVariant variant = item.getProductVariant();
            if (variant == null || variant.getId() == null)
                throw new IllegalArgumentException("购物车项包含无效的商品款式信息");

            totalAmount = totalAmount.add(
                    variant.getPrice().multiply(
                            BigDecimal.valueOf(
                                    checkQuantity(item, variant))));
        }

        Order newOrder = new Order();
        newOrder.setUserId(user.getId());
        newOrder.setTotalAmount(totalAmount);
        newOrder.setStatus(ORDER_STATUS_PENDING);

        int orderCreatedRows = orderDao.createOrder(newOrder);
        if (orderCreatedRows != 1 || newOrder.getId() == null)
            throw new RuntimeException("创建订单主记录失败");

        Long newOrderId = newOrder.getId();

        for (CartItemDTO item : items) {
            OrderItem orderItem = getOrderItem(item, newOrderId);
            orderItemsToCreate.add(orderItem);
        }

        int orderItemsCreatedRows = orderDao.createOrderItems(orderItemsToCreate);
        if (orderItemsCreatedRows != orderItemsToCreate.size())
            throw new RuntimeException("批量创建订单明细失败，预期插入 " + orderItemsToCreate.size() +
                    " 条，实际插入 " + orderItemsCreatedRows + " 条");

        for (OrderItem item : orderItemsToCreate)
            if (productDao.deductStock(item.getProductVariantId(), item.getQuantity()) == 0)
                throw new RuntimeException("库存扣减失败，商品库存不足。");

        for (CartItemDTO item : items)
            cartDao.removeCardItem(user.getId(), item.getCartId());

        System.out.println("新订单创建成功，订单ID: " + newOrderId);
    }

    @Override
    public List<OrderDTO> getOrder(User user) {
        List<Order> orders = orderDao.getOrdersByUserId(user.getId());
        if (orders == null || orders.isEmpty())
            return Collections.emptyList();
        List<Long> orderIds = orders.stream()
                .map(Order::getId)
                .collect(Collectors.toList());
        List<OrderItem> items = orderDao.getOrderItemsByOrderIds(orderIds);
        Map<Long, List<OrderItem>> itemsByOrderId = items.stream()
                .collect(Collectors.groupingBy(OrderItem::getOrderId));
        return orders.stream()
                .map(order -> {
                    List<OrderItem> orderItems = itemsByOrderId.getOrDefault(order.getId(), Collections.emptyList());
                    return new OrderDTO(order, orderItems);
                })
                .sorted(Comparator.comparing(orderDTO -> orderDTO.getOrder().getCreatedAt(), Comparator.reverseOrder()))
                .collect(Collectors.toList());
    }

    @Override
    public SpendingReportDTO getSpendingReport(User user) {
        Long userId = user.getId();

        Map<String, Object> summaryMap = orderDao.getUserOrderSummary(userId);
        BigDecimal totalSpend = BigDecimal.ZERO;
        Long totalOrders = 0L;
        BigDecimal averageOrderValue = BigDecimal.ZERO;

        if (summaryMap != null) {
            totalSpend = (BigDecimal) summaryMap.get("totalSpend");
            totalOrders = (Long) summaryMap.get("totalOrders");
            averageOrderValue = (BigDecimal) summaryMap.get("averageOrderValue");

            if (totalSpend == null) totalSpend = BigDecimal.ZERO;
            if (totalOrders == null) totalOrders = 0L;
            if (averageOrderValue == null || totalOrders == 0) averageOrderValue = BigDecimal.ZERO;
        }

        List<SpendingReportDTO.TimeBasedSpend> monthlySpendTrend = orderDao.getUserMonthlySpendTrend(userId);
        if (monthlySpendTrend == null)
            monthlySpendTrend = Collections.emptyList();


        List<SpendingReportDTO.CategorySpend> categorySpend = orderDao.getUserCategorySpend(userId);
        if (categorySpend == null)
            categorySpend = Collections.emptyList();

        List<SpendingReportDTO.ItemSpend> topItemSpend = orderDao.getUserTopItemSpend(userId);
        if (topItemSpend == null)
            topItemSpend = Collections.emptyList();

        SpendingReportDTO report = new SpendingReportDTO();
        report.setTotalSpend(totalSpend);
        report.setTotalOrders(totalOrders);
        report.setAverageOrderValue(averageOrderValue);
        report.setMonthlySpendTrend(monthlySpendTrend);
        report.setCategorySpend(categorySpend);
        report.setTopItemSpend(topItemSpend);

        return report;
    }

    @Override
    public PageInfo<OrderDTO> getMerchantOrders(User merchant, int pageNum, int pageSize, String status) {
        // 1. 使用 PageHelper 进行分页
        PageHelper.startPage(pageNum, pageSize);

        // 2. 查询与商家相关的订单ID列表
        List<Long> merchantOrderIds = orderDao.getMerchantOrderIds(merchant.getId(), status);

        // 如果没有相关订单，直接返回空的分页信息
        if (merchantOrderIds == null || merchantOrderIds.isEmpty()) {
            return new PageInfo<>(Collections.emptyList());
        }

        // 3. 根据订单ID列表查询订单基本信息
        // 注意：这里直接使用 PageInfo 包装了 ID 列表的结果，它会自动处理分页逻辑
        PageInfo<Long> orderIdPageInfo = new PageInfo<>(merchantOrderIds);
        List<Order> orders = orderDao.getOrdersByIds(merchantOrderIds);

        // 如果查询不到订单信息（理论上不应该发生，除非数据不一致），返回空
        if (orders == null || orders.isEmpty()) {
            return new PageInfo<>(Collections.emptyList());
        }

        // 4. 查询这些订单中与该商家相关的订单项
        List<OrderItem> allRelevantItems = orderDao.getMerchantOrderItems(merchantOrderIds, merchant.getId());
        Map<Long, List<OrderItem>> itemsByOrderId = allRelevantItems.stream()
                .collect(Collectors.groupingBy(OrderItem::getOrderId));

        // 5. 将 Order 和 OrderItem 组装成 OrderDTO
        List<OrderDTO> orderDTOs = orders.stream()
                .map(order -> {
                    // 只包含与该商家相关的订单项
                    List<OrderItem> merchantItems = itemsByOrderId.getOrDefault(order.getId(), Collections.emptyList());
                    // 注意：这里的 OrderDTO 应该能处理空的 items 列表
                    // 如果需要，可以调整 OrderDTO 构造函数或创建 MerchantOrderDTO
                    return new OrderDTO(order, merchantItems);
                })
                // 可以在这里添加排序，如果 DAO 查询没有排序的话
                // .sorted(Comparator.comparing(dto -> dto.getOrder().getCreatedAt(), Comparator.reverseOrder()))
                .collect(Collectors.toList());

        // 6. 使用 PageInfo 包装最终的 DTO 列表，并设置分页信息
        PageInfo<OrderDTO> pageInfoResult = new PageInfo<>(orderDTOs);
        // 从原始的 orderIdPageInfo 复制分页信息到最终结果
        pageInfoResult.setTotal(orderIdPageInfo.getTotal());
        pageInfoResult.setPageNum(orderIdPageInfo.getPageNum());
        pageInfoResult.setPageSize(orderIdPageInfo.getPageSize());
        pageInfoResult.setPages(orderIdPageInfo.getPages());

        return pageInfoResult;
    }

    @Override
    public OrderDTO getMerchantOrderDetail(User merchant, Long orderId) {
        // 1. 获取订单基本信息
        Order order = orderDao.getOrderById(orderId);
        if (order == null) {
            // 或者抛出 NotFoundException
            return null;
        }

        // 2. 获取该订单中与该商家相关的订单项
        List<OrderItem> merchantItems = orderDao.getMerchantOrderItems(Collections.singletonList(orderId), merchant.getId());

        // 3. 校验：如果订单存在，但没有任何商品属于该商家，则认为无权限查看
        //    或者根据业务需求，允许查看订单信息但 item 列表为空
        if (merchantItems == null || merchantItems.isEmpty()) {
             // 检查订单是否确实没有任何item属于该商家
             List<Long> ids = orderDao.getMerchantOrderIds(merchant.getId(), null); // 传入null status获取所有
             if(!ids.contains(orderId)) {
                // 确认订单不属于该商家
                 System.err.println("Attempt to access order " + orderId + " by merchant " + merchant.getId() + " who has no items in it.");
                // 抛出 AccessDeniedException 或返回 null
                 return null;
             }
            // 如果订单属于商家，但 items 为空（可能因为过滤等原因），返回带空列表的 DTO
             System.out.println("Order " + orderId + " belongs to merchant " + merchant.getId() + " but no items found for merchant (check getMerchantOrderItems logic).");
        }

        // 4. 组装 DTO 并返回
        return new OrderDTO(order, merchantItems == null ? Collections.emptyList() : merchantItems);
    }

    @Override
    @Transactional // 涉及状态更新，需要事务
    public boolean updateOrderStatusByMerchant(User merchant, Long orderId, String newStatus) {
        // 1. 校验新状态是否合法
        if (!VALID_ORDER_STATUSES.contains(newStatus)) {
            throw new IllegalArgumentException("无效的订单状态: " + newStatus);
        }

        // 2. 获取当前订单信息
        Order order = orderDao.getOrderById(orderId);
        if (order == null) {
            // 如果订单不存在，直接返回失败
             System.err.println("Order " + orderId + " not found for status update.");
            return false;
        }

        String currentStatus = order.getStatus();

        // 3. 实现状态转换逻辑 (商家能进行的操作)
        // 基本规则：
        // - 商家可以将 '待发货' -> '已发货'
        // - 商家可以将 '待发货' -> '已取消' (根据业务需求决定是否允许)
        // - 其他状态转换由商家发起可能不允许，或需要更复杂逻辑 (如退款流程)
        if (Objects.equals(currentStatus, ORDER_STATUS_PENDING)) {
            if (!Objects.equals(newStatus, ORDER_STATUS_SHIPPED) && !Objects.equals(newStatus, ORDER_STATUS_CANCELED)) {
                throw new IllegalStateException("商家只能将 '待发货' 状态的订单更新为 '已发货' 或 '已取消'，而不是 '" + newStatus + "'");
            }
        } else if (Objects.equals(currentStatus, ORDER_STATUS_SHIPPED)) {
            // 通常商家不能直接将 '已发货' 改为 '已完成' 或 '已取消'
            // '已完成' 可能需要用户确认收货或物流信息同步
            // '已取消' 在发货后通常需要走退货流程
            throw new IllegalStateException("商家不能直接修改 '已发货' 状态订单的状态。");
        } else if (Objects.equals(currentStatus, ORDER_STATUS_COMPLETED) || Objects.equals(currentStatus, ORDER_STATUS_CANCELED)) {
            // 终态订单不允许修改
            throw new IllegalStateException("不能修改已是 '" + currentStatus + "' 状态的订单。");
        } else {
            // 处理未知的当前状态
            System.err.println("订单 " + orderId + " 存在未知的当前状态: " + currentStatus);
            throw new IllegalStateException("订单当前状态未知或不允许修改。");
        }

        // 4. 执行数据库更新 (DAO中的SQL已包含商家权限校验)
        int updatedRows = orderDao.updateOrderStatusByMerchant(orderId, newStatus, merchant.getId());

        // 5. 处理更新结果
        if (updatedRows == 1) {
            System.out.println("Order " + orderId + " status updated to '" + newStatus + "' by merchant " + merchant.getId());
            // TODO: 可能需要在这里触发一些事件，例如发送通知给用户订单已发货/取消
            return true;
        } else {
            // DAO层的权限检查应该会阻止更新非该商家的订单。如果执行到这里 updatedRows == 0，
            // 且前面的检查都通过了，可能意味着数据库并发问题或其他底层错误。
            // 但更可能的情况是，在前面的状态检查或获取订单时就应该处理了不存在或无权限的情况。
            // 这里日志记录一下异常情况。
            System.err.println("Failed to update status for order " + orderId + " to '" + newStatus + "' by merchant " + merchant.getId() + ". Rows affected: " + updatedRows + ". Check for concurrent modifications or DAO logic issues.");
            // 可以考虑根据业务需求决定是否抛出异常
            // throw new RuntimeException("订单状态更新失败，可能由于并发修改或数据不一致。");
            return false;
        }
    }

    @Override
    public PageInfo<OrderDTO> getAllOrdersAdmin(int pageNum, int pageSize, String statusFilter) {
        PageHelper.startPage(pageNum, pageSize);
        String filter = Objects.equals(statusFilter, "all") || statusFilter == null ? null : statusFilter;
        List<Order> orders = orderDao.findAllOrdersAdmin(filter);

        if (orders == null || orders.isEmpty())
            return new PageInfo<>(Collections.emptyList());

        PageInfo<Order> orderPageInfo = new PageInfo<>(orders);

        List<Long> orderIds = orders.stream().map(Order::getId).collect(Collectors.toList());
        List<OrderItem> allItems = orderDao.getOrderItemsByOrderIds(orderIds);
        Map<Long, List<OrderItem>> itemsByOrderId = allItems.stream()
                .collect(Collectors.groupingBy(OrderItem::getOrderId));

        List<OrderDTO> orderDTOs = orders.stream()
                .map(order -> {
                    List<OrderItem> orderItems = itemsByOrderId.getOrDefault(order.getId(), Collections.emptyList());
                    return new OrderDTO(order, orderItems);
                })
                .collect(Collectors.toList());

        PageInfo<OrderDTO> resultPageInfo = new PageInfo<>(orderDTOs);
        resultPageInfo.setTotal(orderPageInfo.getTotal());
        resultPageInfo.setPageNum(orderPageInfo.getPageNum());
        resultPageInfo.setPageSize(orderPageInfo.getPageSize());
        resultPageInfo.setPages(orderPageInfo.getPages());

        return resultPageInfo;
    }

    // 新增 updateOrderStatusAdmin 实现
    @Override
    @Transactional // 状态更新需要事务
    public void updateOrderStatusAdmin(Long orderId, String newStatus) {
        // 1. 校验状态是否合法
        if (!VALID_ORDER_STATUSES.contains(newStatus)) {
            throw new IllegalArgumentException("无效的订单状态: " + newStatus + ". 合法状态为: " + VALID_ORDER_STATUSES);
        }

        // 2. 检查订单是否存在
        Order order = orderDao.getOrderById(orderId);
        if (order == null) {
            throw new RuntimeException("订单不存在: " + orderId);
        }

        String oldStatus = order.getStatus(); // 获取旧状态
        int updatedRows = orderDao.updateOrderStatusAdmin(orderId, newStatus);
        if (updatedRows == 0) {
            // 理论上在检查订单存在后不应该发生，除非并发问题
            throw new RuntimeException("更新订单 " + orderId + " 状态失败，可能订单已被删除。" );
        }
        logger.info("管理员更新了订单 {} 的状态: {} -> {}", orderId, oldStatus, newStatus); // 添加日志
    }

    // 新增 getOrderDetailsAdmin 实现
    @Override
    public OrderDTO getOrderDetailsAdmin(Long orderId) {
        // 1. 获取订单基本信息
        Order order = orderDao.getOrderById(orderId);
        if (order == null) {
            throw new RuntimeException("订单不存在: " + orderId);
        }

        // 2. 获取订单项
        List<OrderItem> items = orderDao.getOrderItemsByOrderIds(Collections.singletonList(orderId));
        if (items == null) {
            items = Collections.emptyList(); // 保证 items 不为 null
        }

        // 3. 获取购买者信息
        User buyerInfo = userService.findUserById(order.getUserId());
        // buyerInfo 可能为 null 如果用户已被删除，根据业务需求决定如何处理
        // 这里暂时允许 buyerInfo 为 null

        // 4. 组装 DTO
        OrderDTO orderDTO = new OrderDTO();
        orderDTO.setOrder(order);
        orderDTO.setItems(items);
        orderDTO.setBuyerInfo(buyerInfo);

        return orderDTO;
    }

    private OrderItem getOrderItem(CartItemDTO item, Long orderId) {
        ProductVariant variant = item.getProductVariant();
        OrderItem orderItem = new OrderItem();
        orderItem.setOrderId(orderId);
        orderItem.setProductId(variant.getProductId());
        orderItem.setProductVariantId(variant.getId());
        orderItem.setQuantity(item.getQuantity());
        orderItem.setPurchasedPrice(variant.getPrice());
        orderItem.setSnapshotProductName(item.getProductName());
        orderItem.setSnapshotVariantColor(variant.getColor());
        orderItem.setSnapshotVariantSize(variant.getSize());
        orderItem.setSnapshotVariantImage(variant.getImage());
        return orderItem;
    }
}
