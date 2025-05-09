package com.example.commerce.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpendingReportDTO {
    private BigDecimal totalSpend;
    private Long totalOrders;
    private BigDecimal averageOrderValue;

    private List<TimeBasedSpend> monthlySpendTrend;
    private List<CategorySpend> categorySpend;
    private List<ItemSpend> topItemSpend;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimeBasedSpend {
        private String period;
        private BigDecimal amount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategorySpend {
        private String category;
        private BigDecimal amount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemSpend {
        private String name;
        private String variant;
        private BigDecimal spend;
        private Integer quantity;
    }
}