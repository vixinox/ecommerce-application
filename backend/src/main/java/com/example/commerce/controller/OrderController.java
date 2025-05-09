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
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;


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
            List<Long> orderIds = orderService.createOrder(user, items);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("message", "创建订单成功", "orderIds", orderIds));
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
            User requester = userService.checkMerchantOrAdmin(authHeader);
            OrderDTO orderDetails = orderService.getOrderDetailsAdmin(orderId, requester);
            
            if (orderDetails == null) {

                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("获取订单详情失败: 订单不存在或无法访问。");
            }
            return ResponseEntity.ok(orderDetails);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("获取订单详情失败: " + e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("获取订单详情失败: " + e.getMessage());
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
            userService.checkMerchantOrAdmin(authHeader);
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
            OrderSearchDTO criteria = new OrderSearchDTO(orderId, merchant.getId(), username, productName, status, dateFrom, dateTo);
            PageInfo<OrderDTO> orderPageInfo = orderService.searchOrders(criteria, pageNum, pageSize);
            return ResponseEntity.ok(orderPageInfo);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("搜索商户订单时发生错误: " + e.getMessage());
        }
    }

    /**
     * 处理支付成功回调
     * 该接口用于模拟支付成功后的回调，将订单状态从"待支付"更新为"已支付待发货"
     * @param paymentData 支付数据，应包含 {"orderIds": [1,2,3], "transactionId": "mock-transaction-123", "amount": 199.99}
     * @param authHeader 认证头
     * @return ResponseEntity
     */
    @PostMapping("/payment/success")
    public ResponseEntity<?> handlePaymentSuccess(
            @RequestBody Map<String, Object> paymentData,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            Object orderIdsObj = paymentData.get("orderIds");
            List<Long> orderIds = null;

            if (orderIdsObj instanceof List<?> rawList) {
                orderIds = new ArrayList<>();
                for (Object idObj : rawList) {
                    if (idObj instanceof Number) {
                        orderIds.add(((Number) idObj).longValue());
                    } else if (idObj instanceof String) {
                        try {
                            orderIds.add(Long.parseLong((String) idObj));
                        } catch (NumberFormatException nfe) {
                            return ResponseEntity.badRequest().body("订单ID列表中包含无效的ID格式: " + idObj);
                        }
                    } else {
                        return ResponseEntity.badRequest().body("订单ID列表中包含无效的ID类型");
                    }
                }
            } else {
                return ResponseEntity.badRequest().body("orderIds 必须是一个列表");
            }
            if (orderIds.isEmpty()) {
                 return ResponseEntity.badRequest().body("orderIds 列表不能为空");
            }
            String transactionId = (String) paymentData.get("transactionId");
            BigDecimal paidAmount = null;
            Object amountObj = paymentData.get("amount");
            if (amountObj != null) {
                if (amountObj instanceof Number) {
                    paidAmount = new BigDecimal(amountObj.toString());
                } else if (amountObj instanceof String) {
                    try {
                        paidAmount = new BigDecimal((String) amountObj);
                    } catch (NumberFormatException e) {
                        return ResponseEntity.badRequest().body("支付金额格式无效");
                    }
                }
            }
            

            orderService.processPaymentSuccess(orderIds, transactionId, paidAmount);
            
            return ResponseEntity.ok(Map.of(
                "message", "支付成功，订单状态已更新",
                "orderIds", orderIds,
                "transactionId", transactionId
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("支付处理失败: " + e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("支付处理失败: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("支付处理过程中发生错误: " + e.getMessage());
        }
    }

    /**
     * 获取当前用户的待支付订单
     * @param authHeader 认证头
     * @return 待支付订单列表
     */
    @GetMapping("/pending")
    public ResponseEntity<?> getPendingOrders(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            List<OrderDTO> pendingOrders = orderService.getPendingPaymentOrders(user);
            return ResponseEntity.ok(pendingOrders);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("获取待支付订单失败: " + e.getMessage());
        }
    }

    /**
     * 取消订单
     * 用户可以取消自己的待支付或待发货订单
     *
     * @param orderIdData 请求体，包含 {"orderId": "ORDER_ID"}
     * @param authHeader 认证头
     * @return ResponseEntity
     */
    @PostMapping("/cancel")
    public ResponseEntity<?> cancelOrder(
            @RequestBody Map<String, String> orderIdData,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            
            String orderIdStr = orderIdData.get("orderId");
            if (orderIdStr == null || orderIdStr.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("请提供有效的订单ID");
            }
            long orderId;
            try {
                orderId = Long.parseLong(orderIdStr.trim());
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body("无效的订单ID格式");
            }
            boolean success = orderService.cancelOrder(user, orderId);
            if (success) {
                return ResponseEntity.ok(Map.of("message", "订单 " + orderId + " 已成功取消"));
            } else {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body("取消订单失败，该订单可能已被处理或处于不可取消的状态");
            }
        } catch (IllegalArgumentException e) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("取消订单失败: " + e.getMessage());
        } catch (IllegalStateException e) {

            return ResponseEntity.status(HttpStatus.CONFLICT).body("取消订单失败: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("取消订单时发生错误: " + e.getMessage());
        }
    }

    /**
     * 获取当前用户单个订单的详细信息
     * @param orderId    订单ID (来自路径)
     * @param authHeader 认证头
     * @return ResponseEntity 包含 OrderDTO 或 404/403
     */
    @GetMapping("/mine/{orderId}")
    public ResponseEntity<?> getMySingleOrderDetails(
            @PathVariable Long orderId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            OrderDTO orderDetails = orderService.getMyOrderDetails(user, orderId);

            if (orderDetails != null) {
                return ResponseEntity.ok(orderDetails);
            } else {

                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("获取订单详情失败：订单不存在或您无权访问。" );
            }
        } catch (IllegalArgumentException e) {

            return ResponseEntity.badRequest().body("获取订单详情失败: " + e.getMessage());
        } catch (RuntimeException e) { 

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("获取订单详情失败: " + e.getMessage());
        }
    }
}