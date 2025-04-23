package com.example.commerce.model;
import lombok.Data;
import java.time.Instant;

@Data
public class WishlistItem {
    private Long id;
    private Long userId;
    private Long productId;
    private Instant addedAt;

    private Product product;
}