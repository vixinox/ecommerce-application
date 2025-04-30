package com.example.commerce.service.impl;

import com.example.commerce.dao.ProductDAO;
import com.example.commerce.dao.WishlistDAO;
import com.example.commerce.dto.WishlistItemDTO;
import com.example.commerce.model.Product;
import com.example.commerce.model.User;
import com.example.commerce.model.WishlistItem;
import com.example.commerce.service.WishlistService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class WishlistServiceImpl implements WishlistService {

    private final WishlistDAO wishlistDAO;
    private final ProductDAO productDAO; // 需要用来校验商品是否存在

    @Autowired
    public WishlistServiceImpl(WishlistDAO wishlistDAO, ProductDAO productDAO) {
        this.wishlistDAO = wishlistDAO;
        this.productDAO = productDAO;
    }

    @Override
    @Transactional
    public boolean addToWishlist(User user, Long productId) {
        // 1. 校验商品是否存在
        Product product = productDAO.getProductById(productId);
        if (product == null) {
            throw new IllegalArgumentException("商品不存在，无法添加到愿望单: ID = " + productId);
        }

        // 2. 检查是否已在愿望单中
        if (wishlistDAO.checkIfExists(user.getId(), productId) != null) {
            System.out.println("Product " + productId + " already exists in wishlist for user " + user.getId());
            return false; // 表示已存在，未执行添加
        }

        // 3. 添加到数据库
        try {
            int result = wishlistDAO.addItem(user.getId(), productId);
            return result == 1;
        } catch (Exception e) {
            // 处理可能的数据库异常，例如违反唯一约束（虽然前面检查过，但并发下可能发生）
            System.err.println("Error adding product " + productId + " to wishlist for user " + user.getId() + ": " + e.getMessage());
            // 可以选择再次检查是否存在，或者直接抛出运行时异常
            if (wishlistDAO.checkIfExists(user.getId(), productId) != null) {
                return false; // 确认是已存在导致的失败
            }
            throw new RuntimeException("添加愿望单失败", e);
        }
    }

    @Override
    @Transactional
    public boolean removeFromWishlist(User user, Long productId) {
        int result = wishlistDAO.removeItem(user.getId(), productId);
        if (result == 0) {
            System.out.println("Product " + productId + " not found in wishlist for user " + user.getId() + ", removal skipped.");
        }
        return result > 0;
    }

    @Override
    public List<WishlistItemDTO> getWishlist(User user) {
        List<WishlistItem> items = wishlistDAO.getUserWishlist(user.getId());
        if (items == null || items.isEmpty()) {
            return Collections.emptyList();
        }

        // DAO 查询已经包含了 Product 信息，直接映射到 DTO
        return items.stream()
                .map(WishlistItemDTO::new) // 使用 DTO 的构造函数进行转换
                .collect(Collectors.toList());
    }
} 