package com.example.commerce.service.impl;

import com.example.commerce.dao.CartDAO;
import com.example.commerce.dao.ProductDAO;
import com.example.commerce.dto.CartItemDTO;
import com.example.commerce.model.CartItem;
import com.example.commerce.model.Product;
import com.example.commerce.model.ProductVariant;
import com.example.commerce.service.CartService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class CartServiceImpl implements CartService {
    private final CartDAO cartDAO;
    private final ProductDAO productDAO;

    public CartServiceImpl(CartDAO cartDAO, ProductDAO productDAO) {
        this.cartDAO = cartDAO;
        this.productDAO = productDAO;
    }

    @Override
    public List<CartItemDTO> getCartItem(Long userId) {
        List<CartItem> cartItems = cartDAO.getCartItemByUserId(userId);
        List<CartItemDTO> cartItemDTOs = new ArrayList<>();

        if (cartItems == null || cartItems.isEmpty()) return cartItemDTOs;

        for (CartItem cartItem : cartItems) {
            Long productVariantId = cartItem.getProductVariantId();
            if (productVariantId == null) {
                System.err.println("Warning: Cart item ID " + cartItem.getId() + " for user " + userId + " has no product variant ID.");
                continue;
            }

            ProductVariant productVariant = productDAO.getVariantById(productVariantId);
            if (productVariant == null) {
                System.err.println("Warning: Product variant ID " + productVariantId + " linked from cart item ID " + cartItem.getId() + " not found.");
                continue;
            }

            Long productId = productVariant.getProductId();
            if (productId == null) {
                System.err.println("Warning: Product variant ID " + productVariant.getId() + " has no product ID.");
                continue;
            }

            Product product = productDAO.getProductById(productId);
            if (product == null) {
                System.err.println("Warning: Product ID " + productId + " linked from variant ID " + productVariant.getId() + " not found.");
                continue;
            }

            CartItemDTO cartItemDTO = new CartItemDTO(cartItem.getId(), product.getName(), product.getCategory(), product.getDefaultImage(), productVariant, cartItem.getQuantity());
            cartItemDTOs.add(cartItemDTO);
        }
        return cartItemDTOs;
    }

    @Override
    public void addToCart(Long userId, Long productVariantId, Long quantity) {
        ProductVariant variant = productDAO.getVariantById(productVariantId);
        if (variant == null)
            throw new IllegalArgumentException("无效的商品款式" + productVariantId);
        if (quantity > variant.getStockQuantity())
            throw new IllegalArgumentException("库存不足，剩余库存：" + variant.getStockQuantity());

        CartItem cartItem = cartDAO.findCartItemByVariantId(userId, productVariantId);

        if (cartItem == null) {
            cartDAO.addCardItem(userId, productVariantId, quantity);
        } else {
            if (quantity + cartItem.getQuantity() > variant.getStockQuantity())
                throw new IllegalArgumentException("库存不足，剩余库存：" + variant.getStockQuantity());
            cartDAO.updateCardItem(cartItem.getId(), cartItem.getQuantity() + quantity);
        }
    }

    @Override
    public void updateCart(Long userId, Long cartId, Long variantId, Long quantity) {
        ProductVariant variant = productDAO.getVariantById(variantId);
        CartItem cartItem = cartDAO.findCartItemByCartId(cartId);

        if (variant == null)
            throw new IllegalArgumentException("无效的商品款式");
        if (quantity > variant.getStockQuantity())
            throw new IllegalArgumentException("库存不足，剩余库存：" + variant.getStockQuantity());
        if (!Objects.equals(cartItem.getUserId(), userId))
            throw new IllegalArgumentException("非法操作");

        cartDAO.updateCardItem(cartItem.getId(), quantity);
    }

    @Override
    public void removeFromCart(Long userId, Long cartId) {
        CartItem cartItem = cartDAO.findCartItemByCartId(cartId);
        if (cartItem == null) throw new IllegalArgumentException("无效的购物车项");
        if (!Objects.equals(cartItem.getUserId(), userId)) throw new IllegalArgumentException("非法操作");

        cartDAO.removeCardItem(userId, cartId);
    }

    @Override
    public void clearCart(Long userId) {
        cartDAO.clearCart(userId);
    }

}
