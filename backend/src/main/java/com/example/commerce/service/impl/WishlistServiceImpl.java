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
    private final ProductDAO productDAO;

    @Autowired
    public WishlistServiceImpl(WishlistDAO wishlistDAO, ProductDAO productDAO) {
        this.wishlistDAO = wishlistDAO;
        this.productDAO = productDAO;
    }

    @Override
    @Transactional
    public boolean addToWishlist(User user, Long productId) {

        Product product = productDAO.getProductById(productId);
        if (product == null) {
            throw new IllegalArgumentException("商品不存在，无法添加到愿望单: ID = " + productId);
        }

        if (wishlistDAO.checkIfExists(user.getId(), productId) != null) {
            throw new IllegalArgumentException("商品已在愿望单中: ID = " + productId);
        }

        try {
            int result = wishlistDAO.addItem(user.getId(), productId);
            return result == 1;
        } catch (Exception e) {
            System.err.println("Error adding product " + productId + " to wishlist for user " + user.getId() + ": " + e.getMessage());
            if (wishlistDAO.checkIfExists(user.getId(), productId) != null) {
                return false;
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
        return items.stream()
                .map(WishlistItemDTO::new)
                .collect(Collectors.toList());
    }
} 