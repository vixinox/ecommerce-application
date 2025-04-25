package com.example.commerce.dto;

import com.example.commerce.model.Order;
import com.example.commerce.model.OrderItem;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class OrderDTO {
    private Order order;
    private List<OrderItem> items;
}
