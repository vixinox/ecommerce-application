package com.example.commerce.service.impl;

import com.example.commerce.dao.UserDAO;
import com.example.commerce.service.ImageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.Set;
import java.util.UUID;

@Service
public class ImageServiceImpl implements ImageService {

    private static final Logger logger = LoggerFactory.getLogger(ImageServiceImpl.class);

    private final UserDAO userDAO;
    private final Path uploadsBaseDir;

    private static final String UPLOADS_BASE_DIR_NAME = "uploads";
    private static final String AVATARS_SUBDIR_NAME = "avatars";
    static final String PRODUCTS_SUBDIR_NAME = "products";
    private static final String TEMP_SUBDIR_NAME = "temp";

    private static final Set<String> SUPPORTED_IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private static final String AVATARS_DB_PATH_PREFIX = "/" + AVATARS_SUBDIR_NAME + "/";

    public ImageServiceImpl(UserDAO userDAO) throws IOException {
        this.userDAO = userDAO;
        this.uploadsBaseDir = Paths.get(System.getProperty("user.dir"), UPLOADS_BASE_DIR_NAME);
        try {
            Files.createDirectories(this.uploadsBaseDir);
            Files.createDirectories(this.uploadsBaseDir.resolve(PRODUCTS_SUBDIR_NAME));
            Files.createDirectories(this.uploadsBaseDir.resolve(TEMP_SUBDIR_NAME));
        } catch (IOException e) {
            logger.error("Error: 无法创建基础上传目录: {}", this.uploadsBaseDir, e);

            throw new IOException("Cannot create uploads base directory: " + this.uploadsBaseDir, e);
        }
        logger.info("info: 上传基础目录设置为: {}", this.uploadsBaseDir.toAbsolutePath());
    }

