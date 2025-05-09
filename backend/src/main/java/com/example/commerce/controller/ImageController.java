package com.example.commerce.controller;

import com.example.commerce.model.User;
import com.example.commerce.service.ImageService;
import com.example.commerce.service.UserService;
import com.example.commerce.util.FileUtils;
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
import java.net.MalformedURLException;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/image")
public class ImageController {
    private final ImageService imageService;
    private final UserService userService;
    private final String avatarUploadDir;
    private final String productUploadDir;

    @Autowired
    public ImageController(
            UserService userService,
            ImageService imageService,
            @Value("${file.avatar-upload-dir}") String avatarUploadDir,
            @Value("${file.product-upload-dir}") String productUploadDir) {
        this.avatarUploadDir = avatarUploadDir;
        this.productUploadDir = productUploadDir;
        this.userService = userService;
        this.imageService = imageService;
    }

    /**
     * 统一获取图片（用户头像或商品图片）
     *
     * @param type      图片类型（avatars 或 products）
     * @param imageName 图片文件名（包含扩展名，如 04f3314a-34e3-4f6b-8fa7-fa49427b27fb.jpg）
     * @return ResponseEntity
     */
    @GetMapping("/{type}/{imageName}")
    public ResponseEntity<?> getImage(
            @PathVariable String type,
            @PathVariable String imageName) {
        String uploadDir;
        String imageType;

        if ("avatars".equals(type)) {
            uploadDir = avatarUploadDir;
            imageType = "用户头像";
        } else if ("products".equals(type)) {
            uploadDir = productUploadDir;
            imageType = "商品图片";
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("无效的图片类型: " + type);
        }

        return getImageResource(imageName, uploadDir, imageType, imageName);
    }

    /**
     * 上传用户头像
     *
     * @param file       上传的文件
     * @param authHeader 授权信息
     * @return ResponseEntity
     */
    @PostMapping("/upload/avatar")
    public ResponseEntity<String> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            String newAvatar = imageService.updateAvatar(user.getUsername(), file, user.getAvatar());
            return ResponseEntity.ok(newAvatar);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * 获取图片资源的通用方法
     *
     * @param imagePath 图片路径（文件名，如 04f3314a-34e3-4f6b-8fa7-fa49427b27fb.jpg）
     * @param uploadDir 上传目录
     * @param imageName 图片名称（用于错误提示，如 "用户头像" 或 "商品图片"）
     * @param identifier 标识符（用于错误日志，通常为图片文件名）
     * @return ResponseEntity
     */
    private ResponseEntity<?> getImageResource(String imagePath, String uploadDir, String imageName, Object identifier) {
        Path filePath;
        try {
            filePath = Paths.get(uploadDir).resolve(imagePath);
        } catch (InvalidPathException e) {
            System.err.println("错误: 路径不合法, " + imageName + ": " + identifier + ", path: " + imagePath);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("服务器异常，" + imageName + "路径错误");
        }
        Resource resource;
        try {
            resource = new UrlResource(filePath.toUri());
        } catch (MalformedURLException e) {
            System.err.println("错误: URL格式不正确: " + filePath + ", error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("服务器异常，" + imageName + "路径错误");
        }
        if (!resource.exists() || !resource.isReadable()) {
            System.err.println(imageName + "不存在: " + filePath + " for " + identifier);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(imageName + "不存在");
        }
        MediaType mediaType = FileUtils.getMediaTypeForResource(resource);
        if (mediaType == null) {
            System.err.println("错误: 图片格式不支持" + filePath);
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body("仅支持JPG、JPEG、PNG格式的图片");
        }
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}