package com.example.commerce.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ProductDTO {
    private Long id;
    private String name;
    private String category;
    private BigDecimal price;
    private String image;
}