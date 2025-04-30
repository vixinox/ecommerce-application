package com.example.commerce.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardDTO {
    private Long totalUsers;
    private Long totalProducts;
    private Long pendingShipmentOrders; // 待发货订单数
    private Long totalOrders;
    private BigDecimal totalRevenue; // 总销售额
    private Long productsPendingApproval; // 待审核商品数
    private Long lowStockVariantsCount; // 低库存变体数
    private Long newUsersToday; // 今日新增用户数
    private List<CategoryCountDTO> productCountByCategory; // 按分类统计商品数量
    // 可以根据需要添加更多字段，例如：
    // private Long newUsersLast24h;
} 