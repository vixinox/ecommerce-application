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

    public OrderDTO(Order order, List<OrderItem> items) {
        this.order = order;
        this.items = items;
        this.buyerInfo = null;
    }
}
