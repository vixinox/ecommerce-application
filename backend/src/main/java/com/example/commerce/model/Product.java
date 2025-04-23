package com.example.commerce.model;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class Product {
    private Long id;
    private String name;
    private String description;
    private String category;
    private BigDecimal price;

    private String imagesJson;
    private String featuresJson;
    private String specificationsJson;
}