    /**
     * 检查文件是否有效且为支持的图片类型。
     * @param file 上传文件
     * @throws IllegalArgumentException 如果文件无效或类型不支持
     */
    private void checkImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("上传文件不能为空。");
        }
        String contentType = file.getContentType();
        if (contentType == null || !SUPPORTED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("仅支持 JPG, PNG, WebP 格式的图片。");
        }
    }

    /**
     * 保存文件到临时目录，并返回临时路径及最终的数据库路径。
     * @param file 上传文件
     * @param finalSubdirName 目标最终存储子目录名称 (如 "products")
     * @return 临时文件结果对象，包含临时路径和计算出的最终数据库路径
     * @throws IOException 文件处理异常
     * @throws IllegalArgumentException 输入无效
     */
    @Override
    public TempFileUploadResult saveFileToTemp(MultipartFile file, String finalSubdirName) throws IOException {
        checkImageFile(file);

        Path tempDir = getAndCreateTargetDirectory(TEMP_SUBDIR_NAME);
        getAndCreateTargetDirectory(finalSubdirName);

        String originalFilename = file.getOriginalFilename();
        String extension = getFileExtension(originalFilename);
        String tempFilename = "temp_" + UUID.randomUUID() + ".tmp";
        Path tempFilePath = tempDir.resolve(tempFilename);

        String finalFilename = UUID.randomUUID() + extension;
        String finalDbPath = "/" + finalSubdirName + "/" + finalFilename;

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, tempFilePath, StandardCopyOption.REPLACE_EXISTING);
            logger.info("info: 文件已成功保存到临时物理路径: {}", tempFilePath.toAbsolutePath());
            return new TempFileUploadResult(tempFilePath, finalDbPath);
        } catch (IOException e) {
            logger.error("Error: 保存文件到临时物理路径失败: {}", tempFilePath.toAbsolutePath(), e);
            throw new IOException("文件保存到临时目录失败。", e);
        }
    }

    /**
     * 将临时文件移动到最终目录。在事务提交后调用。会自动删除临时文件。
     * @param tempFilePath 临时文件的物理路径
     * @param finalDbPath 最终在数据库中存储的路径 (例如 "/products/xyz.jpg")
     * @throws IOException 文件移动异常
     * @throws IllegalArgumentException 路径格式无效
     */
    @Override
    public void moveFileFromTempToFinal(Path tempFilePath, String finalDbPath) throws IOException {
        if (tempFilePath == null || finalDbPath == null || finalDbPath.isEmpty()) {
            logger.warn("警告: 尝试移动文件但路径无效。临时路径: {}, 最终DB路径: {}",
                    tempFilePath != null ? tempFilePath.toAbsolutePath() : "null", finalDbPath);
            deleteTempFile(tempFilePath);
            throw new IllegalArgumentException("临时文件路径或最终DB路径无效。");
        }

        try {
            Path finalDbPathObj = Paths.get(finalDbPath);
            String finalSubdirName = finalDbPathObj.getParent().getFileName().toString();
            String finalFilename = finalDbPathObj.getFileName().toString();

            Path finalTargetDir = getAndCreateTargetDirectory(finalSubdirName);
            Path finalFilePath = finalTargetDir.resolve(finalFilename);

            if (!Files.exists(tempFilePath)) {
                logger.warn("警告: 尝试移动的临时文件不存在，可能已被清理或路径错误: {}", tempFilePath.toAbsolutePath());
                return;
            }
            Files.move(tempFilePath, finalFilePath, StandardCopyOption.REPLACE_EXISTING);
            logger.info("info: 已成功将临时文件移动到最终物理路径: {}", finalFilePath.toAbsolutePath());

        } catch (InvalidPathException e) {
            logger.error("Error: 将临时文件 {} 移动到最终路径 {} 失败, 目标DB路径格式无效。",
                    tempFilePath.toAbsolutePath(), finalDbPath, e);
            throw new IllegalArgumentException("最终DB路径格式无效。", e);
        } catch (IOException e) {
            logger.error("Error: 文件移动操作失败: {} -> {}.",
                    tempFilePath.toAbsolutePath(),
                    this.uploadsBaseDir.resolve(finalDbPath).toAbsolutePath(),
                    e);
            throw new IOException("文件移动失败。", e);
        } catch (Exception e) {
            logger.error("未预料的Error: 文件移动时发生异常: {} -> {}。",
                    tempFilePath.toAbsolutePath(),
                    this.uploadsBaseDir.resolve(finalDbPath).toAbsolutePath(),
                    e);
            throw e;
        } finally {

            deleteTempFile(tempFilePath);
        }
    }

    /**
     * 删除指定的临时文件。通常在事务回滚或移动操作后调用。
     * @param tempFilePath 临时文件的物理路径
     */
    @Override
    public void deleteTempFile(Path tempFilePath) {
        if (tempFilePath == null) return;

        if (!tempFilePath.startsWith(this.uploadsBaseDir.resolve(TEMP_SUBDIR_NAME))) {
            logger.warn("警告: 尝试删除的文件不在临时目录中，为防止误删操作被阻止: {}", tempFilePath.toAbsolutePath());
            return;
        }
        try {
            if (Files.exists(tempFilePath)) {
                Files.delete(tempFilePath);
                logger.info("info: 已删除临时文件: {}", tempFilePath.toAbsolutePath());
            } else {
                logger.warn("警告: 尝试删除的临时文件不存在，无需操作: {}", tempFilePath.toAbsolutePath());
            }
        } catch (IOException e) {
            logger.error("Error: 删除临时文件失败: {}.", tempFilePath.toAbsolutePath(), e);

        } catch (Exception e) {
            logger.error("未预料的Error: 删除临时文件时发生异常: {}.", tempFilePath.toAbsolutePath(), e);
        }
    }

    /**
     * !!! 新增方法 !!! 删除保存在最终存储位置的文件。在事务提交后调用。
     * @param dbPath 数据库中存储的文件路径 (例如 "/products/xyz.jpg")
     * @throws IOException 文件删除异常
     * @throws IllegalArgumentException 路径格式无效
     */
    @Override
    public void deleteFile(String dbPath) throws IOException {
        if (dbPath == null || dbPath.isEmpty()) {
            logger.warn("警告: 尝试删除文件但DB路径为空或无效。");
            return;
        }
        Path filePathToDelete;
        try {
            String relativePathString = dbPath;
            if (relativePathString.startsWith("/"))
                relativePathString = relativePathString.substring(1);

            Path relativePath = Paths.get(relativePathString);
            filePathToDelete = this.uploadsBaseDir.resolve(relativePath).normalize();
            if (!filePathToDelete.startsWith(this.uploadsBaseDir.normalize())) {
                logger.warn("警告: 尝试删除的文件 {} 不在上传根目录 {} 中，为防止误删操作被阻止。", filePathToDelete.toAbsolutePath(), this.uploadsBaseDir.toAbsolutePath());
                throw new IllegalArgumentException("尝试删除的路径不在允许的范围内: " + dbPath);
            }
        } catch (InvalidPathException e) {
            logger.error("Error: 提供的DB路径 '{}' 无效，无法构建物理路径进行删除。", dbPath, e);
            throw new IllegalArgumentException("提供的DB路径无效。", e);
        }

        try {
            boolean deleted = Files.deleteIfExists(filePathToDelete);
            if (deleted) {
                logger.info("info: 已删除文件: {}", filePathToDelete.toAbsolutePath());
            } else {
                logger.warn("警告: 尝试删除的文件不存在，无需操作: {}", filePathToDelete.toAbsolutePath());
            }
        } catch (IOException e) {
            logger.error("Error: 删除文件 {} 失败。", filePathToDelete.toAbsolutePath(), e);
            throw new IOException("文件删除失败。", e);
        } catch (Exception e) {
            logger.error("未预料的Error: 删除文件 {} 时发生异常。", filePathToDelete.toAbsolutePath(), e);
            throw e;
        }
    }

    /**
     * !!! 新增方法 !!! 将数据库中存储的文件路径转换为外部可访问的URL。
     * @param dbPath 数据库中存储的文件路径 (例如 "products/xyz.jpg" 或 "avatars/abc.png")
     * @return 文件的完整前端可访问API路径，如果路径无效或为空则返回空字符串或占位符
     */
    @Override
    public String generateImageUrl(String dbPath) {
        if (dbPath == null || dbPath.isEmpty() || dbPath.trim().isEmpty()) {
            return "";
        }
        String trimmedDbPath = dbPath.trim();

        if (trimmedDbPath.startsWith("/")) {
            trimmedDbPath = trimmedDbPath.substring(1);
        }

        String type = null;
        String imageName = null;

        if (trimmedDbPath.startsWith(PRODUCTS_SUBDIR_NAME + "/")) {
            type = PRODUCTS_SUBDIR_NAME;
            imageName = trimmedDbPath.substring(PRODUCTS_SUBDIR_NAME.length() + 1);
        } else if (trimmedDbPath.startsWith(AVATARS_SUBDIR_NAME + "/")) {
            type = AVATARS_SUBDIR_NAME;
            imageName = trimmedDbPath.substring(AVATARS_SUBDIR_NAME.length() + 1);
        } else {
            logger.warn("无法从dbPath '{}' 确定图片类型和名称，它不以 '{}/' 或 '{}/' 开头。", 
                        trimmedDbPath, PRODUCTS_SUBDIR_NAME, AVATARS_SUBDIR_NAME);
            return "";
        }
        if (imageName.isEmpty()) {
            logger.warn("从dbPath '{}' 解析出的图片名称为空。", trimmedDbPath);
            return "";
        }


        return "/api/image/" + type + "/" + imageName;
    }

    /**
     * 获取并确保目标子目录存在。相对于上传根目录。
     * @param subdir 子目录名称 (如 "avatars", "products", "temp")
     * @return 子目录的物理路径
     * @throws IOException 目录创建失败
     */
    private Path getAndCreateTargetDirectory(String subdir) throws IOException {
        if (subdir == null || subdir.trim().isEmpty() || subdir.contains("..")) {
            logger.error("Error: 尝试创建的子目录名称无效或包含非法字符: {}", subdir);
            throw new IllegalArgumentException("子目录名称无效。");
        }
        Path targetDir = this.uploadsBaseDir.resolve(subdir).normalize();

        if (!targetDir.startsWith(this.uploadsBaseDir.normalize())) {
            logger.error("Error: 尝试创建的目录 {} 不在上传根目录 {} 中，为防止穿越攻击被阻止。", targetDir.toAbsolutePath(), this.uploadsBaseDir.toAbsolutePath());
            throw new IllegalArgumentException("尝试创建的目录路径超出允许范围: " + subdir);
        }
        try {
            Files.createDirectories(targetDir);
            return targetDir;
        } catch (IOException e) {
            logger.error("Error: 无法创建上传目录: {}", targetDir.toAbsolutePath(), e);
            throw new IOException("无法创建上传目录: " + targetDir.toAbsolutePath(), e);
        }
    }

    /**
     * 从原始文件名中提取文件扩展名（包括点）。
     * @param filename 原始文件名
     * @return 扩展名，如 ".jpg", 如果没有找到则返回默认扩展名 ".jpg"
     */
    private String getFileExtension(String filename) {
        if (filename != null) {
            int dotIndex = filename.lastIndexOf(".");

            if (dotIndex > 0 && dotIndex < filename.length() - 1 ) {
                return filename.substring(dotIndex).toLowerCase();
            }
        }
        logger.warn("警告: 无法确定文件 '{}' 的扩展名，默认为 .jpg。", filename);
        return ".jpg";
    }

    @Override
    public String updateAvatar(String username, MultipartFile file, String oldFileDbPath) throws Exception {
        checkImageFile(file);
        Path avatarTargetDir = getAndCreateTargetDirectory(AVATARS_SUBDIR_NAME);
        NewFileUploadResult uploadResult = saveNewFile(file, avatarTargetDir);
        try {
            userDAO.updateAvatar(username, uploadResult.dbPath());
            deleteOldAvatarFile(oldFileDbPath, avatarTargetDir);
            logger.info("info: 用户 '{}' 头像更新成功。新头像路径: {}", username, uploadResult.dbPath());
            return uploadResult.dbPath();
        } catch (Exception dbException) {
            logger.error("Error: 更新用户 '{}' 头像数据库记录失败，触发文件回滚。", username, dbException);
            try {
                Files.deleteIfExists(uploadResult.filePath());
                logger.info("info: 回滚文件清理成功: {}", uploadResult.filePath().toAbsolutePath());
            } catch (IOException cleanupEx) {
                logger.error("Error: 回滚文件清理失败: {}", uploadResult.filePath().toAbsolutePath(), cleanupEx);
            }
            throw dbException;
        }
    }

    /**
     * 删除旧头像文件。这是头像管理特有的逻辑。
     * 它根据旧的DB路径构建物理路径并尝试删除。
     * @param oldFileDbPath 旧头像的数据库存储路径
     * @param avatarTargetDir 头像文件的物理存储目录
     */
    private void deleteOldAvatarFile(String oldFileDbPath, Path avatarTargetDir) {
        if (oldFileDbPath == null || oldFileDbPath.isEmpty() || oldFileDbPath.trim().isEmpty()) {
            logger.debug("debug: 没有旧头像路径指定，跳过删除旧头像。");
            return;
        }

        try {
            Path oldFileRelativePath = Paths.get(oldFileDbPath);
            String oldFileName = oldFileRelativePath.getFileName().toString();

            if (oldFileName.isEmpty() || ".".equals(oldFileName) || "..".equals(oldFileName)) {
                logger.warn("警告: 提供的旧头像文件路径 '{}' 文件名无效，跳过删除。", oldFileDbPath);
                return;
            }
            Path oldFilePath = avatarTargetDir.resolve(oldFileName).normalize();
            if (!oldFilePath.startsWith(avatarTargetDir.normalize())) {
                logger.warn("警告: 尝试删除的旧头像文件 {} 不在头像目录 {} 中，为防止误删操作被阻止。", oldFilePath.toAbsolutePath(), avatarTargetDir.toAbsolutePath());
                return;
            }

            boolean deleted = Files.deleteIfExists(oldFilePath);
            if (deleted)
                logger.info("info: 已删除旧头像文件: {}", oldFilePath.toAbsolutePath());
            else
                logger.warn("警告: 尝试删除的旧头像文件不存在或无法删除: {}", oldFilePath.toAbsolutePath());

        } catch (InvalidPathException e) {
            logger.warn("警告: 提供的旧头像文件路径 '{}' 无效，跳过删除。", oldFileDbPath, e);
        } catch (IOException e) {
            logger.warn("警告: 删除旧头像文件 '{}' 失败。", oldFileDbPath, e);
        } catch (Exception e) {
            logger.error("警告: 尝试删除旧头像文件 '{}' 时发生未预料的错误。", oldFileDbPath, e);
        }
    }

    /**
     * 直接保存上传文件到指定目录。这是旧流程（头像）使用的方法。
     *
     * @param file      上传文件
     * @param targetDir 目标物理目录
     * @return 新文件结果对象，包含物理路径和数据库路径
     * @throws IOException 文件保存失败
     */
    private NewFileUploadResult saveNewFile(MultipartFile file, Path targetDir) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String extension = getFileExtension(originalFilename);
        String newFilename = UUID.randomUUID() + extension;
        Path newFilePath = targetDir.resolve(newFilename).normalize();
        String dbPath = ImageServiceImpl.AVATARS_DB_PATH_PREFIX + newFilename;

        if (!newFilePath.startsWith(targetDir.normalize())) {
            logger.error("Error: 尝试保存的新文件 {} 不在目标目录 {} 中，为防止穿越攻击被阻止。", newFilePath.toAbsolutePath(), targetDir.toAbsolutePath());
            throw new IllegalArgumentException("尝试保存的文件路径超出允许范围: " + newFilename);
        }

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, newFilePath, StandardCopyOption.REPLACE_EXISTING);
            logger.info("info: 文件已成功保存到物理路径: {}", newFilePath.toAbsolutePath());
            return new NewFileUploadResult(newFilePath, dbPath);
        } catch (IOException e) {
            logger.error("Error: 保存新文件到物理路径失败: {}", newFilePath.toAbsolutePath(), e);
            throw new IOException("文件保存失败。", e);
        }
    }

    public record TempFileUploadResult(Path tempPath, String finalDbPath) {}
    private record NewFileUploadResult(Path filePath, String dbPath) {}
}