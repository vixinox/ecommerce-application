package com.example.commerce.model;

import lombok.Data;

@Data
public class Product {
    private Long id;
    private Long ownerId;
    private String name;
    private String description;
    private String category;

    private String imagesJson;
    private String featuresJson;
    private String specificationsJson;
}
