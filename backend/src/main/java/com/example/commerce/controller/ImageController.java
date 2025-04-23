package com.example.commerce.controller;

import com.example.commerce.model.User;
import com.example.commerce.service.ImageService;
import com.example.commerce.service.UserService;
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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/image")
public class ImageController {

    @Autowired
    private UserService userService;
    @Autowired
    private ImageService imageService;

    @Value("${file.upload-dir}")
    private String uploadDir;

    private static final Map<String, MediaType> MEDIA_TYPE_MAP = new ConcurrentHashMap<>();

    static {
        MEDIA_TYPE_MAP.put("jpg", MediaType.IMAGE_JPEG);
        MEDIA_TYPE_MAP.put("jpeg", MediaType.IMAGE_JPEG);
        MEDIA_TYPE_MAP.put("png", MediaType.IMAGE_PNG);
    }

    public ImageController(UserService userService, @Value("${file.upload-dir}") String uploadDir) {
        this.userService = userService;
        this.uploadDir = uploadDir;
    }

    @GetMapping("/avatar/{username}")
    public ResponseEntity<?> getUserAvatar(@PathVariable String username) {
        User user = userService.findByName(username);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("用户不存在");
        }

        String avatarDbPath = user.getAvatar();
        if (avatarDbPath == null || avatarDbPath.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("用户没有头像");
        }

        Path filePath;
        try {
            String filename = Paths.get(avatarDbPath).getFileName().toString();
            filePath = Paths.get(uploadDir).resolve(filename);
        } catch (InvalidPathException e) {
            System.err.println("错误: 路径不合法, 用户: " + username + ", path: " + avatarDbPath);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("服务器异常，头像路径错误");
        }

        Resource resource;
        try {
            resource = new UrlResource(filePath.toUri());
        } catch (MalformedURLException e) {
            System.err.println("错误: URL格式不正确: " + filePath + ", error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("服务器异常，头像路径错误");
        }

        if (resource.exists() && resource.isReadable()) {
            MediaType mediaType = getMediaTypeForResource(resource);
            if (mediaType == null) {
                System.err.println("错误: 图片格式不支持" + filePath);
                return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                        .body("仅支持JPG、JPEG、PNG格式的图片");
            }

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
        } else {
            System.err.println("头像不存在: " + filePath + " for user: " + username);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("头像不存在");
        }
    }

    @PostMapping("/update/avatar")
    public ResponseEntity<String> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkAuthorization(authHeader);
            imageService.uploadAvatar(user.getUsername(), file, user.getAvatar());
            return ResponseEntity.ok("头像上传成功");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * 根据资源的文件名确定 MediaType
     */
    private MediaType getMediaTypeForResource(Resource resource) {
        String filename = resource.getFilename();
        if (filename == null) {
            return null;
        }
        String fileExtension = "";
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex >= 0 && dotIndex < filename.length() - 1) {
            fileExtension = filename.substring(dotIndex + 1).toLowerCase();
        }
        return MEDIA_TYPE_MAP.get(fileExtension);
    }
}
