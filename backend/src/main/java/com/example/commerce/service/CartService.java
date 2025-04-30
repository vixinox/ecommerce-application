package com.example.commerce.service;

import com.example.commerce.dto.CartItemDTO;

import java.util.List;

public interface CartService {

    void addToCart(Long userId, Long productVariantId, Long quantity);

    void updateCart(Long userId, Long cartId, Long variantId, Long quantity);

    void removeFromCart(Long userId, Long cartId);

    void clearCart(Long id);

    List<CartItemDTO> getCartItem(Long id);
}
