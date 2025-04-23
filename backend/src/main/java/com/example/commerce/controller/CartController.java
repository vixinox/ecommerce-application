package com.example.commerce.controller;

import com.example.commerce.dto.CartItemDTO;
import com.example.commerce.model.User;
import com.example.commerce.service.ProductService;
import com.example.commerce.service.UserService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    @Autowired
    private UserService userService;
    @Autowired
    private ProductService productService;

    @Data
    private static class AddToCartRequest {
        private Long variantId;
        private Long quantity;
    }

    @Data
    private static class UpdateCartRequest {
        private Long cartId;
        private Long variantId;
        private Long quantity;
    }

    @Data
    private static class RemoveFromCartRequest {
        private Long cartId;
    }

    @GetMapping("/get")
    public ResponseEntity<?> getCart(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            List<CartItemDTO> cartItemDTO = productService.getCartItem(user.getId());
            return ResponseEntity.status(HttpStatus.OK)
                   .body(cartItemDTO);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                   .body(e.getMessage());
        }
    }

    @PostMapping("/add")
    public ResponseEntity<?> addToCart(
            @RequestBody AddToCartRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            productService.addToCart(user.getId(), request.getVariantId(), request.getQuantity());
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
            productService.updateCart(user.getId(), request.getCartId(), request.getVariantId(), request.getQuantity());
            return ResponseEntity.status(HttpStatus.OK).body("success");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                   .body(e.getMessage());
        }
    }

    @PostMapping("/remove")
    public ResponseEntity<?> removeFromCart(
            @RequestBody RemoveFromCartRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            productService.removeFromCart(user.getId(), request.getCartId());
            return ResponseEntity.status(HttpStatus.OK).body("success");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(e.getMessage());
        }
    }

    @DeleteMapping("/clear")
    public ResponseEntity<?> removeFromCart(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            productService.clearCart(user.getId());
            return ResponseEntity.status(HttpStatus.OK).body("success");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(e.getMessage());
        }
    }
}
