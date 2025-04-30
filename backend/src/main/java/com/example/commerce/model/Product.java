package com.example.commerce.model;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class Product {
    private Long id;
    private Long ownerId;
    private String name;
    private String description;
    private String category;
    private String defaultImage;
    private BigDecimal minPrice;

    private String features;
    private String specifications;

    private String status;
    private Integer totalStock;
}