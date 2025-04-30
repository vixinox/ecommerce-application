package com.example.commerce.dao;

import com.example.commerce.model.CartItem;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface CartDAO {
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
