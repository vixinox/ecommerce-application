package com.example.commerce.controller;

import com.example.commerce.dto.*;
import com.example.commerce.model.Product;
import com.example.commerce.model.User;
import com.example.commerce.service.OrderService;
import com.example.commerce.service.ProductService;
import com.example.commerce.service.UserService;
import com.example.commerce.service.DashboardService;
import com.github.pagehelper.PageInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserService userService;
    private final ProductService productService;
    private final OrderService orderService;
    private final DashboardService dashboardService;

    @Autowired
    public AdminController(UserService userService, ProductService productService, OrderService orderService, DashboardService dashboardService) {
        this.userService = userService;
        this.productService = productService;
        this.orderService = orderService;
        this.dashboardService = dashboardService;
    }

    // 示例：一个需要管理员权限的测试端点
    @GetMapping("/test")
    public ResponseEntity<String> adminTest(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User adminUser = userService.checkAdmin(authHeader);
            // 如果 checkAdmin 成功，说明是管理员
            return ResponseEntity.ok("你好, 管理员 " + adminUser.getUsername() + "!");
        } catch (RuntimeException e) {
            // 如果 checkAdmin 抛出异常，说明无权限
            return ResponseEntity.status(403).body("无权限访问: " + e.getMessage());
        }
    }

    /**
     * 获取用户列表（分页）
     * 需要管理员权限
     */
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "page", defaultValue = "1") int pageNum,
            @RequestParam(value = "size", defaultValue = "10") int pageSize,
            @RequestParam(value = "status", required = false) String statusFilter) {
        try {
            // 1. 检查管理员权限
            userService.checkAdmin(authHeader);
            // 2. 调用服务获取分页用户数据，传入过滤器
            PageInfo<User> userPageInfo = userService.getAllUsers(pageNum, pageSize, statusFilter);
            // 3. 返回成功响应
            return ResponseEntity.ok(userPageInfo);
        } catch (RuntimeException e) {
            // 权限不足或其他运行时异常
            return ResponseEntity.status(403).body("获取用户列表失败: " + e.getMessage());
        }
    }

    /**
     * 更新用户状态
     * 需要管理员权限
     * @param statusData 请求体，应包含状态与id
     * @param authHeader 认证头
     * @return ResponseEntity
     */
    @PutMapping("/users/update/status")
    public ResponseEntity<?> updateUserStatus(
            @RequestBody Map<String, String> statusData,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            userService.checkAdmin(authHeader);
            Long userId = Long.parseLong(statusData.get("userId"));
            String newStatus = statusData.get("status");
            if (newStatus == null)
                return ResponseEntity.badRequest().body("请求体字段缺失");

            userService.updateUserStatus(userId, newStatus.trim());
            return ResponseEntity.ok(Map.of("message", "用户 " + userId + " 状态已更新为 " + newStatus));
        } catch (RuntimeException e) {
            return ResponseEntity.status(403).body("更新用户状态失败: " + e.getMessage());
        }
    }

    /**
     * 获取所有商品列表（分页）
     * 需要管理员权限
     */
    @GetMapping("/products")
    public ResponseEntity<?> getAllProducts(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "page", defaultValue = "1") int pageNum,
            @RequestParam(value = "size", defaultValue = "10") int pageSize,
            @RequestParam(value = "status", required = false) String statusFilter) {
        try {
            userService.checkAdmin(authHeader);
            PageInfo<Product> productPageInfo = productService.getAllProductsAdmin(pageNum, pageSize, statusFilter);
            return ResponseEntity.ok(productPageInfo);
        } catch (RuntimeException e) {
            return ResponseEntity.status(403).body("获取商品列表失败: " + e.getMessage());
        }
    }

    /**
     * 获取所有订单列表（分页，可选状态过滤）
     * 需要管理员权限
     */
    @GetMapping("/orders")
    public ResponseEntity<?> getAllOrders(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "page", defaultValue = "1") int pageNum,
            @RequestParam(value = "size", defaultValue = "10") int pageSize,
            @RequestParam(value = "status", required = false) String statusFilter) {
        try {
            // 1. 检查管理员权限
            userService.checkAdmin(authHeader);
            // 2. 调用服务获取分页订单数据
            PageInfo<OrderDTO> orderPageInfo = orderService.getAllOrdersAdmin(pageNum, pageSize, statusFilter);
            // 3. 返回成功响应
            return ResponseEntity.ok(orderPageInfo);
        } catch (RuntimeException e) {
            // 权限不足或其他运行时异常
            return ResponseEntity.status(403).body("获取订单列表失败: " + e.getMessage());
        }
    }

    /**
     * 管理员获取商品详情
     * 需要管理员权限
     * @param productId 商品ID (来自路径)
     * @param authHeader 认证头
     * @return ResponseEntity 包含 ProductEditResponseDTO
     */
    @GetMapping("/products/{productId}")
    public ResponseEntity<?> getProductDetailsAdmin(
            @PathVariable Long productId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            userService.checkAdmin(authHeader);
            Optional<ProductEditResponseDTO> productDetailsOpt = productService.getProductDetailsAdmin(productId);

            if (productDetailsOpt.isPresent()) {
                return ResponseEntity.ok(productDetailsOpt.get());
            } else {
                return ResponseEntity.status(404).body("获取商品详情失败: 商品不存在");
            }

        } catch (RuntimeException e) {
            return ResponseEntity.status(403).body("获取商品详情失败: " + e.getMessage());
        }
    }

    /**
     * 管理员获取用户详情
     * 需要管理员权限
     * @param username 用户名 (来自路径)
     * @param authHeader 认证头
     * @return ResponseEntity 包含 User (无密码)
     */
    @GetMapping("/users/{username}")
    public ResponseEntity<?> getUserDetailsAdmin(
            @PathVariable String username,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            // 1. 检查管理员权限
            userService.checkAdmin(authHeader);

            // 2. 调用服务获取用户信息
            User user = userService.findByName(username);

            // 3. 检查用户是否存在
            if (user == null) {
                return ResponseEntity.status(404).body("获取用户详情失败: 用户不存在");
            }

            // 4. 手动清除密码 (因为 service.findByName 未清除)
            user.setPassword(null);

            // 5. 返回成功响应
            return ResponseEntity.ok(user);

        } catch (RuntimeException e) {
            // 权限不足或其他运行时异常
            return ResponseEntity.status(403).body("获取用户详情失败: " + e.getMessage());
        }
    }

    /**
     * 管理员更新用户角色
     * 需要管理员权限
     * @param roleData 请求体，应包含 {"role": "NEW_ROLE"}
     * @param authHeader 认证头
     * @return ResponseEntity
     */
    @PutMapping("/users/update/role")
    public ResponseEntity<?> updateUserRoleAdmin(
            @RequestBody Map<String, String> roleData,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User adminUser = userService.checkAdmin(authHeader);

            String userIdStr = roleData.get("userId");
            String newRole = roleData.get("role");

            if (userIdStr == null || userIdStr.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("更新用户角色失败: 用户ID不能为空。");
            }
            if (newRole == null || newRole.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("更新用户角色失败: 角色不能为空。");
            }

            Long userIdToChange;
            try {
                userIdToChange = Long.parseLong(userIdStr);
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body("更新用户角色失败: 无效的用户ID格式。");
            }
            
            userService.updateUserRoleAdmin(adminUser, userIdToChange, newRole.trim());

            return ResponseEntity.ok(Map.of("message", "用户id " + userIdToChange + " 的角色已更新为 " + newRole.trim()));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("更新用户角色失败: " + e.getMessage());
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("用户id不存在")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("更新用户角色失败: " + e.getMessage());
            }
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("更新用户角色失败: " + e.getMessage());
        }
    }

    /**
     * 管理员软删除用户 (标记状态为 DELETED)
     * 需要管理员权限
     * @param userId 要删除的用户 (来自路径)
     * @param authHeader 认证头
     * @return ResponseEntity
     */
    @DeleteMapping("/users/delete/{userId}")
    public ResponseEntity<?> softDeleteUserAdmin(
            @PathVariable Long userId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            userService.checkAdmin(authHeader);
            userService.softDeleteUser(userId);
            return ResponseEntity.ok("用户 " + userId + " 已删除");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    /**
     * 管理员获取仪表盘数据
     * 需要管理员权限
     * @param authHeader 认证头
     * @return ResponseEntity 包含 AdminDashboardDTO
     */
    @GetMapping("/dashboard")
    public ResponseEntity<?> getAdminDashboardData(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            userService.checkAdmin(authHeader);
            AdminDashboardDTO dashboardData = dashboardService.getAdminDashboardData();
            return ResponseEntity.ok(dashboardData);
        } catch (RuntimeException e) {
            if (e.getMessage() != null && (e.getMessage().contains("无权限访问") || e.getMessage().contains("无效的认证请求头") || e.getMessage().contains("认证过期") || e.getMessage().contains("用户不存在"))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("获取仪表盘数据失败: " + e.getMessage());
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("获取仪表盘数据时发生内部错误: " + e.getMessage());
        }
    }

    /**
     * 管理员根据条件搜索用户 (分页)
     * 需要管理员权限
     */
    @GetMapping("/users/search")
    public ResponseEntity<?> searchUsers(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String searchTerm,
            @RequestParam(required = false) String searchField,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate registrationDateStart,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate registrationDateEnd,
            @RequestParam(value = "page", defaultValue = "1") int pageNum,
            @RequestParam(value = "size", defaultValue = "10") int pageSize) {
        try {
            userService.checkAdmin(authHeader);

            UserSearchDTO criteria = new UserSearchDTO();
            criteria.setUserId(userId);

            if (searchField != null && searchTerm != null && !searchTerm.trim().isEmpty()) {
                if ("username".equalsIgnoreCase(searchField)) {
                    criteria.setUsername(searchTerm.trim());
                } else if ("email".equalsIgnoreCase(searchField)) {
                    criteria.setEmail(searchTerm.trim());
                } else if ("nickname".equalsIgnoreCase(searchField)) {
                    criteria.setNickname(searchTerm.trim());
                }
            }

            criteria.setRole(role);
            criteria.setStatus(status);
            criteria.setRegistrationDateStart(registrationDateStart);
            criteria.setRegistrationDateEnd(registrationDateEnd);

            PageInfo<User> userPageInfo = userService.searchUsers(criteria, pageNum, pageSize);
            return ResponseEntity.ok(userPageInfo);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("无权访问: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("搜索用户时发生错误: " + e.getMessage());
        }
    }

    /**
     * 管理员或商家更新订单状态
     * 需要管理员或商家权限
     * @param statusData 请求体，应包含 {"orderId": 123, "status": "NEW_STATUS"}
     * @param authHeader 认证头
     * @return ResponseEntity
     */
    @PutMapping("/orders/update/status")
    public ResponseEntity<?> updateOrderStatusAdmin(
            @RequestBody Map<String, Object> statusData,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkMerchantOrAdmin(authHeader);

            Object orderIdObj = statusData.get("orderId");
            String newStatus = (String) statusData.get("status");

            if (orderIdObj == null || newStatus == null) {
                return ResponseEntity.badRequest().body("请求体缺少 orderId 或 status 字段");
            }

            Long orderId;
            if (orderIdObj instanceof Number) {
                orderId = ((Number) orderIdObj).longValue();
            } else if (orderIdObj instanceof String) {
                try {
                    orderId = Long.valueOf((String) orderIdObj);
                } catch (NumberFormatException e) {
                    return ResponseEntity.badRequest().body("无效的 orderId 格式");
                }
            } else {
                return ResponseEntity.badRequest().body("无效的 orderId 类型");
            }

            orderService.updateOrderStatusAdmin(orderId, newStatus.trim(), user);
            return ResponseEntity.ok(Map.of("message", "订单 " + orderId + " 状态已更新为 " + newStatus));
        } catch (IllegalArgumentException e) {
            // 无效的状态值或订单不存在等
            return ResponseEntity.badRequest().body("更新订单状态失败: " + e.getMessage());
        } catch (RuntimeException e) {
            // 权限不足或其他运行时异常
            return ResponseEntity.status(403).body("更新订单状态失败: " + e.getMessage());
        }
    }
}