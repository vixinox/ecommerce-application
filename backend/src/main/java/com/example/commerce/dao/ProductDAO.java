package com.example.commerce.dao;

import com.example.commerce.model.Product;
import com.example.commerce.model.ProductVariant;
import org.apache.ibatis.annotations.*;

import java.util.List;
import java.util.Set;

@Mapper
public interface ProductDAO {
    @Results({
            @Result(column = "images_json", property = "imagesJson"),
            @Result(column = "features_json", property = "featuresJson"),
            @Result(column = "specifications_json", property = "specificationsJson"),
    })
    @Select("SELECT id, name, description, category, price, " +
            "images_json, specifications_json, features_json " +
            "FROM products WHERE id = #{id}")
    Product getProductById(@Param("id") Long id);

    /**
     * 根据商品ID获取其所有变体信息。
     *
     * @param productId 商品ID
     * @return 商品变体列表
     */
    @Results({
            @Result(column = "in_stock", property = "inStock"),
            @Result(column = "stock_quantity", property = "stockQuantity"),
    })
    @Select("SELECT id, product_id, color, size, price, image, stock_quantity, in_stock " +
            "FROM product_variants WHERE product_id = #{productId}")
    List<ProductVariant> findVariantsByProductId(@Param("productId") Long productId);

    /**
     * 根据一批商品IDs批量获取其所有变体信息。
     * 用于在列表页查询商品时，批量获取价格等变体信息，避免N+1问题。
     *
     * @param productIds 商品ID集合
     * @return 商品变体列表
     */
    @Results({
            @Result(column = "in_stock", property = "inStock"),
            @Result(column = "stock_quantity", property = "stockQuantity"),
            @Result(column = "product_id", property = "productId"),
    })
    @Select({
            "<script>",
            "SELECT id, product_id, color, size, price, image, stock_quantity, in_stock ",
            "FROM product_variants WHERE product_id IN",
            "<foreach item='productId' collection='productIds' open='(' separator=',' close=')'>",
            "#{productId}",
            "</foreach>",
            "</script>"
    })
    List<ProductVariant> findVariantsByProductIds(@Param("productIds") Set<Long> productIds);

    /**
     * 分页查询商品列表，可根据分类和关键词过滤。
     * 注意：此方法只返回 Product 的基本信息，ไม่包括大型 JSON 字段，以提高列表页性能。
     * JSON 字段会在获取详情时加载。
     * 分页由 Service 层或 MyBatis interceptor 处理 (如 PageHelper)。此处仅提供查询语句。
     *
     * @param category 分类名称 (可选)
     * @param keyword  搜索关键词 (可选)
     * @return 商品基本信息列表
     */
    @Result(column = "images_json", property = "imagesJson")
    @Select({
            "<script>",
            "SELECT id, name, category, images_json ",
            "FROM products",
            "<where>",
            "   <if test='category != null and category != \"\"'>",
            "       AND category = #{category}",
            "   </if>",
            "   <if test='keyword != null and keyword != \"\"'>",
            "       AND (name LIKE CONCAT('%', #{keyword}, '%') OR description LIKE CONCAT('%', #{keyword}, '%'))",
            "   </if>",
            "</where>",
            "</script>"
    })
    List<Product> findProducts(@Param("category") String category, @Param("keyword") String keyword);

    @Result(column = "images_json", property = "imagesJson")
    @Select("SELECT id, name, category, images_json " +
            "FROM products " +
            "ORDER BY RAND() " +
            "LIMIT #{size}")
    List<Product> findRandomProducts(@Param("size") int size);

    @Results({
            @Result(column = "stock_quantity", property = "stockQuantity"),
            @Result(column = "product_id", property = "productId"),
    })
    @Select("SELECT * FROM product_variants WHERE id = #{id}")
    ProductVariant getVariantById(Long productVariantId);

    @Update("UPDATE product_variants SET stock_quantity = stock_quantity - #{quantity}, updated_at = NOW() WHERE id = #{variantId} AND stock_quantity >= #{quantity}")
    int deductStock(@Param("variantId") Long variantId, @Param("quantity") Integer quantity);
}