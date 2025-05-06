package com.example.commerce.service;

import com.example.commerce.dto.UserSearchDTO;
import com.example.commerce.model.User;
import com.github.pagehelper.PageInfo;

public interface UserService {
    User login(String email, String password);

    void register(User user);

    User findByName(String name);

    User findByEmail(String email);

    User updateUserInfo(User user, String email, String nickname);

    void deleteUser(String username);

    void updatePassword(User user, String currentPassword, String newPassword);

    void checkUsername(String username);

    void checkEmail(String email);

    void checkNickname(String nickname);

    User checkAuthorization(String authHeader) throws RuntimeException;

    User checkMerchant(String authHeader) throws RuntimeException;

    User checkAdmin(String authHeader);

    PageInfo<User> getAllUsers(int pageNum, int pageSize, String statusFilter);

    void updateUserStatus(Long userId, String status);

    User findUserById(Long userId);

    void updateUserRoleAdmin(Long userId, String newRole);

    void softDeleteUser(Long userId);

    /**
     * 根据条件搜索用户 (分页)
     * @param criteria 搜索条件
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @return 包含用户信息的 PageInfo 对象 (不含密码)
     */
    PageInfo<User> searchUsers(UserSearchDTO criteria, int pageNum, int pageSize);
}