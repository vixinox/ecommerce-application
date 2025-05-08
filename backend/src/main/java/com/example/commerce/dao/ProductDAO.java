package com.example.commerce.dao;

import com.example.commerce.dto.AdminDashboardDTO;
import com.example.commerce.dto.ProductDTO;
import com.example.commerce.dto.ProductDetailDTO;
import com.example.commerce.model.Product;
import com.example.commerce.model.ProductVariant;
import org.apache.ibatis.annotations.*;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Mapper
public interface ProductDAO {

    /**
     * 获取包含商品变体的商品详情
     *
     * @param productId 商品ID
     * @return 商品详情 DTO
     */
    Optional<ProductDetailDTO> getProductDetailWithVariants(@Param("productId") Long productId);

    /**
     * 根据商品ID集合查找商品变体
     *
     * @param productIds 商品ID 集合
     * @return 商品变体列表
     */
    List<ProductVariant> findVariantsByProductIds(@Param("productIds") Set<Long> productIds);

    /**
     * 查找商品
     *
     * @param category 商品类目
     * @param keyword  关键词
     * @return 商品列表
     */
    List<Product> findProducts(@Param("category") String category, @Param("keyword") String keyword);

    /**
     * 根据ID获取商品变体
     *
     * @param productVariantId 商品变体ID
     * @return 商品变体
     */
    ProductVariant getVariantById(Long productVariantId);

    /**
     * 扣减库存
     *
     * @param variantId 商品变体ID
     * @param quantity  扣减数量
     * @return 受影响的行数
     */
    @Update("UPDATE product_variants SET stock_quantity = stock_quantity - #{quantity}, updated_at = NOW() WHERE id = #{variantId} AND stock_quantity >= #{quantity}")
    int deductStock(@Param("variantId") Long variantId, @Param("quantity") Integer quantity);

    /**
     * 预留库存：增加预留数量。
     * 条件：确保可用库存 (stock_quantity - reserved_quantity) 大于等于预留数量。
     *
     * @param variantId 商品变体ID
     * @param quantity  要预留的数量
     * @return 受影响的行数 (成功为1, 失败为0)
     */
    @Update("UPDATE product_variants SET reserved_quantity = reserved_quantity + #{quantity}, updated_at = NOW() " +
            "WHERE id = #{variantId} AND (stock_quantity - reserved_quantity) >= #{quantity}")
    int reserveStock(@Param("variantId") Long variantId, @Param("quantity") Integer quantity);

    /**
     * 释放预留库存：减少预留数量。
     * 条件：确保预留数量大于等于要释放的数量。
     *
     * @param variantId 商品变体ID
     * @param quantity  要释放的数量
     * @return 受影响的行数 (成功为1, 失败为0)
     */
    @Update("UPDATE product_variants SET reserved_quantity = reserved_quantity - #{quantity}, updated_at = NOW() " +
            "WHERE id = #{variantId} AND reserved_quantity >= #{quantity}")
    int releaseReservedStock(@Param("variantId") Long variantId, @Param("quantity") Integer quantity);

    /**
     * 确认库存扣减：从总库存和预留库存中同时扣减。
     * 条件：确保总库存和预留库存都大于等于要扣减的数量。
     *
     * @param variantId 商品变体ID
     * @param quantity  要扣减的数量
     * @return 受影响的行数 (成功为1, 失败为0)
     */
    @Update("UPDATE product_variants SET stock_quantity = stock_quantity - #{quantity}, reserved_quantity = reserved_quantity - #{quantity}, updated_at = NOW() " +
            "WHERE id = #{variantId} AND reserved_quantity >= #{quantity} AND stock_quantity >= #{quantity}")
    int confirmStockDeduction(@Param("variantId") Long variantId, @Param("quantity") Integer quantity);

