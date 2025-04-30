package com.example.commerce.service;

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

    void updateUserStatus(String username, String status);

    User findUserById(Long userId);

    void updateUserRoleAdmin(String username, String newRole);

    void softDeleteUser(String username);
}