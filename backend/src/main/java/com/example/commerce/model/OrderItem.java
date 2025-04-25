package com.example.commerce.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderItem {
    private Long id;
    private Long orderId;
    private Long productId;
    private Long productVariantId;
    private Integer quantity;
    private BigDecimal purchasedPrice;
    private String snapshotProductName;
    private String snapshotVariantColor;
    private String snapshotVariantSize;
    private String snapshotVariantImage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}