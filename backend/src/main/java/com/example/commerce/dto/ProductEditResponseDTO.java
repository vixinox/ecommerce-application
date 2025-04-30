package com.example.commerce.dto;

import com.example.commerce.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductEditResponseDTO {
    private Long id;
    private String name;
    private String category;
    private String description;
    private String featuresJson;
    private String specificationsJson;
    private List<VariantForEditDTO> variants;
    private Map<String, String> colorImageUrls;
    private String status;
    private User ownerInfo;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VariantForEditDTO {
        private Long id;
        private String color;
        private String size;
        private BigDecimal price;
        private Integer stockQuantity;
    }
}