package com.example.commerce.controller;

import com.example.commerce.model.User;
import com.example.commerce.service.UserService;
import com.example.commerce.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    @Value("${file.avatar-upload-dir}")
    private String avatarUploadDir;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginData) {
        String email = loginData.get("email");
        String hashedPassword = loginData.get("password");

        try {
            User user = userService.login(email, hashedPassword);
            if (user != null) {
                user.setPassword(null);
                String token = JwtUtil.generateToken(user.getUsername());
                Map<String, Object> response = new HashMap<>();
                response.put("token", token);
                response.put("user", user);
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("用户名或密码错误");
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(e.getMessage());
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            userService.checkUsername(user.getUsername());
            userService.checkEmail(user.getEmail());
            userService.checkNickname(user.getNickname());
            userService.register(user);
            return ResponseEntity.ok("注册成功");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(e.getMessage());
        }
    }

    @GetMapping("/info")
    public ResponseEntity<?> getUserInfo(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(e.getMessage());
        }
    }

    @PostMapping("/update/info")
    public ResponseEntity<?> updateUserInfo(
            @RequestBody Map<String, String> userInfo,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            User updatedUser = userService.updateUserInfo(user, userInfo.get("email"), userInfo.get("nickname"));
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(e.getMessage());
        }
    }

    @PostMapping("/update/password")
    public ResponseEntity<String> updateUserPassword(
            @RequestBody Map<String, String> passwordData,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            userService.updatePassword(user, passwordData.get("currentPassword"), passwordData.get("newPassword"));
            return ResponseEntity.ok("密码修改成功");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(e.getMessage());
        }
    }


    @PostMapping("/delete")
    public ResponseEntity<String> deleteUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            String avatarPath = user.getAvatar();
            if (avatarPath != null && !avatarPath.isEmpty()) {
                try {
                    Path filePath = Paths.get(avatarUploadDir).resolve(avatarPath.replace("/avatars/", ""));
                    Files.deleteIfExists(filePath);
                } catch (IOException e) {
                    System.err.println("删除头像文件失败: " + e.getMessage());
                }
            }
            userService.deleteUser(user.getUsername());
            return ResponseEntity.ok("用户删除成功");
        } catch (RuntimeException e) {
            if (e.getMessage().contains("用户不存在"))
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("用户不存在");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("无效的登录凭证");
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @GetMapping("/check/username")
    public ResponseEntity<String> checkUsername(@RequestParam("username") String username) {
        try {
            userService.checkUsername(username);
        } catch (Exception e) {
            return ResponseEntity.ok(e.getMessage());
        }
        return ResponseEntity.ok("用户名可用");
    }

    @GetMapping("/check/email")
    public ResponseEntity<String> checkEmail(@RequestParam("email") String email) {
        try {
            userService.checkEmail(email);
        } catch (Exception e) {
            return ResponseEntity.ok(e.getMessage());
        }
        return ResponseEntity.ok("邮箱可用");
    }
}