package com.example.commerce.service.impl;

import com.example.commerce.dao.CartDAO;
import com.example.commerce.dao.OrderDAO;
import com.example.commerce.dao.ProductDAO;
import com.example.commerce.dto.CartItemDTO;
import com.example.commerce.dto.OrderDTO;
import com.example.commerce.dto.OrderSearchDTO;
import com.example.commerce.dto.SpendingReportDTO;
import com.example.commerce.model.Order;
import com.example.commerce.model.OrderItem;
import com.example.commerce.model.Product;
import com.example.commerce.model.ProductVariant;
import com.example.commerce.model.User;
import com.example.commerce.service.OrderService;
import com.example.commerce.service.UserService;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderServiceImpl implements OrderService {

    private static final Logger logger = LoggerFactory.getLogger(OrderServiceImpl.class);

    private static final String ORDER_STATUS_PENDING = "PENDING";
    private static final String ORDER_STATUS_SHIPPED = "SHIPPED";
    private static final String ORDER_STATUS_COMPLETED = "COMPLETED";
    private static final String ORDER_STATUS_CANCELED = "CANCELED";
    private static final String ORDER_STATUS_PENDING_PAYMENT = "PENDING_PAYMENT";
    private static final String ORDER_STATUS_CANCELED_TIMEOUT = "CANCELED_TIMEOUT";

    private static final int PAYMENT_EXPIRY_MINUTES = 15;

    private static final Set<String> VALID_ORDER_STATUSES = Set.of(
            ORDER_STATUS_PENDING,
            ORDER_STATUS_SHIPPED,
            ORDER_STATUS_COMPLETED,
            ORDER_STATUS_CANCELED,
            ORDER_STATUS_PENDING_PAYMENT,
            ORDER_STATUS_CANCELED_TIMEOUT
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


        Integer stockQuantity = variant.getStockQuantity() != null ? variant.getStockQuantity() : 0;
        Integer reservedQuantity = variant.getReservedQuantity() != null ? variant.getReservedQuantity() : 0;
        Integer availableStock = stockQuantity - reservedQuantity;

        if (availableStock < requiredQuantity)
            throw new RuntimeException("商品 [" + item.getProductName() + " - " + variant.getColor() + "/" +
                    variant.getSize() + "] 库存不足，需要 " + requiredQuantity + " 当前可用库存 " + availableStock +
                    " (总库存:" + stockQuantity + ", 已预留:" + reservedQuantity + ")");

        return requiredQuantity;
    }

    /**
     * 创建新订单。
     * 按照商家分组购物车商品，为每个商家创建独立的订单。
     * 包含库存检查、订单/明细保存、库存扣减和购物车清理等步骤。
     * 使用 @Transactional 注解确保操作的原子性。
     *
     * @param user  用户信息
     * @param items 购物车中选定的商品列表（CartItemDTO）
     * @return 创建的订单ID列表
     * @throws RuntimeException 如果库存不足或订单创建失败
     */
    @Override
    @Transactional
    public List<Long> createOrder(User user, List<CartItemDTO> items) {
        logger.info("开始为用户ID: {} 创建订单，原始商品项数量: {}", user.getId(), items != null ? items.size() : 0);
        if (items == null || items.isEmpty()) {
            logger.warn("订单商品列表为空或为null，用户ID: {}", user.getId());
            throw new IllegalArgumentException("订单商品列表不能为空");
        }

        List<Long> createdOrderIds = new ArrayList<>();
        Map<Long, List<CartItemDTO>> itemsByMerchant = new HashMap<>();
        
        logger.debug("开始检查所有商品库存并按商家分组，用户ID: {}", user.getId());
        for (CartItemDTO item : items) {
            ProductVariant variant = item.getProductVariant();
            if (variant == null || variant.getId() == null) {
                logger.error("购物车项 {} (商品名: {}) 包含无效的商品款式信息，用户ID: {}", item.getCartId(), item.getProductName(), user.getId());
                throw new IllegalArgumentException("购物车项包含无效的商品款式信息，商品名: " + item.getProductName());
            }
            logger.debug("检查库存：商品款式ID: {}, 请求数量: {}, 商品名: {}", variant.getId(), item.getQuantity(), item.getProductName());
            checkQuantity(item, variant);
            
            Product product = productDao.getProductById(variant.getProductId());
            if (product == null) {
                logger.error("商品信息不存在，商品ID: {} (来自款式ID: {})，用户ID: {}", variant.getProductId(), variant.getId(), user.getId());
                throw new IllegalArgumentException("商品信息不存在，商品ID: " + variant.getProductId());
            }
            Long merchantId = product.getOwnerId();
            itemsByMerchant.computeIfAbsent(merchantId, k -> new ArrayList<>()).add(item);
            logger.debug("商品款式ID: {} (商品ID: {}) 属于商家ID: {}，已添加到分组", variant.getId(), product.getId(), merchantId);
        }
        logger.info("商品已按商家分组完成，共 {} 个商家，用户ID: {}", itemsByMerchant.size(), user.getId());
        
        try {
            for (Map.Entry<Long, List<CartItemDTO>> entry : itemsByMerchant.entrySet()) {
                Long merchantId = entry.getKey();
                List<CartItemDTO> merchantItems = entry.getValue();
                logger.info("开始为商家ID: {} 创建独立订单，商品项数量: {}", merchantId, merchantItems.size());
                
                BigDecimal totalAmount = BigDecimal.ZERO;
                List<OrderItem> orderItemsToCreate = new ArrayList<>();
                for (CartItemDTO item : merchantItems) {
                    ProductVariant variant = item.getProductVariant();
                    totalAmount = totalAmount.add(variant.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
                }
                logger.debug("商家ID: {} 的订单计算总金额: {}", merchantId, totalAmount);
                
                Order newOrder = new Order();
                newOrder.setUserId(user.getId());
                newOrder.setTotalAmount(totalAmount);
                newOrder.setStatus(ORDER_STATUS_PENDING_PAYMENT);
                newOrder.setExpiresAt(LocalDateTime.now().plusMinutes(PAYMENT_EXPIRY_MINUTES));
                
                logger.debug("准备为商家ID: {} 创建订单主记录: {}", merchantId, newOrder);
                int orderCreatedRows = orderDao.createOrder(newOrder);
                if (orderCreatedRows != 1 || newOrder.getId() == null) {
                    logger.error("创建订单主记录失败，商家ID: {}，影响行数: {}，获取到的订单ID: {}", merchantId, orderCreatedRows, newOrder.getId());
                    throw new RuntimeException("创建订单主记录失败，商家ID: " + merchantId);
                }
                Long newOrderId = newOrder.getId();
                createdOrderIds.add(newOrderId);
                logger.info("订单主记录创建成功，商家ID: {}，新订单ID: {}", merchantId, newOrderId);
                
                for (CartItemDTO item : merchantItems) {
                    OrderItem orderItem = getOrderItem(item, newOrderId);
                    orderItemsToCreate.add(orderItem);
                }
                logger.debug("准备为订单ID: {} 创建 {} 条订单明细项", newOrderId, orderItemsToCreate.size());
                int orderItemsCreatedRows = orderDao.createOrderItems(orderItemsToCreate);
                if (orderItemsCreatedRows != orderItemsToCreate.size()) {
                    logger.error("批量创建订单明细失败，订单ID: {}，预期插入: {}，实际插入: {}，商家ID: {}", 
                                 newOrderId, orderItemsToCreate.size(), orderItemsCreatedRows, merchantId);
                    throw new RuntimeException("批量创建订单明细失败，订单ID: " + newOrderId);
                }
                logger.info("订单明细项创建成功，订单ID: {}，数量: {}", newOrderId, orderItemsCreatedRows);
                
                logger.debug("开始为订单ID: {} 的商品预留库存", newOrderId);
                for (OrderItem item : orderItemsToCreate) {
                    logger.debug("预留库存：订单项商品款式ID: {}, 数量: {}, 商品名: {}", item.getProductVariantId(), item.getQuantity(), item.getSnapshotProductName());
                    int reserveStockResult = productDao.reserveStock(item.getProductVariantId(), item.getQuantity());
                    if (reserveStockResult == 0) {
                        logger.error("预留库存失败，订单ID: {}，商品款式ID: {}，请求数量: {}。可能是可用库存不足。", 
                                     newOrderId, item.getProductVariantId(), item.getQuantity());
                        throw new RuntimeException("预留库存失败，商品可用库存不足 (款式ID: " + item.getProductVariantId() + ")");
                    }
                    logger.debug("库存预留成功：订单项商品款式ID: {}, 数量: {}", item.getProductVariantId(), item.getQuantity());
                }
                logger.info("订单ID: {} 的所有商品库存预留成功", newOrderId);
                
                logger.debug("开始为用户ID: {} 清理与订单ID: {} 相关的购物车项", user.getId(), newOrderId);
                for (CartItemDTO item : merchantItems) {
                    logger.debug("清理购物车项：用户ID: {}, 购物车项ID: {}, 商品名: {}", user.getId(), item.getCartId(), item.getProductName());
                    cartDao.removeCardItem(user.getId(), item.getCartId());
                }
                logger.info("订单ID: {} (商家ID: {}) 相关的购物车项清理完成", newOrderId, merchantId);
                logger.info("商家 {} 的订单创建流程完成，订单ID: {} (这是您在前端看到的日志来源)", merchantId, newOrderId);
            }
            logger.info("所有商家的订单均已处理完毕，共创建 {} 个订单ID: {}，用户ID: {}。准备提交事务。", createdOrderIds.size(), createdOrderIds, user.getId());
            return createdOrderIds;
        } catch (Exception e) {
            logger.error("创建订单过程中发生异常，用户ID: {}，错误信息: {}。事务将回滚。", user.getId(), e.getMessage(), e);
            throw e;
        }
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

        PageHelper.startPage(pageNum, pageSize);


        List<Long> merchantOrderIds = orderDao.getMerchantOrderIds(merchant.getId(), status);


        if (merchantOrderIds == null || merchantOrderIds.isEmpty()) {
            return new PageInfo<>(Collections.emptyList());
        }



        PageInfo<Long> orderIdPageInfo = new PageInfo<>(merchantOrderIds);
        List<Order> orders = orderDao.getOrdersByIds(merchantOrderIds);


        if (orders == null || orders.isEmpty()) {
            return new PageInfo<>(Collections.emptyList());
        }


        List<OrderItem> allRelevantItems = orderDao.getMerchantOrderItems(merchantOrderIds, merchant.getId());
        Map<Long, List<OrderItem>> itemsByOrderId = allRelevantItems.stream()
                .collect(Collectors.groupingBy(OrderItem::getOrderId));
        List<OrderDTO> orderDTOs = orders.stream()
                .map(order -> {
                    List<OrderItem> merchantItems = itemsByOrderId.getOrDefault(order.getId(), Collections.emptyList());
                    return new OrderDTO(order, merchantItems);
                })
                .collect(Collectors.toList());
        PageInfo<OrderDTO> pageInfoResult = new PageInfo<>(orderDTOs);
        pageInfoResult.setTotal(orderIdPageInfo.getTotal());
        pageInfoResult.setPageNum(orderIdPageInfo.getPageNum());
        pageInfoResult.setPageSize(orderIdPageInfo.getPageSize());
        pageInfoResult.setPages(orderIdPageInfo.getPages());

        return pageInfoResult;
    }

    @Override
    public OrderDTO getMerchantOrderDetail(User merchant, Long orderId) {
        Order order = orderDao.getOrderById(orderId);
        if (order == null) {
            return null;
        }


        List<OrderItem> merchantItems = orderDao.getMerchantOrderItems(Collections.singletonList(orderId), merchant.getId());
        if (merchantItems == null || merchantItems.isEmpty()) {
             List<Long> ids = orderDao.getMerchantOrderIds(merchant.getId(), null);
             if(!ids.contains(orderId)) {
                 System.err.println("Attempt to access order " + orderId + " by merchant " + merchant.getId() + " who has no items in it.");
                 return null;
             }
             System.out.println("Order " + orderId + " belongs to merchant " + merchant.getId() + " but no items found for merchant (check getMerchantOrderItems logic).");
        }
        return new OrderDTO(order, merchantItems == null ? Collections.emptyList() : merchantItems);
    }

    @Override
    @Transactional
    public boolean updateOrderStatusByMerchant(User merchant, Long orderId, String newStatus) {
        if (!VALID_ORDER_STATUSES.contains(newStatus)) {
            throw new IllegalArgumentException("无效的订单状态: " + newStatus);
        }
        Order order = orderDao.getOrderById(orderId);
        if (order == null) {
             System.err.println("Order " + orderId + " not found for status update.");
            return false;
        }
        String currentStatus = order.getStatus();
        switch (currentStatus) {
            case ORDER_STATUS_PENDING -> {
                if (!Objects.equals(newStatus, ORDER_STATUS_SHIPPED) && !Objects.equals(newStatus, ORDER_STATUS_CANCELED)) {
                    throw new IllegalStateException("商家只能将 '待发货' 状态的订单更新为 '已发货' 或 '已取消'，而不是 '" + newStatus + "'");
                }
            }
            case ORDER_STATUS_SHIPPED -> throw new IllegalStateException("商家不能直接修改 '已发货' 状态订单的状态。");
            case ORDER_STATUS_COMPLETED, ORDER_STATUS_CANCELED ->
                    throw new IllegalStateException("不能修改已是 '" + currentStatus + "' 状态的订单。");
            case null, default -> {

                System.err.println("订单 " + orderId + " 存在未知的当前状态: " + currentStatus);
                throw new IllegalStateException("订单当前状态未知或不允许修改。");
            }
        }

        int updatedRows = orderDao.updateOrderStatusByMerchant(orderId, newStatus, merchant.getId());
        if (updatedRows == 1) {
            System.out.println("Order " + orderId + " status updated to '" + newStatus + "' by merchant " + merchant.getId());
            return true;
        } else {
            System.err.println("Failed to update status for order " + orderId + " to '" + newStatus + "' by merchant " + merchant.getId() + ". Rows affected: " + updatedRows + ". Check for concurrent modifications or DAO logic issues.");
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


    @Override
    @Transactional
    public void updateOrderStatusAdmin(Long orderId, String newStatus, User user) {

        if (!VALID_ORDER_STATUSES.contains(newStatus)) {
            throw new IllegalArgumentException("无效的订单状态: " + newStatus + ". 合法状态为: " + VALID_ORDER_STATUSES);
        }
        Order order = orderDao.getOrderById(orderId);
        if (order == null) {
            throw new RuntimeException("订单不存在: " + orderId);
        }
        String oldStatus = order.getStatus();
        int updatedRows = orderDao.updateOrderStatusAdmin(orderId, newStatus);
        if (updatedRows == 0) {
            throw new RuntimeException("更新订单 " + orderId + " 状态失败，可能订单已被删除。" );
        }
        logger.info("管理员更新了订单 {} 的状态: {} -> {}", orderId, oldStatus, newStatus);
    }


    @Override
    public OrderDTO getOrderDetailsAdmin(Long orderId, User requester) {
        if (orderId == null) {
            logger.warn("getOrderDetailsAdmin called with null orderId");
            throw new IllegalArgumentException("订单ID不能为空。");
        }
        if (requester == null || requester.getId() == null || requester.getRole() == null) {
            logger.warn("getOrderDetailsAdmin called with invalid requester info for orderId: {}", orderId);
            throw new IllegalArgumentException("无效的请求者信息。");
        }
        Order order = orderDao.getOrderById(orderId);
        if (order == null) {
            logger.warn("No order found with ID: {} by getOrderDetailsAdmin", orderId);
            return null; 
        }
        if ("MERCHANT".equals(requester.getRole()) && ORDER_STATUS_PENDING_PAYMENT.equals(order.getStatus())) {
            logger.info("Merchant {} attempted to view PENDING_PAYMENT order {}. Access denied (strict visibility).",
                        requester.getId(), orderId);
            return null;
        }
        List<OrderItem> items = orderDao.getOrderItemsByOrderIds(Collections.singletonList(orderId));
        if (items == null) { 
            items = Collections.emptyList();
        }
        User buyerInfo = userService.findUserById(order.getUserId());
        Long secondsRemaining = null;
        if (ORDER_STATUS_PENDING_PAYMENT.equals(order.getStatus()) && order.getExpiresAt() != null) { 
            secondsRemaining = java.time.Duration.between(LocalDateTime.now(), order.getExpiresAt()).getSeconds();
            if (secondsRemaining < 0) {
                secondsRemaining = 0L; 
            }
        }
        OrderDTO orderDTO = new OrderDTO(order, items, buyerInfo);
        orderDTO.setSecondsRemaining(secondsRemaining);
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

    @Override
    public PageInfo<OrderDTO> searchOrders(OrderSearchDTO criteria, int pageNum, int pageSize) {
        logger.debug("Searching orders with criteria: {}, page: {}, size: {}", criteria, pageNum, pageSize);
        PageHelper.startPage(pageNum, pageSize);
        List<Order> orders = orderDao.searchOrdersByCriteria(criteria);

        if (orders == null || orders.isEmpty()) {
            return new PageInfo<>(Collections.emptyList());
        }
        List<Long> orderIds = orders.stream().map(Order::getId).collect(Collectors.toList());
        List<OrderItem> allItemsForFoundOrders = orderDao.getOrderItemsByOrderIds(orderIds);
        Map<Long, List<OrderItem>> itemsByOrderId = allItemsForFoundOrders.stream()
                .collect(Collectors.groupingBy(OrderItem::getOrderId));
        Set<Long> userIds = orders.stream().map(Order::getUserId).collect(Collectors.toSet());
        Map<Long, User> buyerInfoMap = new HashMap<>();
        if (!userIds.isEmpty()) {
        }

        List<OrderDTO> orderDTOs = orders.stream()
                .map(order -> {
                    List<OrderItem> currentOrderItems = itemsByOrderId.getOrDefault(order.getId(), Collections.emptyList());
                    User buyer = buyerInfoMap.get(order.getUserId());

                    return new OrderDTO(order, currentOrderItems, buyer);
                })
                .collect(Collectors.toList());

        PageInfo<OrderDTO> pageInfoResult = new PageInfo<>(orderDTOs);

        PageInfo<Order> originalPageInfo = new PageInfo<>(orders);
        pageInfoResult.setList(orderDTOs);
        pageInfoResult.setTotal(originalPageInfo.getTotal());
        pageInfoResult.setPageNum(originalPageInfo.getPageNum());
        pageInfoResult.setPageSize(originalPageInfo.getPageSize());
        pageInfoResult.setPages(originalPageInfo.getPages());
        pageInfoResult.setHasNextPage(originalPageInfo.isHasNextPage());
        pageInfoResult.setHasPreviousPage(originalPageInfo.isHasPreviousPage());
        pageInfoResult.setIsFirstPage(originalPageInfo.isIsFirstPage());
        pageInfoResult.setIsLastPage(originalPageInfo.isIsLastPage());

        logger.debug("Found {} orders matching criteria.", pageInfoResult.getTotal());
        return pageInfoResult;
    }

    /**
     * 处理支付成功的回调。
     * 更新相关订单状态为"待发货"，确认库存扣减。
     *
     * @param orderIds 此次支付成功对应的所有订单ID列表
     * @param paymentGatewayTransactionId 支付网关返回的交易流水号
     * @param paidAmount 用户实际支付的金额
     * @throws IllegalArgumentException 如果订单状态不正确或支付金额不匹配等
     * @throws RuntimeException 如果库存确认失败或其他系统级错误
     */
    @Override
    @Transactional
    public void processPaymentSuccess(List<Long> orderIds, String paymentGatewayTransactionId, BigDecimal paidAmount) {
        if (orderIds == null || orderIds.isEmpty()) {
            throw new IllegalArgumentException("订单ID列表不能为空。");
        }
        
        logger.info("开始处理模拟支付成功：订单ID列表: {}, 模拟交易ID: {}, 模拟支付金额: {}", 
                    orderIds, paymentGatewayTransactionId, paidAmount);

        List<Order> ordersToProcess = new ArrayList<>();
        BigDecimal calculatedTotalAmount = BigDecimal.ZERO;

        for (Long orderId : orderIds) {
            Order order = orderDao.getOrderById(orderId);
            if (order == null) {
                logger.error("模拟支付成功处理失败：订单 {} 不存在。", orderId);
                throw new IllegalArgumentException("支付确认失败：订单 " + orderId + " 未找到。");
            }

            if (!ORDER_STATUS_PENDING_PAYMENT.equals(order.getStatus())) {
                if (ORDER_STATUS_PENDING.equals(order.getStatus())) {
                    logger.warn("模拟支付成功：订单 {} 当前状态已为 {} (已支付/待发货)，视为重复请求或已处理。", orderId, order.getStatus());

                    ordersToProcess.add(order); 
                    calculatedTotalAmount = calculatedTotalAmount.add(order.getTotalAmount());
                    continue;
                }
                logger.error("模拟支付成功处理失败：订单 {} 当前状态为 {}，期望状态为 {}", orderId, order.getStatus(), ORDER_STATUS_PENDING_PAYMENT);
                throw new IllegalStateException("支付确认失败：订单 " + orderId + " 状态不正确。");
            }
            
            calculatedTotalAmount = calculatedTotalAmount.add(order.getTotalAmount());
            ordersToProcess.add(order);
        }
        

        logger.info("模拟支付：订单预期总金额: {}, 模拟传入支付金额: {}", calculatedTotalAmount, paidAmount);
        for (Order order : ordersToProcess) {
            if (ORDER_STATUS_PENDING_PAYMENT.equals(order.getStatus())) {
                int updatedRows = orderDao.updateOrderStatusAndClearExpiry(order.getId(), ORDER_STATUS_PENDING);
                if (updatedRows != 1) {
                    logger.error("更新订单 {} 状态为支付成功失败。影响行数: {}。可能订单状态已被并发修改。", order.getId(), updatedRows);
                    throw new RuntimeException("更新订单 " + order.getId() + " 状态为支付成功失败。");
                }
                List<OrderItem> orderItems = orderDao.getOrderItemsByOrderIds(Collections.singletonList(order.getId()));
                if (orderItems == null || orderItems.isEmpty()) {
                    logger.error("模拟支付成功处理：订单 {} 没有找到任何订单项。", order.getId());
                    throw new IllegalStateException("订单 " + order.getId() + " 数据异常：缺少订单项。");
                }
                for (OrderItem item : orderItems) {
                    if (productDao.confirmStockDeduction(item.getProductVariantId(), item.getQuantity()) == 0) {
                        logger.error("确认库存扣减失败 - 订单ID: {}, 商品: {}, 款式ID: {}, 数量: {}. 可能预留的库存已被非法修改或总库存不足。",
                                order.getId(), item.getSnapshotProductName(), item.getProductVariantId(), item.getQuantity());
                        throw new RuntimeException("关键错误：确认商品 " + item.getSnapshotProductName() + " (款式ID: " + item.getProductVariantId() + ") 的库存扣减失败。");
                    }
                }
                logger.info("订单 {} 已成功模拟支付，状态更新为 {}，相关库存已确认扣减。", order.getId(), ORDER_STATUS_PENDING);
            }
        }
        logger.info("所有选定订单已处理模拟支付。订单ID列表: {}, 模拟交易ID: {}", orderIds, paymentGatewayTransactionId);
    }

    /**
     * 定时任务：处理过期未支付订单
     * 每分钟执行一次，查找所有已过期但状态仍为 PENDING_PAYMENT 的订单
     * 将其状态更新为 CANCELED_TIMEOUT，并释放预留的库存
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void processExpiredOrders() {
        logger.info("开始处理过期未支付订单...");
        
        List<Order> expiredOrders = orderDao.findExpiredPendingPaymentOrders();
        if (expiredOrders.isEmpty()) {
            logger.info("没有找到过期未支付订单");
            return;
        }
        
        logger.info("找到 {} 个过期未支付订单", expiredOrders.size());
        
        for (Order order : expiredOrders) {
            logger.info("处理过期订单 ID: {}, 用户: {}, 金额: {}, 过期时间: {}", 
                order.getId(), order.getUserId(), order.getTotalAmount(), order.getExpiresAt());
            try {
                int updatedRows = orderDao.updateOrderStatusToTimeout(order.getId(), ORDER_STATUS_CANCELED_TIMEOUT);
                if (updatedRows != 1) {
                    logger.warn("更新订单 {} 状态为超时取消失败，可能已被其他进程处理", order.getId());
                    continue;
                }
                List<OrderItem> orderItems = orderDao.getOrderItemsByOrderIds(Collections.singletonList(order.getId()));
                
                if (orderItems == null || orderItems.isEmpty()) {
                    logger.warn("过期订单 {} 没有找到任何订单项", order.getId());
                    continue;
                }
                for (OrderItem item : orderItems) {
                    if (productDao.releaseReservedStock(item.getProductVariantId(), item.getQuantity()) == 0) {
                        logger.error("释放商品 {} (款式ID: {}) 的预留库存失败，数量: {}",
                            item.getSnapshotProductName(), item.getProductVariantId(), item.getQuantity());
                    } else {
                        logger.info("成功释放商品 {} (款式ID: {}) 的预留库存，数量: {}",
                            item.getSnapshotProductName(), item.getProductVariantId(), item.getQuantity());
                    }
                }
                logger.info("订单 {} 已标记为超时取消，并释放了所有预留库存", order.getId());
            } catch (Exception e) {
                logger.error("处理过期订单 {} 时发生错误", order.getId(), e);
            }
        }
        
        logger.info("过期订单处理完成");
    }

    @Override
    public List<OrderDTO> getPendingPaymentOrders(User user) {
        List<Order> pendingOrders = orderDao.getPendingPaymentOrdersByUserId(user.getId());
        if (pendingOrders == null || pendingOrders.isEmpty()) {
            return Collections.emptyList();
        }
        
        List<Long> orderIds = pendingOrders.stream()
                .map(Order::getId)
                .collect(Collectors.toList());
        
        List<OrderItem> items = orderDao.getOrderItemsByOrderIds(orderIds);
        Map<Long, List<OrderItem>> itemsByOrderId = items.stream()
                .collect(Collectors.groupingBy(OrderItem::getOrderId));
        
        return pendingOrders.stream()
                .map(order -> {
                    List<OrderItem> orderItems = itemsByOrderId.getOrDefault(order.getId(), Collections.emptyList());
                    OrderDTO dto = new OrderDTO(order, orderItems);

                    if (order.getExpiresAt() != null) {
                        LocalDateTime now = LocalDateTime.now();
                        LocalDateTime expiresAt = order.getExpiresAt();
                        long secondsRemaining = java.time.Duration.between(now, expiresAt).getSeconds();

                        dto.setSecondsRemaining(Math.max(0, secondsRemaining));
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * 用户取消订单
     * 
     * @param user 当前用户
     * @param orderId 要取消的订单ID
     * @return 取消成功返回true，失败返回false
     */
    @Override
    @Transactional
    public boolean cancelOrder(User user, Long orderId) {

        Order order = orderDao.getOrderById(orderId);
        if (order == null) {
            throw new IllegalArgumentException("订单不存在: " + orderId);
        }
        if (!order.getUserId().equals(user.getId())) {
            throw new IllegalArgumentException("无权操作此订单，订单不属于当前用户");
        }

        String currentStatus = order.getStatus();
        if (ORDER_STATUS_PENDING_PAYMENT.equals(currentStatus)) {
            logger.info("用户 {} 取消待支付订单 {}", user.getId(), orderId);
            int updatedRows = orderDao.updateOrderStatusByUser(
                    orderId, 
                    user.getId(), 
                    ORDER_STATUS_PENDING_PAYMENT, 
                    ORDER_STATUS_CANCELED);
            if (updatedRows != 1) {
                logger.warn("取消订单失败，订单 {} 可能已被其他进程更新", orderId);
                return false;
            }
            List<OrderItem> orderItems = orderDao.getOrderItemsByOrderIds(Collections.singletonList(orderId));
            if (orderItems != null && !orderItems.isEmpty()) {
                for (OrderItem item : orderItems) {
                    if (productDao.releaseReservedStock(item.getProductVariantId(), item.getQuantity()) == 0) {
                        logger.error("释放商品 {} (款式ID: {}) 的预留库存失败，数量: {}",
                                item.getSnapshotProductName(), item.getProductVariantId(), item.getQuantity());
                    } else {
                        logger.info("成功释放商品 {} (款式ID: {}) 的预留库存，数量: {}",
                                item.getSnapshotProductName(), item.getProductVariantId(), item.getQuantity());
                    }
                }
            }
            
            logger.info("订单 {} 已被用户成功取消，并释放了预留库存", orderId);
            return true;
            
        } else if (ORDER_STATUS_PENDING.equals(currentStatus)) {
            logger.info("用户 {} 取消待发货订单 {}", user.getId(), orderId);
            int updatedRows = orderDao.updateOrderStatusByUser(
                    orderId, 
                    user.getId(), 
                    ORDER_STATUS_PENDING, 
                    ORDER_STATUS_CANCELED);
            if (updatedRows != 1) {
                logger.warn("取消订单失败，订单 {} 可能已被其他进程更新", orderId);
                return false;
            }
            logger.info("待发货订单 {} 已被用户成功取消", orderId);
            return true;
        } else {
            String message = "订单当前状态为 '" + currentStatus + "'，不允许取消。只有待支付或待发货状态的订单可以取消。";
            logger.warn("用户 {} 尝试取消状态为 {} 的订单 {}: {}", user.getId(), currentStatus, orderId, message);
            throw new IllegalStateException(message);
        }
    }

    /**
     * 获取当前用户单个订单的详细信息
     * @param user 当前用户
     * @param orderId 订单ID
     * @return 订单详情DTO，如果订单不存在或不属于该用户，则返回null或抛出异常
     */
    @Override
    public OrderDTO getMyOrderDetails(User user, Long orderId) {
        if (orderId == null) {
            logger.warn("getMyOrderDetails called with null orderId for user {}", user.getId());
            throw new IllegalArgumentException("订单ID不能为空。");
        }
        if (user == null || user.getId() == null) {
            logger.error("getMyOrderDetails called with invalid user for orderId: {}", orderId);
            throw new IllegalArgumentException("无效的用户信息。");
        }

        Order order = orderDao.getOrderById(orderId);
        if (order == null) {
            logger.warn("User {} attempted to access non-existent order {}.", user.getId(), orderId);
            return null;
        }


        if (!order.getUserId().equals(user.getId())) {
            logger.warn("User {} attempted to access order {} which belongs to user {}. Access denied.",
                    user.getId(), orderId, order.getUserId());
            return null;
        }
        List<OrderItem> items = orderDao.getOrderItemsByOrderIds(Collections.singletonList(orderId));
        if (items == null) {
            items = Collections.emptyList();
        }

        Long secondsRemaining = null;
        if (ORDER_STATUS_PENDING_PAYMENT.equals(order.getStatus()) && order.getExpiresAt() != null) {
            secondsRemaining = java.time.Duration.between(LocalDateTime.now(), order.getExpiresAt()).getSeconds();
            if (secondsRemaining < 0) {
                secondsRemaining = 0L;
            }
        }
        OrderDTO orderDTO = new OrderDTO(order, items, user);
        orderDTO.setSecondsRemaining(secondsRemaining);

        return orderDTO;
    }
}
