package com.example.commerce.service;

import com.example.commerce.dto.WishlistItemDTO;
import com.example.commerce.model.User;

import java.util.List;

public interface WishlistService {

    /**
     * 将商品添加到用户的愿望单
     * @param user 用户对象
     * @param productId 商品ID
     * @return 添加成功返回 true, 如果已存在则返回 false (或根据需要抛出异常)
     * @throws RuntimeException 如果添加过程中发生错误
     */
    boolean addToWishlist(User user, Long productId);

    /**
     * 从用户的愿望单中移除商品
     * @param user 用户对象
     * @param productId 商品ID
     * @return 移除成功返回 true, 如果不存在则返回 false
     * @throws RuntimeException 如果移除过程中发生错误
     */
    boolean removeFromWishlist(User user, Long productId);

    /**
     * 获取用户的愿望单列表
     * @param user 用户对象
     * @return 包含 WishlistItemDTO 的列表
     */
    List<WishlistItemDTO> getWishlist(User user);

} 