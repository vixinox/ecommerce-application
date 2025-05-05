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
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class DashboardServiceImpl implements DashboardService {

    private final OrderDAO orderDAO;
    private final ProductDAO productDAO;
    private final UserDAO userDAO;

    public static final String PRODUCT_STATUS_PENDING = "PENDING";
    public static final String PRODUCT_STATUS_ACTIVE = "ACTIVE";
    private static final String ORDER_STATUS_PENDING = "PENDING";
    private static final int LOW_STOCK_THRESHOLD = 10;
    private static final int DEFAULT_LOW_STOCK_THRESHOLD = 10;

    @Autowired
    public DashboardServiceImpl(OrderDAO orderDAO, ProductDAO productDAO, UserDAO userDAO) {
        this.orderDAO = orderDAO;
        this.productDAO = productDAO;
        this.userDAO = userDAO;
    }

    @Override
    public MerchantDashboardDTO getMerchantDashboardData(User merchant) {
        Long merchantId = merchant.getId();

        Long pendingOrdersCount = orderDAO.countMerchantOrdersByStatus(merchantId, ORDER_STATUS_PENDING);
        Long totalOrdersCount = orderDAO.countTotalMerchantOrders(merchantId);
        BigDecimal totalSalesAmount = orderDAO.calculateTotalMerchantSales(merchantId);

        Long activeProductsCount = productDAO.countMerchantProductsByStatus(merchantId, PRODUCT_STATUS_ACTIVE);
        Long lowStockProductsCount = productDAO.countMerchantLowStockVariants(merchantId, LOW_STOCK_THRESHOLD);

        MerchantDashboardDTO dashboardData = new MerchantDashboardDTO();
        dashboardData.setPendingOrdersCount(pendingOrdersCount != null ? pendingOrdersCount : 0L);
        dashboardData.setTotalOrdersCount(totalOrdersCount != null ? totalOrdersCount : 0L);
        dashboardData.setTotalSalesAmount(totalSalesAmount != null ? totalSalesAmount : BigDecimal.ZERO);
        dashboardData.setActiveProductsCount(activeProductsCount != null ? activeProductsCount : 0L);
        dashboardData.setLowStockProductsCount(lowStockProductsCount != null ? lowStockProductsCount : 0L);

        return dashboardData;
    }

    public AdminDashboardDTO getAdminDashboardData() {
        Long totalUsers = Optional.ofNullable(userDAO.countTotalUsers()).orElse(0L);
        Long newUsersToday = Optional.ofNullable(userDAO.countNewUsersToday()).orElse(0L);
        Long totalProducts = Optional.ofNullable(productDAO.countTotalProducts()).orElse(0L);
        Long productsPendingApproval = Optional.ofNullable(productDAO.countProductsByStatus(PRODUCT_STATUS_PENDING)).orElse(0L);
        Long lowStockVariantsCount = Optional.ofNullable(productDAO.countLowStockVariants(DEFAULT_LOW_STOCK_THRESHOLD)).orElse(0L);
        List<AdminDashboardDTO.CategoryCountDTO> productCategoryCounts = Optional.ofNullable(productDAO.getProductCountByCategory()).orElse(Collections.emptyList());

        Long pendingShipmentOrders = Optional.ofNullable(orderDAO.countOrdersByStatus(ORDER_STATUS_PENDING)).orElse(0L);
        Long totalOrders = Optional.ofNullable(orderDAO.countTotalOrders()).orElse(0L);
        BigDecimal totalRevenue = Optional.ofNullable(orderDAO.calculateTotalRevenue()).orElse(BigDecimal.ZERO);

        List<AdminDashboardDTO.RecentSaleDTO> recentSales = Optional.ofNullable(orderDAO.getRecentSales(30)).orElse(Collections.emptyList());
        List<AdminDashboardDTO.OrderStatusCountDTO> orderStatusCounts = Optional.ofNullable(orderDAO.getOrderStatusCounts()).orElse(Collections.emptyList());

        System.out.println("recentSales: " + recentSales);

        AdminDashboardDTO dto = new AdminDashboardDTO();
        dto.setTotalUsers(totalUsers);
        dto.setTotalProducts(totalProducts);
        dto.setPendingShipmentOrders(pendingShipmentOrders);
        dto.setTotalOrders(totalOrders);
        dto.setTotalRevenue(totalRevenue);
        dto.setProductsPendingApproval(productsPendingApproval);
        dto.setLowStockVariantsCount(lowStockVariantsCount);
        dto.setNewUsersToday(newUsersToday);

        dto.setProductCategoryCounts(productCategoryCounts);
        dto.setRecentSales(recentSales);
        dto.setOrderStatusCounts(orderStatusCounts);

        return dto;
    }
} 