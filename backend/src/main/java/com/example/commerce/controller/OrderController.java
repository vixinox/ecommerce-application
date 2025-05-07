package com.example.commerce.controller;

import com.example.commerce.dto.CartItemDTO;
import com.example.commerce.dto.OrderDTO;
import com.example.commerce.dto.OrderSearchDTO;
import com.example.commerce.dto.SpendingReportDTO;
import com.example.commerce.model.User;
import com.example.commerce.service.OrderService;
import com.example.commerce.service.UserService;
import com.github.pagehelper.PageInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static java.util.Collections.emptyList;


@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;
    private final UserService userService;

    @Autowired
    public OrderController(OrderService orderService, UserService userService) {
        this.orderService = orderService;
        this.userService = userService;
    }

    @PostMapping()
    public ResponseEntity<?> createOrder(
            @RequestBody List<CartItemDTO> items,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            orderService.createOrder(user, items);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body("创建订单成功");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(e.getMessage());
        }
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<?> getOrderDetailsAdmin(
            @PathVariable Long orderId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            userService.checkMerchantOrAdmin(authHeader);
            OrderDTO orderDetails = orderService.getOrderDetailsAdmin(orderId);
            return ResponseEntity.ok(orderDetails);
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("订单不存在")) {
                return ResponseEntity.status(404).body("获取订单详情失败: " + e.getMessage());
            }
            return ResponseEntity.status(403).body("获取订单详情失败: " + e.getMessage());
        }
    }

    @GetMapping("/mine")
    public ResponseEntity<?> getMyOrders(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            List<OrderDTO> orders = orderService.getOrder(user);
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(e.getMessage());
        }
    }

    @GetMapping("/report")
    public ResponseEntity<?> getMySpendingReport(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            SpendingReportDTO report = orderService.getSpendingReport(user);
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(e.getMessage());
        }
    }

    @GetMapping("/merchant")
    public ResponseEntity<?> getMerchantOrders(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "page", defaultValue = "1") int pageNum,
            @RequestParam(value = "size", defaultValue = "10") int pageSize,
            @RequestParam(value = "status", required = false) String status) {
        try {
            User merchant = userService.checkMerchant(authHeader);
            PageInfo<OrderDTO> orderPageInfo = orderService.getMerchantOrders(merchant, pageNum, pageSize, status);
            return ResponseEntity.ok(orderPageInfo);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(e.getMessage());
        }
    }

    @PutMapping("/merchant/{orderId}/status")
    public ResponseEntity<?> updateOrderStatusByMerchant(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long orderId,
            @RequestBody Map<String, String> statusUpdate) {
        try {
            User merchant = userService.checkMerchant(authHeader);
            String newStatus = statusUpdate.get("status");
            if (!StringUtils.hasText(newStatus)) {
                return ResponseEntity.badRequest().body("请求体中必须包含 'status' 字段");
            }

            boolean success = orderService.updateOrderStatusByMerchant(merchant, orderId, newStatus);
            if (success) {
                return ResponseEntity.ok("订单状态更新成功");
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("订单状态更新失败 (可能原因: 订单不存在, 无权限, 或状态不允许)");
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("更新订单状态时发生错误: " + e.getMessage());
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchOrders(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Long orderId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String productName,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(value = "page", defaultValue = "1") int pageNum,
            @RequestParam(value = "size", defaultValue = "10") int pageSize) {
        try {
            userService.checkAdmin(authHeader);
            OrderSearchDTO criteria = new OrderSearchDTO(orderId, userId, username, productName, status, dateFrom, dateTo);
            PageInfo<OrderDTO> orderPageInfo = orderService.searchOrders(criteria, pageNum, pageSize);
            return ResponseEntity.ok(orderPageInfo);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("搜索订单时发生错误: " + e.getMessage());
        }
    }

    @GetMapping("/search/merchant")
    public ResponseEntity<?> searchMyOrders(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Long orderId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String productName,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(value = "page", defaultValue = "1") int pageNum,
            @RequestParam(value = "size", defaultValue = "10") int pageSize) {
        try {
            User merchant = userService.checkMerchant(authHeader);
            //TODO: 仅搜索当前商户的订单
            return ResponseEntity.ok(emptyList());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(e.getMessage());
        }
    }
}