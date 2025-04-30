package com.example.commerce.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UploadProductDTO {
    private Long id;
    private String name;
    private String category;
    private String description;
    private String featuresJson;
    private String specificationsJson;
    private List<UploadVariantDTO> variants;
    private Map<String, MultipartFile> colorImages;
    private String status;

    private List<String> deletedColors;
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UploadVariantDTO {
        private String id;
        private String color;
        private String size;
        private BigDecimal price;
        private Integer stockQuantity;
    }
}