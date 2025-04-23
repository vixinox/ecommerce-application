package com.example.commerce.service;

import com.example.commerce.dao.UserDAO;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.Set;
import java.util.UUID;

@Service
public class ImageServiceImpl implements ImageService {
    @Autowired
    private UserDAO userDao;

    private static final String UPLOADS_BASE_DIR_NAME = "uploads";
    private static final String AVATARS_SUBDIR_NAME = "avatars";
    private static final Set<String> SUPPORTED_IMAGE_TYPES = Set.of("image/jpeg", "image/png");
    private static final String DB_PATH_PREFIX = "/" + AVATARS_SUBDIR_NAME + "/";

    @Override
    public void uploadAvatar(String username, MultipartFile file, String oldFile) throws Exception {
        if (file == null || file.isEmpty())
            throw new IllegalArgumentException("上传文件不能为空");

        if (!SUPPORTED_IMAGE_TYPES.contains(file.getContentType()))
            throw new IllegalArgumentException("仅支持 JPG 和 PNG 格式的图片");

        Path avatarTargetDir = getAndCreateTargetDirectory();

        deleteOldAvatarFile(oldFile, avatarTargetDir);

        NewFileUploadResult uploadResult = saveNewAvatarFile(file, avatarTargetDir);
        Path newFilePath = uploadResult.getFilePath();
        String avatarDbPath = uploadResult.getDbPath();

        try {
            userDao.updateAvatar(username, avatarDbPath);
        } catch (Exception dbException) {
            System.err.println("数据库更新失败: " + username);
            rollbackUploadedFile(newFilePath);
            throw dbException;
        }
    }


    /**
     * 获取并创建头像上传的目标目录
     * 目录结构: user.dir/uploads/avatars
     */
    private Path getAndCreateTargetDirectory() throws IOException {
        Path uploadBaseDir = Paths.get(System.getProperty("user.dir"), UPLOADS_BASE_DIR_NAME);
        Path avatarTargetDir = uploadBaseDir.resolve(AVATARS_SUBDIR_NAME);

        try {
            Files.createDirectories(avatarTargetDir);
            return avatarTargetDir;
        } catch (IOException e) {
            System.err.println("错误: 无法创建头像上传目录: " + avatarTargetDir + ", error: " + e.getMessage());
            throw new IOException("无法创建头像上传目录: " + avatarTargetDir, e);
        }
    }

    /**
     * 删除旧的头像文件 (如果提供了旧文件路径)
     */
    private void deleteOldAvatarFile(String oldFile, Path avatarTargetDir) {
        if (oldFile != null && !oldFile.isEmpty()) {
            try {
                String oldFileName = Paths.get(oldFile).getFileName().toString();
                if (!oldFileName.isEmpty()) {
                    Path oldFilePath = avatarTargetDir.resolve(oldFileName);
                    boolean deleted = Files.deleteIfExists(oldFilePath);
                    if (deleted) {
                        System.out.println("INFO: Deleted old avatar file: " + oldFilePath);
                    } else {
                        System.out.println("INFO: Old avatar file did not exist or could not be deleted: " + oldFilePath);
                    }
                }
            } catch (InvalidPathException e) {
                System.err.println("WARNING: Invalid old file path provided: " + oldFile + ", error: " + e.getMessage());
            } catch (IOException e) {
                System.err.println("WARNING: Failed to delete old avatar file: " + oldFile + ", error: " + e.getMessage());
            } catch (Exception e) {
                System.err.println("WARNING: An unexpected error occurred while trying to delete old avatar file: " + oldFile + ", error: " + e.getMessage());
            }
        }
    }

    /**
     * 保存新的头像文件到目标目录，并生成数据库存储路径
     */
    private NewFileUploadResult saveNewAvatarFile(MultipartFile file, Path avatarTargetDir) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String extension = getFileExtension(originalFilename);
        String newFilename = UUID.randomUUID() + extension;
        Path newFilePath = avatarTargetDir.resolve(newFilename);
        String avatarDbPath = DB_PATH_PREFIX + newFilename;

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, newFilePath, StandardCopyOption.REPLACE_EXISTING);
            return new NewFileUploadResult(newFilePath, avatarDbPath);
        } catch (IOException e) {
            System.err.println("ERROR: Failed to save new avatar file: " + newFilePath + ", error: " + e.getMessage());
            throw new IOException("文件保存失败，IO异常：" + e.getMessage(), e);
        }
    }

    /**
     * 从文件名中提取文件扩展名，包括点号
     */
    private String getFileExtension(String filename) {
        if (filename != null && filename.contains(".")) {
            int dotIndex = filename.lastIndexOf(".");
            if (dotIndex > 0 && dotIndex < filename.length() - 1) {
                return filename.substring(dotIndex);
            }
        }
        System.err.println("WARNING: Could not determine extension for file: " + filename + ", defaulting to .jpg");
        return ".jpg";
    }


    /**
     * 回滚：删除已上传的文件
     */
    private void rollbackUploadedFile(Path filePath) {
        if (filePath != null) {
            try {
                if (Files.exists(filePath)) {
                    Files.delete(filePath);
                    System.out.println("INFO: Rolled back (deleted) uploaded file: " + filePath);
                }
            } catch (IOException e) {
                System.err.println("CRITICAL ERROR: Failed to rollback (delete) uploaded file: " + filePath + " after DB error, error: " + e.getMessage());
            } catch (Exception e) {
                System.err.println("CRITICAL ERROR: An unexpected error occurred during file rollback for: " + filePath + ", error: " + e.getMessage());
            }
        }
    }

    @Getter
    private static class NewFileUploadResult {
        private final Path filePath;
        private final String dbPath;

        public NewFileUploadResult(Path filePath, String dbPath) {
            this.filePath = filePath;
            this.dbPath = dbPath;
        }

    }
}
