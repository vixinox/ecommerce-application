package com.example.commerce.dao;

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
    List<ProductDTO> getRandomProducts(@Param("size") int size);

    /**
     * 搜索商品
     *
     * @param category 商品类目
     * @param keyword  关键词
     * @return 商品 DTO 列表
     */
    List<ProductDTO> searchProducts(@Param("category") String category, @Param("keyword") String keyword);

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
}