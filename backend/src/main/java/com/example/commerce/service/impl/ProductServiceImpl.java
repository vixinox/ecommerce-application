package com.example.commerce.service.impl;

import com.example.commerce.dao.ProductDAO;
import com.example.commerce.dto.ProductDTO;
import com.example.commerce.dto.ProductDetailDTO;
import com.example.commerce.dto.ProductEditResponseDTO;
import com.example.commerce.dto.UploadProductDTO;
import com.example.commerce.model.Product;
import com.example.commerce.model.ProductVariant;
import com.example.commerce.model.User;
import com.example.commerce.service.ImageService;
import com.example.commerce.service.ProductService;
import com.example.commerce.service.UserService;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import org.mybatis.spring.SqlSessionTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.*;
import java.util.stream.Collectors;

import static java.util.Collections.emptyList;

@Service
public class ProductServiceImpl implements ProductService {

    private static final Logger logger = LoggerFactory.getLogger(ProductServiceImpl.class);

    // 定义商品状态常量和有效状态集
    public static final String PRODUCT_STATUS_PENDING = "PENDING_APPROVAL";
    public static final String PRODUCT_STATUS_ACTIVE = "ACTIVE";
    public static final String PRODUCT_STATUS_INACTIVE = "INACTIVE"; // 例如下架
    public static final String PRODUCT_STATUS_REJECTED = "REJECTED";
    public static final String PRODUCT_STATUS_DELETED = "DELETED";
    private static final Set<String> VALID_PRODUCT_STATUSES = Set.of(
            PRODUCT_STATUS_PENDING,
            PRODUCT_STATUS_ACTIVE,
            PRODUCT_STATUS_INACTIVE,
            PRODUCT_STATUS_REJECTED,
            PRODUCT_STATUS_DELETED
    );

    private final ImageService imageService;
    private final ProductDAO productDAO;
    private final UserService userService;

    @Autowired
    public ProductServiceImpl(ImageService imageService, ProductDAO productDAO, UserService userService) {
        this.imageService = imageService;
        this.productDAO = productDAO;
        this.userService = userService;
    }

    @Override
    public PageInfo<ProductDTO> listProducts(int pageNum, int pageSize, String category, String keyword) {
        PageHelper.startPage(pageNum, pageSize);
        return new PageInfo<>(productDAO.searchProducts(category, keyword));
    }

    @Override
    public List<ProductDTO> getRandomProducts(int size) {
        if (size <= 0)
            return emptyList();
        return productDAO.getRandomProducts(Math.min(size, 20));
    }

    @Override
    public Optional<ProductDetailDTO> getProductDetail(Long productId) {
        return productDAO.getProductDetailWithVariants(productId);
    }

    @Override
    public List<Product> getProductByOwner(User user) {
        return productDAO.getProductByOwner(user.getId());
    }

