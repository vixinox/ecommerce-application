package com.example.commerce.controller;

import com.example.commerce.dto.AdminDashboardDTO;
import com.example.commerce.dto.MerchantDashboardDTO;
import com.example.commerce.model.User;
import com.example.commerce.service.DashboardService;
import com.example.commerce.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard") // 基础路径
public class DashboardController {

    private final DashboardService dashboardService;
    private final UserService userService;

    @Autowired
    public DashboardController(DashboardService dashboardService, UserService userService) {
        this.dashboardService = dashboardService;
        this.userService = userService;
    }

    /**
     * 获取商家的仪表盘数据
     */
    @GetMapping("/merchant") // 商家仪表盘路径
    public ResponseEntity<?> getMerchantDashboard(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User merchant = userService.checkMerchant(authHeader); // 确保是商家访问
            MerchantDashboardDTO dashboardData = dashboardService.getMerchantDashboardData(merchant);
            return ResponseEntity.ok(dashboardData);
        } catch (RuntimeException e) {
            // 处理 checkMerchant 抛出的异常 (如未授权)
            if (e.getMessage().contains("无权限访问该资源") || e.getMessage().contains("无效的认证请求头") || e.getMessage().contains("认证过期") || e.getMessage().contains("用户不存在")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
            }
            // 其他运行时异常视为服务器内部错误
            System.err.println("Error fetching merchant dashboard data: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("获取仪表盘数据失败");
        } catch (Exception e) {
            // 处理其他非运行时异常
             System.err.println("Unexpected error fetching merchant dashboard data: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("获取仪表盘数据时发生意外错误");
        }
    }

    /**
     * 管理员获取仪表盘数据
     * 需要管理员权限
     * @param authHeader 认证头
     * @return ResponseEntity 包含 AdminDashboardDTO
     * @deprecated 此端点已由 AdminController中的 /api/admin/dashboard 取代。
     */
    @Deprecated // Mark as deprecated
    // @GetMapping("/admin") // Comment out or remove the mapping
    public ResponseEntity<?> getAdminDashboard(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            userService.checkAdmin(authHeader);

            AdminDashboardDTO dashboardData = dashboardService.getAdminDashboardData();

            return ResponseEntity.ok(dashboardData);

        } catch (RuntimeException e) {
            if (e.getMessage() != null && (e.getMessage().contains("无权限访问") || e.getMessage().contains("无效的认证请求头") || e.getMessage().contains("认证过期") || e.getMessage().contains("用户不存在"))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("获取仪表盘数据失败: (已弃用) " + e.getMessage());
            }
            System.err.println("Error fetching admin dashboard data (deprecated endpoint): " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("获取仪表盘数据失败: (已弃用) " + e.getMessage());
        }
    }

} 