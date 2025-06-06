package com.example.commerce.controller;

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
@RequestMapping("/api/dashboard")
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
    @GetMapping("/merchant")
    public ResponseEntity<?> getMerchantDashboard(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User merchant = userService.checkMerchant(authHeader);
            MerchantDashboardDTO dashboardData = dashboardService.getMerchantDashboardData(merchant);
            return ResponseEntity.ok(dashboardData);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("无权限访问该资源") || e.getMessage().contains("无效的认证请求头") || e.getMessage().contains("认证过期") || e.getMessage().contains("用户不存在")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
            }
            System.err.println("Error fetching merchant dashboard data: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("获取仪表盘数据失败");
        } catch (Exception e) {
             System.err.println("Unexpected error fetching merchant dashboard data: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("获取仪表盘数据时发生意外错误");
        }
    }
} 