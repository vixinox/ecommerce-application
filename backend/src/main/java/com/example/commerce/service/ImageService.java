package com.example.commerce.service;

import com.example.commerce.service.impl.ImageServiceImpl;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Path;

public interface ImageService {

    String updateAvatar(String username, MultipartFile file, String oldFile) throws Exception;

    void deleteTempFile(Path filePath);

    ImageServiceImpl.TempFileUploadResult saveFileToTemp(MultipartFile file, String finalSubdirName) throws IOException;

    void moveFileFromTempToFinal(Path tempFilePath, String finalDbPath) throws IOException;

    void deleteFile(String filePath) throws IOException;

    String generateImageUrl(String image);
}