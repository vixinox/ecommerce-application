package com.example.commerce.controller;

import com.example.commerce.dto.WishlistItemDTO;
import com.example.commerce.model.User;
import com.example.commerce.service.UserService;
import com.example.commerce.service.WishlistService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {

    private final WishlistService wishlistService;
    private final UserService userService;

    @Autowired
    public WishlistController(WishlistService wishlistService, UserService userService) {
        this.wishlistService = wishlistService;
        this.userService = userService;
    }

    /**
     * 获取当前用户的愿望单列表
     */
    @GetMapping
    public ResponseEntity<?> getWishlist(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            List<WishlistItemDTO> wishlist = wishlistService.getWishlist(user);
            return ResponseEntity.ok(wishlist);
        } catch (RuntimeException e) {
            // checkAuthorization 会在无效时抛出 RuntimeException
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        } catch (Exception e) {
            System.err.println("Error fetching wishlist: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("获取愿望单失败");
        }
    }

    /**
     * 将商品添加到愿望单
     */
    @PostMapping("/add/{productId}")
    public ResponseEntity<?> addToWishlist(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long productId) {
        try {
            User user = userService.checkAuthorization(authHeader);
            wishlistService.addToWishlist(user, productId);
            return ResponseEntity.ok().body("已加入愿望单");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    /**
     * 从愿望单中移除商品
     * 使用 PathVariable 来接收 productId 更符合 RESTful 风格
     */
    @DeleteMapping("/remove/{productId}")
    public ResponseEntity<?> removeFromWishlist(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long productId) {
        try {
            User user = userService.checkAuthorization(authHeader);

            boolean removed = wishlistService.removeFromWishlist(user, productId);
            if (removed) {
                return ResponseEntity.ok("商品已从愿望单移除");
            } else {
                // Service 返回 false 表示商品不在愿望单中
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("商品不在愿望单中");
            }
        } catch (RuntimeException e) {
             if (e.getMessage().contains("无效的认证请求头") || e.getMessage().contains("认证过期") || e.getMessage().contains("用户不存在")) {
                 return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
            }
            System.err.println("Error removing from wishlist: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("移除愿望单商品失败");
        }
    }
} 