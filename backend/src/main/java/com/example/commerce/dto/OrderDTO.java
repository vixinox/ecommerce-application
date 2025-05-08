package com.example.commerce.dto;

import com.example.commerce.model.Order;
import com.example.commerce.model.OrderItem;
import com.example.commerce.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class OrderDTO {
    private Order order;
    private List<OrderItem> items;
    private User buyerInfo;
    private Long secondsRemaining; // 订单距离过期还有多少秒，仅对待支付订单有效

    public OrderDTO(Order order, List<OrderItem> items) {
        this.order = order;
        this.items = items;
        this.buyerInfo = null;
    }
    
    public OrderDTO(Order order, List<OrderItem> items, User buyerInfo) {
        this.order = order;
        this.items = items;
        this.buyerInfo = buyerInfo;
    }
}
