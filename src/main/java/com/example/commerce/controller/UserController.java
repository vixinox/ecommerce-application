package com.example.commerce.controller;

import com.example.commerce.model.User;
import com.example.commerce.service.UserService;
import com.example.commerce.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

@RestController
public class UserController {

    @Autowired
    private UserService userService;

    @Value("${file.upload-dir}")
    private String uploadDir;

    @PostMapping("/api/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginData) {
        String name = loginData.get("username");
        String password = loginData.get("password");

        User user = userService.login(name, password);

        if (user != null) {
            String token = JwtUtil.generateToken(name);
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("name", user.getUsername());
            return ResponseEntity.ok(response);
        } else {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "用户名或密码错误");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
    }

    @PostMapping("/api/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            userService.register(user.getUsername(), user.getNickname(), user.getEmail(), user.getPassword());
            return ResponseEntity.ok("注册成功");
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }

    @GetMapping("/api/user/info")
    public ResponseEntity<?> getUserInfo(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("{\"error\": \"Invalid token\"}");
        }

        String token = authHeader.substring(7);
        String username = JwtUtil.getUsernameFromToken(token);

        if (username != null && JwtUtil.isTokenValid(token)) {
            User user = userService.findByName(username);
            if (user != null) {
                return ResponseEntity.ok(user);
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("{\"error\": \"User not found\"}");
            }
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body("{\"error\": \"Invalid token\"}");
    }

    @PostMapping("/api/user/update/avatar")
    public ResponseEntity<String> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("{\"error\": \"Invalid token\"}");
        }

        String token = authHeader.substring(7);
        String username = JwtUtil.getUsernameFromToken(token);
        User user = userService.findByName(username);

        if (username != null && JwtUtil.isTokenValid(token)) {
            try {
                userService.uploadAvatar(username, file, user.getAvatar());
                return ResponseEntity.ok("头像上传成功");
            } catch (Exception e) {
                return ResponseEntity.badRequest().body("头像上传失败: " + e.getMessage());
            }
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body("{\"error\": \"Invalid token\"}");
    }

    @GetMapping("/api/avatar/{username}")
    public ResponseEntity<?> getUserAvatar(@PathVariable String username) {
        User user = userService.findByName(username);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("{\"error\": \"User not found\"}");
        }

        String avatarPath = user.getAvatar();
        if (avatarPath == null || avatarPath.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("{\"error\": \"Avatar not found\"}");
        }

        try {
            Path filePath = Paths.get(uploadDir).resolve(avatarPath.replace("/avatars/", ""));
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return ResponseEntity.ok()
                        .contentType(MediaType.IMAGE_JPEG)
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("{\"error\": \"Avatar file not found\"}");
            }
        } catch (MalformedURLException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"Error accessing avatar file\"}");
        }
    }

    @PostMapping("/api/user/update/info")
    public ResponseEntity<String> updateUserInfo(
            @RequestParam("nickname") String nickname,
            @RequestParam("email") String email,
            @RequestParam("bio") String bio,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("{\"error\": \"Invalid token\"}");
        }

        String token = authHeader.substring(7);
        String username = JwtUtil.getUsernameFromToken(token);
        System.out.println("get username: " + username);

        if (username != null && JwtUtil.isTokenValid(token)) {
            User user = userService.findByName(username);
            if (user != null) {
                userService.updateUserInfo(user, nickname, email, bio);
                return ResponseEntity.ok("用户信息更新成功");
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("{\"error\": \"User not found\"}");
            }
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body("{\"error\": \"Invalid token\"}");
    }

    @PostMapping("/api/user/delete")
    public ResponseEntity<String> deleteUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("{\"error\": \"Invalid token\"}");
        }
        String token = authHeader.substring(7);
        String username = JwtUtil.getUsernameFromToken(token);
        if (username != null && JwtUtil.isTokenValid(token)) {
            User user = userService.findByName(username);
            if (user != null) {
                String avatarPath = user.getAvatar();
                if (avatarPath != null && !avatarPath.isEmpty()) {
                    try {
                        Path filePath = Paths.get(uploadDir).resolve(avatarPath.replace("/avatars/", ""));
                        Files.deleteIfExists(filePath);
                    } catch (IOException e) {
                        System.err.println("删除头像文件失败: " + e.getMessage());
                    }
                }
                userService.deleteUser(username);
                return ResponseEntity.ok("用户删除成功");
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("{\"error\": \"User not found\"}");
            }
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body("{\"error\": \"Invalid token\"}");
    }

    @PostMapping("/api/user/update/password")
    public ResponseEntity<String> updateUserPassword(
            @RequestParam("password") String password,
            @RequestParam("newPassword") String newPassword,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("{\"error\": \"Invalid token\"}");
        }

        String token = authHeader.substring(7);
        String username = JwtUtil.getUsernameFromToken(token);

        if (username != null && JwtUtil.isTokenValid(token)) {
            User user = userService.findByName(username);
            if (user != null) {
                if (password.equals(user.getPassword())) {
                    userService.updatePassword(username, newPassword);
                    return ResponseEntity.ok("密码修改成功");
                } else {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body("{\"error\": \"原密码错误\"}");
                }
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("{\"error\": \"User not found\"}");
            }
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body("{\"error\": \"Invalid token\"}");
    }

    @GetMapping("/api/check-token")
    public ResponseEntity<String> checkUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("{\"error\": \"Invalid token\"}");
        }

        String token = authHeader.substring(7);
        String username = JwtUtil.getUsernameFromToken(token);

        if (username != null && JwtUtil.isTokenValid(token)) {
            User user = userService.findByName(username);
            if (user != null) {
                return ResponseEntity.ok("token有效");
            }
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body("{\"error\": \"Invalid token\"}");
    }
}