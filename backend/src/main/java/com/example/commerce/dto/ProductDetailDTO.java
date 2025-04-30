package com.example.commerce.dto;

import com.example.commerce.model.ProductVariant;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
public class ProductDetailDTO {
    private Long id;
    private String name;
    private String category;
    private BigDecimal minPrice;
    private String description;
    private String features;
    private String specifications;
    private List<ProductVariant> variants;
}