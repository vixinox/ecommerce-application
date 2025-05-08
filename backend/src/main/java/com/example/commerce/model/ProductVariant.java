package com.example.commerce.model;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ProductVariant {
    private Long id;
    private Long productId;
    private String color;
    private String size;
    private BigDecimal price;
    private String image;
    private Integer stockQuantity;
    private Integer reservedQuantity;
    private Boolean inStock;
}