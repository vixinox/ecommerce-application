package com.example.commerce.service.impl;

import com.example.commerce.dao.OrderDAO;
import com.example.commerce.dao.ProductDAO;
import com.example.commerce.dto.MerchantDashboardDTO;
import com.example.commerce.model.User;
import com.example.commerce.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class DashboardServiceImpl implements DashboardService {

    private final OrderDAO orderDAO;
    private final ProductDAO productDAO;

    // 可以定义常量或从配置读取
    private static final String PENDING_ORDER_STATUS = "待发货";
    private static final String ACTIVE_PRODUCT_STATUS = "ACTIVE";
    private static final int LOW_STOCK_THRESHOLD = 10; // 例如，库存低于10件算低库存

    @Autowired
    public DashboardServiceImpl(OrderDAO orderDAO, ProductDAO productDAO) {
        this.orderDAO = orderDAO;
        this.productDAO = productDAO;
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
} 