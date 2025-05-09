package com.example.commerce.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderSearchDTO {
    private Long orderId;
    private Long userId;
    private String username;
    private String productName;
    private String status;
    private LocalDate dateFrom;
    private LocalDate dateTo;
}