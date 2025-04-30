package com.example.commerce.service;

import com.example.commerce.dto.AdminDashboardDTO;
import com.example.commerce.dto.MerchantDashboardDTO;
import com.example.commerce.model.User;

public interface DashboardService {

    /**
     * 获取商家的仪表盘数据
     * @param merchant 商家用户对象 (需要包含 ID)
     * @return 包含仪表盘统计数据的 DTO
     */
    MerchantDashboardDTO getMerchantDashboardData(User merchant);

    // 添加管理员仪表盘数据获取方法
    AdminDashboardDTO getAdminDashboardData();

    // 如果未来需要管理员仪表盘，可以在这里添加相应方法
    // AdminDashboardDTO getAdminDashboardData(User admin);

} 