    /**
     * 插入商品
     *
     * @param product 商品对象
     */
    @Insert("INSERT INTO products (owner_id, name, description, category, features, specifications, created_at, updated_at) VALUES (#{ownerId}, #{name}, #{description}, #{category}, #{features}, #{specifications}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertProduct(Product product);

    /**
     * 批量插入商品变体
     *
     * @param variants 商品变体列表
     */
    void insertProductVariants(List<ProductVariant> variants);

    /**
     * 获取商品变体图片
     *
     * @param productVariantId 商品变体ID
     * @return 图片 URL
     */
    @Select("SELECT image FROM product_variants WHERE id = #{productVariantId}")
    String getProductVariantImage(Long productVariantId);

    /**
     * 获取随机商品
     *
     * @param size 数量
     * @return 商品DTO列表
     */
    List<ProductDTO> getRandomProducts(@Param("size") int size, @Param("userId") Long userId);

    /**
     * 搜索商品
     *
     * @param category 商品类目
     * @param keyword  关键词
     * @return 商品 DTO 列表
     */
    List<ProductDTO> searchProducts(@Param("category") String category, @Param("keyword") String keyword, @Param("minPrice") Double minPrice, @Param("maxPrice") Double maxPrice, @Param("userId") Long userId);

    /**
     * 根据ID获取商品
     *
     * @param productId 商品ID
     * @return 商品对象
     */
    @Select("SELECT * FROM products WHERE id = #{productId}")
    Product getProductById(Long productId);

    List<Product> getProductByOwner(Long id);

    @Select("SELECT * FROM products WHERE id = #{productId}")
    Optional<Product> findProductById(Long productId);

    @Select("SELECT * FROM product_variants WHERE product_id = #{productId}")
    List<ProductVariant> getVariantsByProductId(Long productId);

    @Select("SELECT id FROM product_variants WHERE product_id = #{productId}")
    List<Long> getVariantIdsByProductId(Long productId);

    void deleteVariantsByIds(List<Long> variantIdsToDelete);

    void clearVariantImagesByProductAndColors(Long productId, List<String> deletedColors);

    void updateProduct(Product productToUpdate);

    void updateProductVariants(List<ProductVariant> variantsToUpdate);

    @Delete("DELETE FROM products WHERE id = #{productId}")
    void deleteProduct(Long productId);

    /**
     * 统计商家在售商品数量
     * @param merchantId 商家ID
     * @param status 商品状态 (例如 "ACTIVE")
     * @return 商品数量
     */
    @Select("SELECT COUNT(*) FROM products WHERE owner_id = #{merchantId} AND status = #{status}")
    Long countMerchantProductsByStatus(@Param("merchantId") Long merchantId, @Param("status") String status);

    /**
     * 统计商家库存低于指定阈值的商品变体数量
     * @param merchantId 商家ID
     * @param threshold 库存阈值
     * @return 低库存商品变体数量
     */
    @Select("SELECT COUNT(pv.id) FROM product_variants pv " +
            "JOIN products p ON pv.product_id = p.id " +
            "WHERE p.owner_id = #{merchantId} AND pv.stock_quantity < #{threshold}")
    Long countMerchantLowStockVariants(@Param("merchantId") Long merchantId, @Param("threshold") int threshold);

    List<Product> findAllProductsAdmin(@Param("statusFilter") String statusFilter);

    @Update("UPDATE products SET status = #{status}, updated_at = CURRENT_TIMESTAMP WHERE id = #{productId}")
    void updateProductStatus(@Param("productId") Long productId, @Param("status") String status);

    // 添加统计总商品数的方法
    @Select("SELECT COUNT(*) FROM products")
    Long countTotalProducts();

    // 添加按状态统计商品数的方法
    @Select("SELECT COUNT(*) FROM products WHERE status = #{status}")
    Long countProductsByStatus(@Param("status") String status);

    // 添加统计低库存变体数的方法
    @Select("SELECT COUNT(*) FROM product_variants WHERE stock_quantity < #{threshold}")
    Long countLowStockVariants(@Param("threshold") int threshold);

    // 添加按分类统计商品数量的方法 (排除 DELETED)
    @Select("SELECT category, COUNT(*) as count FROM products WHERE status != 'DELETED' GROUP BY category ORDER BY count DESC")
    List<AdminDashboardDTO.CategoryCountDTO> getProductCountByCategory();

    List<Product> searchProductsAdmin(@Param("criteria") com.example.commerce.dto.ProductSearchCriteria criteria);
}