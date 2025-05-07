package com.example.commerce.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Optional;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductSearchCriteria {
    private Long productId;
    private String name; // 商品名称 (模糊搜索)
    private String categoryName; // 分类名称 (模糊搜索)
    private String status; // 商品状态 (精确匹配, e.g., AVAILABLE, UNAVAILABLE, DELETED)
    private Double minPrice; // 最低价格
    private Double maxPrice; // 最高价格
    private Optional<LocalDate> dateAddedStart; // 上架日期范围开始
    private Optional<LocalDate> dateAddedEnd; // 上架日期范围结束
} 