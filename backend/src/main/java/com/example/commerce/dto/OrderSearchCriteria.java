package com.example.commerce.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderSearchCriteria {
    private Long orderId;
    private Long userId;
    private String username; // For searching by buyer's username
    private String productName; // For searching by product name in order items
    private String status;
    private LocalDate dateFrom;
    private LocalDate dateTo;
    // Consider adding fields for merchant-specific searches if needed, e.g., merchantId
} 