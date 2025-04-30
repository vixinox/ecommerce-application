package com.example.commerce.util;

import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class FileUtils {
    private static final Map<String, MediaType> MEDIA_TYPE_MAP = new ConcurrentHashMap<>();

    static {
        MEDIA_TYPE_MAP.put("jpg", MediaType.IMAGE_JPEG);
        MEDIA_TYPE_MAP.put("jpeg", MediaType.IMAGE_JPEG);
        MEDIA_TYPE_MAP.put("png", MediaType.IMAGE_PNG);
    }

    public static MediaType getMediaTypeForResource(Resource resource) {
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