package com.example.commerce.service;

import com.example.commerce.model.User;

public interface UserService {
    User login(String email, String password);
    void register(User user);
    User findByName(String name);
    User findByEmail(String email);
    void updateUserInfo(User user, String email, String nickname);
    void deleteUser(String username);
    void updatePassword(User user, String currentPassword, String newPassword);
    void checkUsername(String username);
    void checkEmail(String email);
    void checkNickname(String nickname);
    User checkAuthorization(String authHeader);
}