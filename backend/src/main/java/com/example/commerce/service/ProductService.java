package com.example.commerce.service;

import com.example.commerce.dto.CartItemDTO;
import com.example.commerce.dto.ProductDTO;
import com.example.commerce.dto.ProductDetailDTO;
import com.github.pagehelper.PageInfo;

import java.util.List;
import java.util.Optional;

public interface ProductService {
    Optional<ProductDetailDTO> getProductDetail(Long productId);

    PageInfo<ProductDTO> listProducts(int pageNum, int pageSize, String category, String keyword);

    List<ProductDTO> getRandomProducts(int size);

    void addToCart(Long userId, Long productVariantId, Long quantity);

    void updateCart(Long userId, Long cartId, Long variantId, Long quantity);

    void removeFromCart(Long userId, Long cartId);

    void clearCart(Long id);

    List<CartItemDTO>  getCartItem(Long id);
}