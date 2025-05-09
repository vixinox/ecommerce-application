package com.example.commerce.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Optional;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductSearchCriteria {
    private Long productId;
    private String name;
    private String categoryName;
    private String status;
    private Double minPrice;
    private Double maxPrice;
    private Optional<LocalDate> dateAddedStart;
    private Optional<LocalDate> dateAddedEnd;
} 