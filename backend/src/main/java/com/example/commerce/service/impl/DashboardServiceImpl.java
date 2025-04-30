package com.example.commerce.service.impl;

import com.example.commerce.dao.OrderDAO;
import com.example.commerce.dao.ProductDAO;
import com.example.commerce.dao.UserDAO;
import com.example.commerce.dto.AdminDashboardDTO;
import com.example.commerce.dto.MerchantDashboardDTO;
import com.example.commerce.model.User;
import com.example.commerce.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Optional;

@Service
public class DashboardServiceImpl implements DashboardService {

    private final OrderDAO orderDAO;
    private final ProductDAO productDAO;
    private final UserDAO userDAO;

    // 可以定义常量或从配置读取
    private static final String PENDING_ORDER_STATUS = "待发货";
    private static final String ACTIVE_PRODUCT_STATUS = "ACTIVE";
    private static final int LOW_STOCK_THRESHOLD = 10; // 例如，库存低于10件算低库存
    private static final String PENDING_SHIPMENT_STATUS = "待发货";
    private static final int DEFAULT_LOW_STOCK_THRESHOLD = 10; // 默认低库存阈值

    @Autowired
    public DashboardServiceImpl(OrderDAO orderDAO, ProductDAO productDAO, UserDAO userDAO) {
        this.orderDAO = orderDAO;
        this.productDAO = productDAO;
        this.userDAO = userDAO;
    }

    @Override
    public MerchantDashboardDTO getMerchantDashboardData(User merchant) {
        Long merchantId = merchant.getId();

        // 1. 查询订单相关统计
        Long pendingOrdersCount = orderDAO.countMerchantOrdersByStatus(merchantId, PENDING_ORDER_STATUS);
        Long totalOrdersCount = orderDAO.countTotalMerchantOrders(merchantId);
        BigDecimal totalSalesAmount = orderDAO.calculateTotalMerchantSales(merchantId);

        // 2. 查询商品相关统计
        Long activeProductsCount = productDAO.countMerchantProductsByStatus(merchantId, ACTIVE_PRODUCT_STATUS);
        Long lowStockProductsCount = productDAO.countMerchantLowStockVariants(merchantId, LOW_STOCK_THRESHOLD);

        // 3. 组装 DTO
        MerchantDashboardDTO dashboardData = new MerchantDashboardDTO();
        dashboardData.setPendingOrdersCount(pendingOrdersCount != null ? pendingOrdersCount : 0L);
        dashboardData.setTotalOrdersCount(totalOrdersCount != null ? totalOrdersCount : 0L);
        dashboardData.setTotalSalesAmount(totalSalesAmount != null ? totalSalesAmount : BigDecimal.ZERO);
        dashboardData.setActiveProductsCount(activeProductsCount != null ? activeProductsCount : 0L);
        dashboardData.setLowStockProductsCount(lowStockProductsCount != null ? lowStockProductsCount : 0L);

        return dashboardData;
    }

    @Override
    public AdminDashboardDTO getAdminDashboardData() {
        // 1. 获取用户总数
        Long totalUsers = Optional.ofNullable(userDAO.countTotalUsers()).orElse(0L);

        // 2. 获取商品统计
        Long totalProducts = Optional.ofNullable(productDAO.countTotalProducts()).orElse(0L);
        // 使用 ProductServiceImpl 定义的常量
        Long pendingApprovalProducts = Optional.ofNullable(productDAO.countProductsByStatus(ProductServiceImpl.PRODUCT_STATUS_PENDING)).orElse(0L);
        Long lowStockVariants = Optional.ofNullable(productDAO.countLowStockVariants(DEFAULT_LOW_STOCK_THRESHOLD)).orElse(0L);

        // 3. 获取订单统计
        Long pendingShipmentOrders = Optional.ofNullable(orderDAO.countOrdersByStatus(PENDING_SHIPMENT_STATUS)).orElse(0L);
        Long totalOrders = Optional.ofNullable(orderDAO.countTotalOrders()).orElse(0L);
        BigDecimal totalRevenue = Optional.ofNullable(orderDAO.calculateTotalRevenue()).orElse(BigDecimal.ZERO);

        // 4. 组装 DTO
        AdminDashboardDTO dto = new AdminDashboardDTO();
        dto.setTotalUsers(totalUsers);
        dto.setTotalProducts(totalProducts);
        dto.setPendingShipmentOrders(pendingShipmentOrders);
        dto.setTotalOrders(totalOrders);
        dto.setTotalRevenue(totalRevenue);
        dto.setProductsPendingApproval(pendingApprovalProducts); // 设置新字段
        dto.setLowStockVariantsCount(lowStockVariants); // 设置新字段

        return dto;
    }
} 