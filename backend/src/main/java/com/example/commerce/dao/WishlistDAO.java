package com.example.commerce.dao;

import com.example.commerce.model.WishlistItem;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface WishlistDAO {

    /**
     * 将商品添加到用户的愿望单
     * @param userId 用户ID
     * @param productId 商品ID
     * @return 插入的行数 (成功为1, 如果已存在则根据数据库约束可能抛异常或返回0)
     */
    @Insert("INSERT INTO wishlist_items (user_id, product_id, added_at) VALUES (#{userId}, #{productId}, NOW())")
    int addItem(@Param("userId") Long userId, @Param("productId") Long productId);

    /**
     * 从用户的愿望单中移除商品
     * @param userId 用户ID
     * @param productId 商品ID
     * @return 删除的行数
     */
    @Delete("DELETE FROM wishlist_items WHERE user_id = #{userId} AND product_id = #{productId}")
    int removeItem(@Param("userId") Long userId, @Param("productId") Long productId);

    /**
     * 获取用户愿望单中的所有商品项 (包含关联的商品基本信息)
     * @param userId 用户ID
     * @return WishlistItem 列表，每个项包含 Product 对象
     */
    List<WishlistItem> getUserWishlist(@Param("userId") Long userId);

    /**
     * 检查用户的愿望单中是否已存在某个商品
     * @param userId 用户ID
     * @param productId 商品ID
     * @return 如果存在返回 WishlistItem 对象，否则返回 null
     */
    @Select("SELECT id, user_id, product_id, added_at FROM wishlist_items WHERE user_id = #{userId} AND product_id = #{productId}")
    @Results({
            @Result(property = "id", column = "id"),
            @Result(property = "userId", column = "user_id"),
            @Result(property = "productId", column = "product_id"),
            @Result(property = "addedAt", column = "added_at")
    })
    WishlistItem checkIfExists(@Param("userId") Long userId, @Param("productId") Long productId);

} 