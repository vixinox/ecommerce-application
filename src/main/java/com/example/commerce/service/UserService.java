package com.example.commerce.service;

import com.example.commerce.model.User;
import org.springframework.web.multipart.MultipartFile;

public interface UserService {
    User login(String username, String password);
    void register(String username, String nickname, String password, String email);
    User findByName(String name);
    void uploadAvatar(String username, MultipartFile file, String oldFile) throws Exception;
    void updateUserInfo(User user, String nickname, String email, String bio);
    void deleteUser(String username);
    void updatePassword(String username, String newPassword);
}