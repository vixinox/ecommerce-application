package com.example.commerce.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MerchantDashboardDTO {
    private Long pendingOrdersCount;
    private Long totalOrdersCount;
    private BigDecimal totalSalesAmount;

    private Long activeProductsCount;
    private Long lowStockProductsCount;
} 