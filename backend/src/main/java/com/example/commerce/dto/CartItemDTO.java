package com.example.commerce.dto;

import com.example.commerce.model.ProductVariant;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CartItemDTO {
    private Long cartId;
    private String productName;
    private String productCategory;

    private ProductVariant productVariant;
    private Long quantity;
}