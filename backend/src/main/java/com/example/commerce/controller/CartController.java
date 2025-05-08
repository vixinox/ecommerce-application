package com.example.commerce.controller;

import com.example.commerce.dto.CartItemDTO;
import com.example.commerce.model.User;
import com.example.commerce.service.CartService;
import com.example.commerce.service.UserService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final UserService userService;
    private final CartService cartService;

    @Autowired
    public CartController(CartService cartService, UserService userService) {
        this.cartService = cartService;
        this.userService = userService;
    }

    @Data
    private static class UpdateCartRequest {
        private Long cartId;
        private Long variantId;
        private Long quantity;
    }

    @GetMapping("/get")
    public ResponseEntity<?> getCart(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            List<CartItemDTO> cartItemDTO = cartService.getCartItem(user.getId());
            return ResponseEntity.status(HttpStatus.OK)
                   .body(cartItemDTO);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                   .body(e.getMessage());
        }
    }

    @PostMapping("/add")
    public ResponseEntity<?> addToCart(
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            Long variantId = Long.parseLong(request.get("variantId"));
            Long quantity = Long.parseLong(request.get("quantity"));
            cartService.addToCart(user.getId(), variantId, quantity);
            return ResponseEntity.status(HttpStatus.OK).body("success");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                   .body(e.getMessage());
        }
    }

    @PostMapping("/update")
    public ResponseEntity<?> updateCart(
            @RequestBody UpdateCartRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            cartService.updateCart(user.getId(), request.getCartId(), request.getVariantId(), request.getQuantity());
            return ResponseEntity.status(HttpStatus.OK).body("success");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                   .body(e.getMessage());
        }
    }

    @DeleteMapping("/remove")
    public ResponseEntity<?> removeFromCart(
            @RequestBody Map<String, String> data,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            Long cartId = Long.parseLong(data.get("cartId"));
            cartService.removeFromCart(user.getId(), cartId);
            return ResponseEntity.status(HttpStatus.OK).body("购物车商品移除成功");
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("无效的购物车项ID格式");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("移除购物车商品时发生错误: " + e.getMessage());
        }
    }

    @DeleteMapping("/clear")
    public ResponseEntity<?> removeFromCart(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            cartService.clearCart(user.getId());
            return ResponseEntity.status(HttpStatus.OK).body("success");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(e.getMessage());
        }
    }
}
