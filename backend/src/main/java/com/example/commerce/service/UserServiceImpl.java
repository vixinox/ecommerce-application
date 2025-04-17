package com.example.commerce.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.example.commerce.dao.UserDao;
import com.example.commerce.model.User;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserDao userDao;

    @Override
    public User login(String username, String password) {
        return userDao.findByNameAndPassword(username, password);
    }

    @Override
    public void register(String username, String nickname, String email, String password) {
        if (userDao.findByName(username) != null) {
            throw new RuntimeException("用户名已存在");
        }

        User user = new User(username, nickname, email, password);
        userDao.insertUser(user);
    }

    @Override
    public User findByName(String username) {
        return userDao.findByName(username);
    }

    @Override
    public void uploadAvatar(String username, MultipartFile file, String oldFile) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("上传文件不能为空");
        }

        String contentType = file.getContentType();
        if (!Objects.equals(contentType, "image/jpeg") && !Objects.equals(contentType, "image/png")) {
            throw new IllegalArgumentException("仅支持 JPG 和 PNG 格式的图片");
        }

        Path targetPath = Paths.get(System.getProperty("user.dir"), "src", "main", "resources", "uploads", "avatars");
        Files.createDirectories(targetPath);

        if (oldFile != null && !oldFile.isEmpty()) {
            String oldFileName = Paths.get(oldFile).getFileName().toString();
            Path oldFilePath = targetPath.resolve(oldFileName);
            try {
                Files.deleteIfExists(oldFilePath);
            } catch (IOException e) {
                System.err.println("删除旧头像文件失败: " + e.getMessage());
            }
        }

        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : ".jpg";
        String newFilename = UUID.randomUUID() + extension;
        Path filePath = targetPath.resolve(newFilename);

        try (var inputStream = file.getInputStream()) {
            Files.copy(inputStream, filePath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IOException("文件上传失败，IO异常：" + e.getMessage(), e);
        }

        String avatarPath = "/avatars/" + newFilename;
        try {
            userDao.updateAvatar(username, avatarPath);
        } catch (Exception e) {
            Files.deleteIfExists(filePath);
            throw new Exception("头像上传失败，数据库更新错误：" + e.getMessage(), e);
        }
    }

    @Override
    public void updateUserInfo(User user, String nickname, String email, String bio) {
        Optional.ofNullable(nickname)
                .filter(s -> !s.isEmpty())
                .ifPresent(user::setNickname);

        Optional.ofNullable(email)
                .filter(s -> !s.isEmpty())
                .ifPresent(user::setEmail);

        Optional.ofNullable(bio)
                .filter(s -> !s.isEmpty())
                .ifPresent(user::setBio);

        userDao.updateUser(user.getUsername(), user.getNickname(), user.getEmail(), user.getBio());
    }

    @Override
    public void deleteUser(String username) {
        userDao.deleteByUsername(username);
    }

    @Override
    public void updatePassword(String username, String newPassword) {
        userDao.updatePassword(username, newPassword);
    }
}