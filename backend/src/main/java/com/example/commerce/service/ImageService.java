package com.example.commerce.service;

import org.springframework.web.multipart.MultipartFile;

public interface ImageService {
    void uploadAvatar(String username, MultipartFile file, String oldFile) throws Exception;
}
