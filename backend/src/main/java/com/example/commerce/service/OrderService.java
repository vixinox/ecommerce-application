package com.example.commerce.service;

import com.example.commerce.dto.CartItemDTO;
import com.example.commerce.dto.OrderDTO;
import com.example.commerce.dto.SpendingReportDTO;
import com.example.commerce.model.User;

import java.util.List;

public interface OrderService {
    void createOrder(User user, List<CartItemDTO> items);

    List<OrderDTO> getOrder(User user);

    SpendingReportDTO getSpendingReport(User user);
}
