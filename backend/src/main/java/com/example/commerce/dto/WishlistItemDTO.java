package com.example.commerce.dto;

import com.example.commerce.model.WishlistItem;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * 用于前端展示的愿望单项目 DTO
 */
@Data
@NoArgsConstructor
public class WishlistItemDTO {
    private Long wishlistItemId; // Wishlist item 的 ID
    private Long productId;
    private Instant addedAt;

    // 关联的产品信息
    private String productName;
    private String productCategory;
    private String productDefaultImage;
    private BigDecimal productMinPrice;

    /**
     * 从 WishlistItem (包含关联 Product) 构造 DTO
     * @param item DAO 查询返回的 WishlistItem 对象，需确保其 product 字段已被填充
     */
    public WishlistItemDTO(WishlistItem item) {
        this.wishlistItemId = item.getId();
        this.productId = item.getProductId();
        this.addedAt = item.getAddedAt();

        if (item.getProduct() != null) {
            this.productName = item.getProduct().getName();
            this.productCategory = item.getProduct().getCategory();
            this.productDefaultImage = item.getProduct().getDefaultImage();
            this.productMinPrice = item.getProduct().getMinPrice();
        }
    }
} 