    @Override
    @Transactional
    public void addProduct(UploadProductDTO newProductDTO, User user) throws Exception {
        if (newProductDTO == null)
            throw new IllegalArgumentException("产品数据不能为空。");
        if (user == null || user.getId() == null)
            throw new IllegalArgumentException("用户必须已认证且拥有有效的ID。");
        if (!Objects.equals(user.getRole(), "MERCHANT"))
            throw new IllegalArgumentException("你没有权限创建商品。");
        if (newProductDTO.getName() == null || newProductDTO.getName().trim().isEmpty())
            throw new IllegalArgumentException("产品名称不能为空。");
        if (newProductDTO.getVariants() == null || newProductDTO.getVariants().isEmpty())
            throw new IllegalArgumentException("产品必须至少包含一个款式。");

        Set<String> variantColorsInUse = new HashSet<>();
        for (UploadProductDTO.UploadVariantDTO variantDTO : newProductDTO.getVariants()) {
            if (variantDTO.getStockQuantity() == null || variantDTO.getStockQuantity() < 0)
                throw new IllegalArgumentException("库存数量不能为负数。");
            if (variantDTO.getPrice() == null || variantDTO.getPrice().compareTo(BigDecimal.ZERO) < 0)
                throw new IllegalArgumentException("款式价格不能为负数。");
            if (variantDTO.getColor() != null && !variantDTO.getColor().trim().isEmpty())
                variantColorsInUse.add(variantDTO.getColor().trim());
        }
        if (newProductDTO.getColorImages() != null) {
            Set<String> uploadedColors = newProductDTO.getColorImages().keySet();
            for (String uploadedColor : uploadedColors)
                if (!variantColorsInUse.contains(uploadedColor))
                    logger.warn("警告: 上传了颜色 '{}' 的图片，但在任何变体中未使用此颜色。", uploadedColor);
            for (String variantColor : variantColorsInUse)
                if (!uploadedColors.contains(variantColor))
                    logger.warn("警告: 变体使用了颜色 '{}' 但未上传对应的图片。", variantColor);
        }

        Map<String, ImageServiceImpl.TempFileUploadResult> uploadedImageResults = new HashMap<>();
        List<Path> successfulTempFiles = new ArrayList<>();
        try {
            if (newProductDTO.getColorImages() != null && !newProductDTO.getColorImages().isEmpty()) {
                for (Map.Entry<String, MultipartFile> entry : newProductDTO.getColorImages().entrySet()) {
                    String color = entry.getKey();
                    MultipartFile file = entry.getValue();
                    if (file != null && !file.isEmpty()) {
                        ImageServiceImpl.TempFileUploadResult result = imageService.saveFileToTemp(file, ImageServiceImpl.PRODUCTS_SUBDIR_NAME);
                        uploadedImageResults.put(color, result);
                        successfulTempFiles.add(result.tempPath());
                    }
                }
            }
        } catch (IOException | IllegalArgumentException e) {
            logger.error("处理上传图片失败，立即清理已暂存文件。", e);
            for (Path tempFile : successfulTempFiles) {
                try {
                    imageService.deleteTempFile(tempFile);
                } catch (Exception cleanupEx) {
                    logger.error("清理临时文件 {} 失败。", tempFile, cleanupEx);
                }
            }
            throw new Exception("图片上传预处理失败。", e);
        }

        try {
            Product product = new Product();
            product.setOwnerId(user.getId());
            product.setName(newProductDTO.getName());
            product.setDescription(newProductDTO.getDescription());
            product.setCategory(newProductDTO.getCategory());
            product.setFeatures(newProductDTO.getFeaturesJson());
            product.setSpecifications(newProductDTO.getSpecificationsJson());
            productDAO.insertProduct(product);

            Long productId = product.getId();
            if (productId == null)
                throw new RuntimeException("Failed to get generated product ID after insertion.");
            List<ProductVariant> variantsToSave = new ArrayList<>();
            if (newProductDTO.getVariants() != null) {
                for (UploadProductDTO.UploadVariantDTO variantDTO : newProductDTO.getVariants()) {
                    ProductVariant variant = new ProductVariant();
                    variant.setProductId(productId);
                    variant.setColor(variantDTO.getColor());
                    variant.setSize(variantDTO.getSize());
                    variant.setPrice(variantDTO.getPrice());
                    variant.setStockQuantity(variantDTO.getStockQuantity());
                    ImageServiceImpl.TempFileUploadResult imageResult = uploadedImageResults.get(variantDTO.getColor());

                    if (imageResult != null)
                        variant.setImage(imageResult.finalDbPath());
                    else
                        variant.setImage(null);

                    variantsToSave.add(variant);
                }
            }
            if (!variantsToSave.isEmpty()) {
                logger.info("开始保存产品变体: '{}' ", variantsToSave);
                productDAO.insertProductVariants(variantsToSave);
            }

            if (!uploadedImageResults.isEmpty()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        logger.info("事务提交成功，开始移动临时文件。");
                        for (ImageServiceImpl.TempFileUploadResult result : uploadedImageResults.values()) {
                            try {
                                imageService.moveFileFromTempToFinal(result.tempPath(), result.finalDbPath());
                            } catch (IOException e) {
                                logger.error("严重错误: 事务提交后移动文件 {} 到 {} 失败！DB记录已存在，文件丢失！", result.tempPath(), result.finalDbPath(), e);
                            }
                        }
                    }

                    @Override
                    public void afterCompletion(int status) {
                        if (status == TransactionSynchronization.STATUS_ROLLED_BACK) {
                            logger.warn("事务回滚，执行临时文件清理。");
                            for (ImageServiceImpl.TempFileUploadResult result : uploadedImageResults.values()) {
                                try {
                                    imageService.deleteTempFile(result.tempPath());
                                } catch (Exception cleanupEx) {
                                    logger.error("回滚后清理临时文件 {} 失败。", result.tempPath(), cleanupEx);
                                }
                            }
                        }
                    }
                });
            }
            logger.info("产品及其变体数据库记录已成功准备，等待事务提交并移动文件。");
        } catch (Exception dbException) {
            logger.error("数据库操作失败，事务将回滚，开始清理已暂存文件。", dbException);
            for (ImageServiceImpl.TempFileUploadResult result : uploadedImageResults.values()) {
                try {
                    imageService.deleteTempFile(result.tempPath());
                } catch (Exception cleanupEx) {
                    logger.error("清理临时文件 {} 失败。", result.tempPath(), cleanupEx);
                }
            }
            throw dbException;
        }
    }

    @Override
    public Optional<ProductEditResponseDTO> getProductForEdit(Long productId) {
        Optional<Product> productOpt = productDAO.findProductById(productId);
        if (productOpt.isEmpty())
            return Optional.empty();

        Product product = productOpt.get();
        List<ProductVariant> variants = productDAO.getVariantsByProductId(productId);
        List<ProductEditResponseDTO.VariantForEditDTO> variantDtos = variants.stream()
                .map(pv -> new ProductEditResponseDTO.VariantForEditDTO(
                        pv.getId(), pv.getColor(), pv.getSize(), pv.getPrice(), pv.getStockQuantity()
                ))
                .collect(Collectors.toList());

        Map<String, String> colorImageUrls = new HashMap<>();
        Map<String, ProductVariant> variantsByColor = new HashMap<>();
        for (ProductVariant pv : variants) {
            if (pv.getImage() != null && !pv.getImage().trim().isEmpty())
                variantsByColor.putIfAbsent(pv.getColor(), pv);
        }

        for(Map.Entry<String, ProductVariant> entry : variantsByColor.entrySet()){
            try {
                String imageUrl = imageService.generateImageUrl(entry.getValue().getImage());
                colorImageUrls.put(entry.getKey(), imageUrl);
            } catch (Exception e) {
                logger.error("生成颜色 '{}' 的图片URL失败: {}", entry.getKey(), entry.getValue().getImage(), e);
            }
        }

        // 使用无参构造函数和 setters 创建 DTO
        ProductEditResponseDTO responseDTO = new ProductEditResponseDTO();
        responseDTO.setId(product.getId());
        responseDTO.setName(product.getName());
        responseDTO.setCategory(product.getCategory());
        responseDTO.setDescription(product.getDescription());
        responseDTO.setFeaturesJson(product.getFeatures());
        responseDTO.setSpecificationsJson(product.getSpecifications());
        responseDTO.setVariants(variantDtos);
        responseDTO.setColorImageUrls(colorImageUrls);
        responseDTO.setStatus(product.getStatus());
        // getProductForEdit 不需要 ownerInfo，所以设为 null 或不设置
        responseDTO.setOwnerInfo(null);

        return Optional.of(responseDTO);
    }

    @Override
    @Transactional
    public void editProduct(Long productId, UploadProductDTO updatedProductDTO, User user) throws Exception {
        if (productId == null || updatedProductDTO == null)
            throw new IllegalArgumentException("商品ID和更新数据不能为空。");
        if (user == null || user.getId() == null)
            throw new IllegalArgumentException("用户必须已认证且拥有有效的ID。");

        Optional<Product> existingProductOpt = productDAO.findProductById(productId);
        if (existingProductOpt.isEmpty())
            throw new NoSuchElementException("商品不存在，ID: " + productId);

        Product existingProduct = existingProductOpt.get();
        if (!existingProduct.getOwnerId().equals(user.getId()))
            throw new IllegalArgumentException("你没有权限编辑此商品。");
        if (!Objects.equals(user.getRole(), "MERCHANT"))
            throw new IllegalArgumentException("你没有权限编辑商品。");
        if (updatedProductDTO.getName() == null || updatedProductDTO.getName().trim().isEmpty())
            throw new IllegalArgumentException("产品名称不能为空。");
        if (updatedProductDTO.getVariants() == null || updatedProductDTO.getVariants().isEmpty())
            throw new IllegalArgumentException("产品必须至少包含一个款式。");

        Set<String> variantColorsInUse = new HashSet<>();
        for (UploadProductDTO.UploadVariantDTO variantDTO : updatedProductDTO.getVariants()) {
            if (variantDTO.getStockQuantity() == null || variantDTO.getStockQuantity() < 0)
                throw new IllegalArgumentException("库存数量不能为负数。");
            if (variantDTO.getPrice() == null || variantDTO.getPrice().compareTo(BigDecimal.ZERO) < 0)
                throw new IllegalArgumentException("款式价格不能为负数。");
            if (variantDTO.getColor() != null && !variantDTO.getColor().trim().isEmpty())
                variantColorsInUse.add(variantDTO.getColor().trim());
        }

        if (updatedProductDTO.getColorImages() != null) {
            Set<String> uploadedColors = updatedProductDTO.getColorImages().keySet();
            for (String uploadedColor : uploadedColors)
                if (!variantColorsInUse.contains(uploadedColor))
                    logger.warn("警告: 编辑时上传了颜色 '{}' 的图片，但在任何当前提交的变体中未使用此颜色。", uploadedColor);
        }

        List<ProductVariant> currentVariants = productDAO.getVariantsByProductId(productId);
        Map<String, String> currentColorImagePaths = currentVariants.stream()
                .filter(pv -> pv.getImage() != null && !pv.getImage().trim().isEmpty())
                .collect(Collectors.toMap(ProductVariant::getColor, ProductVariant::getImage, (existing, replacement) -> existing)); // Handle potential duplicate colors by keeping the first one

        List<String> deletedFilePaths = new ArrayList<>();
        if (updatedProductDTO.getDeletedColors() != null && !updatedProductDTO.getDeletedColors().isEmpty()) {
            logger.info("开始处理商品 {} 的图片删除指令，颜色列表: {}", productId, updatedProductDTO.getDeletedColors());
            for (String colorToDelete : updatedProductDTO.getDeletedColors()) {
                String imagePathToDelete = currentColorImagePaths.get(colorToDelete);
                if (imagePathToDelete != null) {
                    deletedFilePaths.add(imagePathToDelete);
                    currentColorImagePaths.remove(colorToDelete);
                }
            }

            productDAO.clearVariantImagesByProductAndColors(productId, updatedProductDTO.getDeletedColors());
            logger.info("已在数据库中清空商品 {} 对应颜色图片的引用。", productId);
        }

        Map<String, ImageServiceImpl.TempFileUploadResult> uploadedImageResults = new HashMap<>();
        List<Path> successfulTempFiles = new ArrayList<>();
        Set<String> colorsWithNewImages = new HashSet<>();

        try {
            if (updatedProductDTO.getColorImages() != null && !updatedProductDTO.getColorImages().isEmpty()) {
                logger.info("开始处理商品 {} 的图片上传。", productId);
                for (Map.Entry<String, MultipartFile> entry : updatedProductDTO.getColorImages().entrySet()) {
                    String color = entry.getKey();
                    MultipartFile file = entry.getValue();
                    if (file != null && !file.isEmpty()) {
                        ImageServiceImpl.TempFileUploadResult result = imageService.saveFileToTemp(file, ImageServiceImpl.PRODUCTS_SUBDIR_NAME);
                        uploadedImageResults.put(color, result);
                        successfulTempFiles.add(result.tempPath());
                        colorsWithNewImages.add(color);
                    }
                }
                logger.info("已完成商品 {} 图片上传至临时目录，共 {} 张。", productId, uploadedImageResults.size());
            }
        } catch (IOException | IllegalArgumentException e) {
            logger.error("处理上传图片失败，立即清理已暂存文件。", e);
            for (Path tempFile : successfulTempFiles) {
                try {
                    imageService.deleteTempFile(tempFile);
                } catch (Exception cleanupEx) {
                    logger.error("清理临时文件 {} 失败。", tempFile, cleanupEx);
                }
            }
            throw new Exception("图片上传预处理失败。", e);
        }

        try {
            Product productToUpdate = new Product();
            productToUpdate.setId(productId);
            productToUpdate.setName(updatedProductDTO.getName());
            productToUpdate.setDescription(updatedProductDTO.getDescription());
            productToUpdate.setCategory(updatedProductDTO.getCategory());
            productToUpdate.setFeatures(updatedProductDTO.getFeaturesJson());
            productToUpdate.setSpecifications(updatedProductDTO.getSpecificationsJson());

            productDAO.updateProduct(productToUpdate);
            logger.info("商品 {} 基本信息更新成功。", productId);

            List<UploadProductDTO.UploadVariantDTO> incomingVariants = updatedProductDTO.getVariants();
            Set<Long> incomingExistingVariantIds = incomingVariants.stream()
                    .filter(v -> v.getId() != null && !v.getId().trim().isEmpty())
                    .map(v -> {
                        try {
                            return Long.parseLong(v.getId());
                        } catch (NumberFormatException e) {
                            logger.error("Invalid variant ID received: {}", v.getId(), e);
                            return null;
                        }
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            List<Long> currentVariantIds = productDAO.getVariantIdsByProductId(productId);
            List<Long> variantIdsToDelete = currentVariantIds.stream()
                    .filter(currentId -> !incomingExistingVariantIds.contains(currentId))
                    .collect(Collectors.toList());

            if (!variantIdsToDelete.isEmpty()) {
                logger.info("开始删除商品 {} 的变体，IDs: {}", productId, variantIdsToDelete);
                productDAO.deleteVariantsByIds(variantIdsToDelete);
                logger.info("商品 {} 的变体删除成功。", productId);
            }

            for (UploadProductDTO.UploadVariantDTO variantDTO : incomingVariants) {
                ProductVariant variant = new ProductVariant();
                variant.setProductId(productId);
                variant.setColor(variantDTO.getColor());
                variant.setSize(variantDTO.getSize());
                variant.setPrice(variantDTO.getPrice());
                variant.setStockQuantity(variantDTO.getStockQuantity());

                if (variantDTO.getId() != null && !variantDTO.getId().trim().isEmpty()) {
                    try {
                        variant.setId(Long.parseLong(variantDTO.getId()));
                    } catch (NumberFormatException e) {
                        logger.error("Invalid variant ID during upsert prep: {}", variantDTO.getId(), e);
                        logger.warn("Failed to parse variant ID {}, treating as new variant insert.", variantDTO.getId(), e);
                        variant.setId(null);
                    }
                }

                if (colorsWithNewImages.contains(variantDTO.getColor())) {
                    ImageServiceImpl.TempFileUploadResult result = uploadedImageResults.get(variantDTO.getColor());
                    if (result != null) {
                        variant.setImage(result.finalDbPath());
                    } else {
                        logger.error("Color '{}' in colorsWithNewImages but no result in uploadedImageResults for product {}.", variantDTO.getColor(), productId);
                        String currentImagePath = null;
                        if (variant.getId() != null) {
                            currentImagePath = currentVariants.stream()
                                    .filter(v -> v.getId().equals(variant.getId()))
                                    .findFirst()
                                    .map(ProductVariant::getImage)
                                    .orElse(null);
                        }
                        variant.setImage(currentImagePath);
                    }
                } else {
                    if (variant.getId() != null) {
                        currentVariants.stream()
                                .filter(v -> v.getId().equals(variant.getId()))
                                .findFirst()
                                .map(ProductVariant::getImage);
                    }
                    if (colorsWithNewImages.contains(variantDTO.getColor())) {
                        ImageServiceImpl.TempFileUploadResult result = uploadedImageResults.get(variantDTO.getColor());
                        if (result != null) {
                            variant.setImage(result.finalDbPath());
                        }
                    }
                }
            }

            List<ProductVariant> currentVariantsWithData = productDAO.getVariantsByProductId(productId);
            List<ProductVariant> variantsToInsert = new ArrayList<>();
            List<ProductVariant> variantsToUpdate = new ArrayList<>();
            Set<Long> currentVariantIdsSet = currentVariantsWithData.stream().map(ProductVariant::getId).collect(Collectors.toSet());

            for (UploadProductDTO.UploadVariantDTO incomingVariantDTO : incomingVariants) {
                ProductVariant pv = new ProductVariant();
                pv.setProductId(productId);
                pv.setColor(incomingVariantDTO.getColor());
                pv.setSize(incomingVariantDTO.getSize());
                pv.setPrice(incomingVariantDTO.getPrice());
                pv.setStockQuantity(incomingVariantDTO.getStockQuantity());

                Long incomingId = null;
                if (incomingVariantDTO.getId() != null && !incomingVariantDTO.getId().trim().isEmpty()) {
                    try {
                        incomingId = Long.parseLong(incomingVariantDTO.getId());
                    } catch (NumberFormatException e) {
                        logger.error("Invalid variant ID during processing: {}", incomingVariantDTO.getId(), e);
                    }
                }

                if (incomingId != null && currentVariantIdsSet.contains(incomingId)) {
                    pv.setId(incomingId);
                    if (colorsWithNewImages.contains(pv.getColor())) {
                        ImageServiceImpl.TempFileUploadResult result = uploadedImageResults.get(pv.getColor());
                        if (result != null) {
                            pv.setImage(result.finalDbPath());
                        } else {
                            Long finalIncomingId1 = incomingId;
                            String oldImagePath = currentVariantsWithData.stream()
                                    .filter(v -> v.getId().equals(finalIncomingId1))
                                    .findFirst().map(ProductVariant::getImage).orElse(null);
                            pv.setImage(oldImagePath);
                            logger.warn("Logic mismatch: Color '{}' in colorsWithNewImages but no result in uploadedImageResults. Keeping old image path {}.", pv.getColor(), oldImagePath);
                        }
                    } else {
                        Long finalIncomingId = incomingId;
                        String oldImagePath = currentVariantsWithData.stream()
                                .filter(v -> v.getId().equals(finalIncomingId))
                                .findFirst().map(ProductVariant::getImage).orElse(null);
                        pv.setImage(oldImagePath);
                    }
                    variantsToUpdate.add(pv);
                } else {
                    pv.setId(null);
                    if (colorsWithNewImages.contains(pv.getColor())) {
                        ImageServiceImpl.TempFileUploadResult result = uploadedImageResults.get(pv.getColor());
                        if (result != null) {
                            pv.setImage(result.finalDbPath());
                        } else {
                            logger.error("Logic error: New variant with color '{}' in colorsWithNewImages but no result in uploadedImageResults for product {}.", pv.getColor(), productId);
                            pv.setImage(null);
                        }
                    } else {
                        pv.setImage(null);
                    }
                    variantsToInsert.add(pv);
                }
            }

            if (!variantsToUpdate.isEmpty()) {
                logger.info("开始更新商品 {} 的变体，共 {} 条。", productId, variantsToUpdate.size());
                logger.info("{}", variantsToUpdate);
                productDAO.updateProductVariants(variantsToUpdate);
                logger.info("商品 {} 的变体更新成功。", productId);
            }
            if (!variantsToInsert.isEmpty()) {
                logger.info("开始插入商品 {} 的新变体，共 {} 条。", productId, variantsToInsert.size());
                productDAO.insertProductVariants(variantsToInsert);
                logger.info("商品 {} 的新变体插入成功。", productId);
            }


            if (!uploadedImageResults.isEmpty() || !deletedFilePaths.isEmpty()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        logger.info("事务提交成功，开始移动或删除图片文件。");
                        for (ImageServiceImpl.TempFileUploadResult result : uploadedImageResults.values()) {
                            try {
                                imageService.moveFileFromTempToFinal(result.tempPath(), result.finalDbPath());
                            } catch (IOException e) {
                                logger.error("严重错误: 事务提交后移动文件 {} 到 {} 失败！DB记录已存在，文件丢失！", result.tempPath(), result.finalDbPath(), e);
                            }
                        }
                        for (String filePath : deletedFilePaths) {
                            try {
                                imageService.deleteFile(filePath);
                                logger.info("成功删除文件: {}", filePath);
                            } catch (Exception e) {
                                logger.error("事务提交后删除旧文件 {} 失败。", filePath, e);
                            }
                        }
                        logger.info("图片文件后处理完成（移动/删除）。");
                    }

                    @Override
                    public void afterCompletion(int status) {
                        if (status == TransactionSynchronization.STATUS_ROLLED_BACK) {
                            logger.warn("事务回滚，执行临时文件清理。");
                            for (ImageServiceImpl.TempFileUploadResult result : uploadedImageResults.values()) {
                                try {
                                    imageService.deleteTempFile(result.tempPath());
                                } catch (Exception cleanupEx) {
                                    logger.error("回滚后清理临时文件 {} 失败。", result.tempPath(), cleanupEx);
                                }
                            }
                            logger.info("事务回滚后临时文件清理完成。");
                        }
                    }
                });
            }
            logger.info("商品 {} 及其变体数据库记录已成功更新，等待事务提交并处理文件。", productId);
        } catch (Exception dbException) {
            logger.error("数据库操作失败，事务将回滚，开始清理已暂存文件。", dbException);
            for (ImageServiceImpl.TempFileUploadResult result : uploadedImageResults.values()) {
                try {
                    imageService.deleteTempFile(result.tempPath());
                } catch (Exception cleanupEx) {
                    logger.error("清理临时文件 {} 失败。", result.tempPath(), cleanupEx);
                }
            }
            throw dbException;
        }
    }

    @Override
    public void deleteProduct(Long productId, User user) {
        Product product = productDAO.getProductById(productId);
        if (product == null)
            throw new NoSuchElementException("商品不存在，ID: " + productId);
        if (!product.getOwnerId().equals(user.getId()))
            throw new IllegalArgumentException("你没有权限删除此商品。");

        List<ProductVariant> variants = productDAO.getVariantsByProductId(productId);
        for (ProductVariant variant : variants) {
            if (variant.getImage() != null && !variant.getImage().trim().isEmpty()) {
                try {
                    imageService.deleteFile(variant.getImage());
                } catch (Exception e) {
                    logger.error("删除商品 {} 变体 {} 图片失败。", productId, variant.getId(), e);
                }
            }
        }

        productDAO.deleteProduct(productId);
    }

    @Override
    public PageInfo<Product> getAllProductsAdmin(int pageNum, int pageSize, String statusFilter) {
        PageHelper.startPage(pageNum, pageSize);
        List<Product> products = productDAO.findAllProductsAdmin(statusFilter);
        return new PageInfo<>(products);
    }

    @Override
    @Transactional
    public void updateProductStatus(Long productId, String status) {
        // 1. 校验状态值
        if (!VALID_PRODUCT_STATUSES.contains(status)) {
            throw new IllegalArgumentException("无效的商品状态: " + status + ". 合法状态为: " + VALID_PRODUCT_STATUSES);
        }

        Product product = productDAO.getProductById(productId);
        if (product == null) {
            throw new RuntimeException("商品不存在: " + productId);
        }
        String oldStatus = product.getStatus(); // 获取旧状态
        productDAO.updateProductStatus(productId, status);
        logger.info("管理员更新了商品 {} 的状态: {} -> {}", productId, oldStatus, status); // 添加日志
    }

    @Override
    public Optional<ProductEditResponseDTO> getProductDetailsAdmin(Long productId) {
        Optional<Product> productOpt = productDAO.findProductById(productId);
        if (productOpt.isEmpty()) {
            return Optional.empty();
        }
        Product product = productOpt.get();

        List<ProductVariant> variants = productDAO.getVariantsByProductId(productId);
        List<ProductEditResponseDTO.VariantForEditDTO> variantDtos = variants.stream()
                .map(pv -> new ProductEditResponseDTO.VariantForEditDTO(
                        pv.getId(), pv.getColor(), pv.getSize(), pv.getPrice(), pv.getStockQuantity()
                ))
                .collect(Collectors.toList());

        Map<String, String> colorImageUrls = new HashMap<>();
        Map<String, ProductVariant> variantsByColor = new HashMap<>();
        for (ProductVariant pv : variants) {
            if (pv.getImage() != null && !pv.getImage().trim().isEmpty()) {
                variantsByColor.putIfAbsent(pv.getColor(), pv);
            }
        }
        for(Map.Entry<String, ProductVariant> entry : variantsByColor.entrySet()){
            try {
                String imageUrl = imageService.generateImageUrl(entry.getValue().getImage());
                colorImageUrls.put(entry.getKey(), imageUrl);
            } catch (Exception e) {
                logger.error("为管理员生成商品 {} 颜色 '{}' 的图片URL失败: {}", productId, entry.getKey(), entry.getValue().getImage(), e);
                colorImageUrls.put(entry.getKey(), null);
            }
        }

        User ownerInfo = userService.findUserById(product.getOwnerId());

        ProductEditResponseDTO responseDTO = new ProductEditResponseDTO();
        responseDTO.setId(product.getId());
        responseDTO.setName(product.getName());
        responseDTO.setCategory(product.getCategory());
        responseDTO.setDescription(product.getDescription());
        responseDTO.setFeaturesJson(product.getFeatures());
        responseDTO.setSpecificationsJson(product.getSpecifications());
        responseDTO.setVariants(variantDtos);
        responseDTO.setColorImageUrls(colorImageUrls);
        responseDTO.setStatus(product.getStatus());
        responseDTO.setOwnerInfo(ownerInfo);

        return Optional.of(responseDTO);
    }

    @Override
    @Transactional
    public void softDeleteProduct(Long productId) {
        updateProductStatus(productId, PRODUCT_STATUS_DELETED);
        logger.info("管理员软删除了商品 {}", productId); // 添加日志
    }
}