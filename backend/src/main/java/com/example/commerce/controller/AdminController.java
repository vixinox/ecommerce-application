package com.example.commerce.controller;

import com.example.commerce.model.User;
import com.example.commerce.model.Product;
import com.example.commerce.dto.OrderDTO;
import com.example.commerce.dto.ProductEditResponseDTO;
import com.example.commerce.dto.AdminDashboardDTO;
import com.example.commerce.service.UserService;
import com.example.commerce.service.ProductService;
import com.example.commerce.service.OrderService;
import com.example.commerce.service.DashboardService;
import com.github.pagehelper.PageInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;

import java.util.Map;
import java.util.Optional;

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
     * @param username 用户名 (来自路径)
     * @param statusData 请求体，应包含 {"status": "NEW_STATUS"}
     * @param authHeader 认证头
     * @return ResponseEntity
     */
    @PutMapping("/users/{username}/status")
    public ResponseEntity<?> updateUserStatus(
            @PathVariable String username,
            @RequestBody Map<String, String> statusData,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            // 1. 检查管理员权限
            userService.checkAdmin(authHeader);

            String newStatus = statusData.get("status");
            if (newStatus == null || newStatus.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("请求体中必须包含 'status' 字段。");
            }

            // 2. 调用服务更新状态
            userService.updateUserStatus(username, newStatus.trim());

            // 3. 返回成功响应
            return ResponseEntity.ok(Map.of("message", "用户 " + username + " 状态已更新为 " + newStatus));
        } catch (RuntimeException e) {
            // 权限不足或其他运行时异常
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
            // 1. 检查管理员权限
            userService.checkAdmin(authHeader);
            // 2. 调用服务获取分页商品数据，传入过滤器
            PageInfo<Product> productPageInfo = productService.getAllProductsAdmin(pageNum, pageSize, statusFilter);
            // 3. 返回成功响应
            return ResponseEntity.ok(productPageInfo);
        } catch (RuntimeException e) {
            // 权限不足或其他运行时异常
            return ResponseEntity.status(403).body("获取商品列表失败: " + e.getMessage());
        }
    }

    /**
     * 更新商品状态
     * 需要管理员权限
     * @param productId 商品ID (来自路径)
     * @param statusData 请求体，应包含 {"status": "NEW_STATUS"}
     * @param authHeader 认证头
     * @return ResponseEntity
     */
    @PutMapping("/products/{productId}/status")
    public ResponseEntity<?> updateProductStatus(
            @PathVariable Long productId,
            @RequestBody Map<String, String> statusData,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            // 1. 检查管理员权限
            userService.checkAdmin(authHeader);

            String newStatus = statusData.get("status");
            if (newStatus == null || newStatus.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("请求体中必须包含 'status' 字段。");
            }

            // 2. 调用服务更新状态
            productService.updateProductStatus(productId, newStatus.trim());

            // 3. 返回成功响应
            return ResponseEntity.ok(Map.of("message", "商品 " + productId + " 状态已更新为 " + newStatus));
        } catch (RuntimeException e) {
            // 权限不足或其他运行时异常
            return ResponseEntity.status(403).body("更新商品状态失败: " + e.getMessage());
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
     * 管理员更新订单状态
     * 需要管理员权限
     * @param orderId 订单ID (来自路径)
     * @param statusData 请求体，应包含 {"status": "NEW_STATUS"}
     * @param authHeader 认证头
     * @return ResponseEntity
     */
    @PutMapping("/orders/{orderId}/status")
    public ResponseEntity<?> updateOrderStatusAdmin(
            @PathVariable Long orderId,
            @RequestBody Map<String, String> statusData,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            // 1. 检查管理员权限
            userService.checkAdmin(authHeader);

            String newStatus = statusData.get("status");
            if (newStatus == null || newStatus.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("请求体中必须包含 'status' 字段。");
            }

            // 2. 调用服务更新状态
            orderService.updateOrderStatusAdmin(orderId, newStatus.trim());

            // 3. 返回成功响应
            return ResponseEntity.ok(Map.of("message", "订单 " + orderId + " 状态已更新为 " + newStatus));
        } catch (IllegalArgumentException e) {
            // 无效的状态值
            return ResponseEntity.badRequest().body("更新订单状态失败: " + e.getMessage());
        } catch (RuntimeException e) {
            // 权限不足、订单不存在或其他运行时异常
            return ResponseEntity.status(403).body("更新订单状态失败: " + e.getMessage());
        }
    }

    /**
     * 管理员获取订单详情
     * 需要管理员权限
     * @param orderId 订单ID (来自路径)
     * @param authHeader 认证头
     * @return ResponseEntity 包含 OrderDTO
     */
    @GetMapping("/orders/{orderId}")
    public ResponseEntity<?> getOrderDetailsAdmin(
            @PathVariable Long orderId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            // 1. 检查管理员权限
            userService.checkAdmin(authHeader);

            // 2. 调用服务获取订单详情
            OrderDTO orderDetails = orderService.getOrderDetailsAdmin(orderId);

            // 3. 返回成功响应
            return ResponseEntity.ok(orderDetails);
        } catch (RuntimeException e) {
            // 权限不足、订单不存在或其他运行时异常
            // 可以根据异常类型返回不同的状态码，例如 404 Not Found
            if (e.getMessage() != null && e.getMessage().startsWith("订单不存在")) {
                return ResponseEntity.status(404).body("获取订单详情失败: " + e.getMessage());
            }
            return ResponseEntity.status(403).body("获取订单详情失败: " + e.getMessage());
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
            // 1. 检查管理员权限
            userService.checkAdmin(authHeader);

            // 2. 调用服务获取商品详情
            Optional<ProductEditResponseDTO> productDetailsOpt = productService.getProductDetailsAdmin(productId);

            // 3. 处理结果并返回 (使用 if/else)
            if (productDetailsOpt.isPresent()) {
                return ResponseEntity.ok(productDetailsOpt.get());
            } else {
                return ResponseEntity.status(404).body("获取商品详情失败: 商品不存在");
            }

        } catch (RuntimeException e) {
            // 权限不足或其他运行时异常
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
     * 管理员获取仪表盘数据
     * 需要管理员权限
     * @param authHeader 认证头
     * @return ResponseEntity 包含 AdminDashboardDTO
     */
    @GetMapping("/dashboard")
    public ResponseEntity<?> getAdminDashboard(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            // 1. 检查管理员权限
            userService.checkAdmin(authHeader);

            // 2. 调用服务获取仪表盘数据
            AdminDashboardDTO dashboardData = dashboardService.getAdminDashboardData();

            // 3. 返回成功响应
            return ResponseEntity.ok(dashboardData);

        } catch (RuntimeException e) {
            // 权限不足或其他运行时异常
            return ResponseEntity.status(403).body("获取仪表盘数据失败: " + e.getMessage());
        }
    }

    /**
     * 管理员更新用户角色
     * 需要管理员权限
     * @param username 要修改角色的用户名 (来自路径)
     * @param roleData 请求体，应包含 {"role": "NEW_ROLE"}
     * @param authHeader 认证头
     * @return ResponseEntity
     */
    @PutMapping("/users/{username}/role")
    public ResponseEntity<?> updateUserRoleAdmin(
            @PathVariable String username,
            @RequestBody Map<String, String> roleData,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            // 1. 检查管理员权限
            userService.checkAdmin(authHeader);

            String newRole = roleData.get("role");
            if (newRole == null || newRole.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("请求体中必须包含 'role' 字段且不能为空。");
            }

            // 2. 调用服务更新角色
            userService.updateUserRoleAdmin(username, newRole.trim());

            // 3. 返回成功响应
            return ResponseEntity.ok(Map.of("message", "用户 " + username + " 的角色已更新为 " + newRole));

        } catch (IllegalArgumentException e) {
            // 无效的角色值
            return ResponseEntity.badRequest().body("更新用户角色失败: " + e.getMessage());
        } catch (RuntimeException e) {
            // 权限不足、用户不存在或其他运行时异常
            if (e.getMessage() != null && e.getMessage().startsWith("用户不存在")) {
                return ResponseEntity.status(404).body("更新用户角色失败: " + e.getMessage());
            }
            return ResponseEntity.status(403).body("更新用户角色失败: " + e.getMessage());
        }
    }

    /**
     * 管理员软删除用户 (标记状态为 DELETED)
     * 需要管理员权限
     * @param username 要删除的用户名 (来自路径)
     * @param authHeader 认证头
     * @return ResponseEntity
     */
    @DeleteMapping("/users/{username}")
    public ResponseEntity<?> softDeleteUserAdmin(
            @PathVariable String username,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            // 1. 检查管理员权限
            userService.checkAdmin(authHeader);

            // 2. 调用服务软删除用户
            userService.softDeleteUser(username);

            // 3. 返回成功响应
            return ResponseEntity.ok(Map.of("message", "用户 " + username + " 已被标记为删除。"));

        } catch (RuntimeException e) {
            // 权限不足、用户不存在或其他运行时异常
            if (e.getMessage() != null && e.getMessage().startsWith("用户不存在")) {
                return ResponseEntity.status(404).body("删除用户失败: " + e.getMessage());
            }
            // 捕获 IllegalArgumentException (无效状态) - 理论上不应发生，因为我们硬编码 "DELETED"
            if (e instanceof IllegalArgumentException) {
                 return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("删除用户失败: 内部状态错误");
            }
            return ResponseEntity.status(403).body("删除用户失败: " + e.getMessage());
        }
    }

    // 在这里添加其他的管理员接口...

}