package com.example.commerce.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MerchantDashboardDTO {

    // 订单相关
    private Long pendingOrdersCount; // 待处理订单数 (例如 "待发货")
    private Long totalOrdersCount;   // 总订单数
    private BigDecimal totalSalesAmount; // 总销售额 (只计算该商家的商品部分)

    // 商品相关
    private Long activeProductsCount; // 在售商品数量
    private Long lowStockProductsCount; // 低库存商品数量 (可选)

    // 可以根据需要添加更多字段，例如：
    // private Long shippedOrdersCount; // 已发货订单数
    // private BigDecimal averageOrderValue; // 平均订单价值 (商家部分)
} 