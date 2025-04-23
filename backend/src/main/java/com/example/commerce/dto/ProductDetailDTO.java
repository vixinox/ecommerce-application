package com.example.commerce.dto;

import com.example.commerce.model.ProductVariant;
import lombok.Data;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

@Data
public class ProductDetailDTO {
    private Long id;
    private String name;
    private String category;
    private BigDecimal basePrice;
    private String description;
    private List<String> images;
    private List<String> features;
    private List<ProductSpecifications> specifications;

    private List<ProductVariant> variants;

    public ProductDetailDTO(Long id, String name, String description, String category, BigDecimal basePrice, List<String> images, List<String> features, List<ProductSpecifications> specifications) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.category = category;
        this.basePrice = basePrice;
        this.images = images;
        this.features = features;
        this.specifications = specifications;
        this.images = images != null ? images : Collections.emptyList();
        this.features = features != null ? features : Collections.emptyList();
        this.specifications = specifications != null ? specifications : Collections.emptyList();
        this.variants = Collections.emptyList();
    }

    public Boolean getOverallInStock() {
        return variants != null && variants.stream().anyMatch(ProductVariant::getInStock);
    }

    @Data
    public static class ProductSpecifications {
        private String key;
        private String value;
    }
}