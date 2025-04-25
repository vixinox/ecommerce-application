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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderServiceImpl implements OrderService {

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
        newOrder.setStatus("待发货");

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
                throw new RuntimeException("库存扣减失败，商品变体ID: " + item.getProductVariantId() +
                        "，可能是并发导致库存不足。");

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
