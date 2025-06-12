package com.example.commerce.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductDTO {
    private Long id;
    private String name;
    private String category;
    private String defaultImage;
    private BigDecimal minPrice;
    private boolean isWishlisted;
    private String description;
}