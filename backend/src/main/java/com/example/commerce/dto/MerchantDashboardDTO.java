package com.example.commerce.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MerchantDashboardDTO {
    private Long pendingOrdersCount;
    private Long totalOrdersCount;
    private BigDecimal totalSalesAmount;

    private Long activeProductsCount;
    private Long lowStockProductsCount;

    public List<SalesDataPoint> salesOverviewData;
    public List<RecentOrderDTO> recentOrders;

    @Data
    public static class SalesDataPoint {
        public String period;
        public BigDecimal amount;
    }

    @Data
    public static class RecentOrderDTO {
        public Long orderId;
        public LocalDateTime orderDate;
        public BigDecimal totalAmount;
        public String status;
        public String customerUsername;
    }
} 