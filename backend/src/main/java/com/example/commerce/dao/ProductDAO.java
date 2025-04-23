package com.example.commerce.dao;

import com.example.commerce.model.CartItem;
import com.example.commerce.model.Product;
import com.example.commerce.model.ProductVariant;
import org.apache.ibatis.annotations.*;

import java.util.List;

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
            "SELECT id, name, category, price, images_json ",
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
    @Select("SELECT id, name, category, price, images_json " +
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

    @Insert("INSERT INTO cart_items (user_id, product_variant_id, quantity) " +
            "VALUES (#{userId}, #{productVariantId}, #{quantity})")
    void addCardItem(Long userId, Long productVariantId, Long quantity);

    @Delete("DELETE FROM cart_items WHERE user_id = #{userId} AND id = #{cartId}")
    void removeCardItem(Long userId, Long cartId);


    @Results({
            @Result(column = "user_id", property = "userId"),
            @Result(column = "product_variant_id", property = "productVariantId"),
    })
    @Select("SELECT * FROM cart_items WHERE id = #{id}")
    CartItem findCartItemByCartId(Long cartId);

    @Results({
            @Result(column = "user_id", property = "userId"),
            @Result(column = "product_variant_id", property = "productVariantId"),
    })
    @Select("SELECT * FROM cart_items WHERE user_id = #{id}")
    List<CartItem> getCartItemByUserId(Long userId);

    @Update("UPDATE cart_items SET quantity = #{quantity} WHERE id = #{cartId}")
    void updateCardItem(Long cartId, Long quantity);

    @Delete("DELETE FROM cart_items WHERE user_id = #{userId}")
    void clearCart(Long userId);

    @Select("SELECT * FROM cart_items WHERE user_id = #{userId} AND product_variant_id = #{productVariantId}")
    CartItem findCartItemByVariantId(Long userId, Long productVariantId);
}