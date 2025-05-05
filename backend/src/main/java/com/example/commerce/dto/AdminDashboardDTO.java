package com.example.commerce.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardDTO {
    private Long totalUsers;
    private Long totalProducts;
    private Long totalOrders;
    private BigDecimal totalRevenue;

    private Long pendingShipmentOrders;
    private Long productsPendingApproval;
    private Long lowStockVariantsCount;
    private Long newUsersToday;

    private List<RecentSaleDTO> recentSales;
    private List<CategoryCountDTO> productCategoryCounts;
    private List<OrderStatusCountDTO> orderStatusCounts;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentSaleDTO {
        private String date;
        private BigDecimal amount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryCountDTO {
        private String category;
        private Long count;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderStatusCountDTO {
        private String status;
        private Long count;
    }
}