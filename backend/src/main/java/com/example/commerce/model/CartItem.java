package com.example.commerce.model;

import lombok.Data;

import java.time.Instant;

@Data
public class CartItem {
    private Long id;
    private Long userId;
    private Long productVariantId;
    private Integer quantity;
    private Instant addedAt;
}