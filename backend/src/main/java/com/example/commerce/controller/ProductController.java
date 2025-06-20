package com.example.commerce.controller;

import com.example.commerce.dto.*;
import com.example.commerce.model.Product;
import com.example.commerce.model.User;
import com.example.commerce.service.ProductService;
import com.example.commerce.service.UserService;
import com.github.pagehelper.PageInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static java.util.Collections.emptyList;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final UserService userService;

    @Autowired
    public ProductController(ProductService productService, UserService userService) {
        this.productService = productService;
        this.userService = userService;
    }

    /**
     * 获取商品列表
     * @param pageNum 页码 (默认为 1)
     * @param pageSize 每页数量 (默认为 10)
     * @param category 分类名称 (可选)
     * @param keyword 搜索关键词 (可选)
     * @param minPrice 最低价格 (可选)
     * @param maxPrice 最高价格 (可选)
     * TODO: 增加排序功能(相关性, 价格, 字母等)
     * TODO: 增加价格范围搜索
     * @return ResponseEntity 包含商品列表的 PageInfo 对象和状态码
     */
    @GetMapping
    public ResponseEntity<?> getProductList(
            @RequestParam(value = "page", defaultValue = "1") int pageNum,
            @RequestParam(value = "size", defaultValue = "10") int pageSize,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "minPrice", required = false) Double minPrice,
            @RequestParam(value = "maxPrice", required = false) Double maxPrice,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = null;
        if (authorization != null) {
            try {
                User user = userService.checkAuthorization(authorization);
                userId = user.getId();
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(e.getMessage());
            }
        }
        PageInfo<ProductDTO> productPageInfo = productService.listProducts(pageNum, pageSize, category, keyword, minPrice, maxPrice, userId);
        return ResponseEntity.ok(productPageInfo);
    }

    @GetMapping("/{productId}")
    public ResponseEntity<ProductDetailDTO> getProductDetail(@PathVariable Long productId) {
        Optional<ProductDetailDTO> productDetail = productService.getProductDetail(productId);
        return productDetail.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @GetMapping("/random")
    public ResponseEntity<?> getRandomProducts(
            @RequestParam(value = "size", defaultValue = "8") int size,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = null;
        if (authorization != null) {
            try {
                User user = userService.checkAuthorization(authorization);
                userId = user.getId();
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(e.getMessage());
            }
        }
        List<ProductDTO> randomProducts = productService.getRandomProducts(size, userId);
        return ResponseEntity.ok(randomProducts);
    }

    @GetMapping("/manage")
    public ResponseEntity<?> getProductManagement(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkMerchant(authHeader);
            List<Product> productManagementList = productService.getProductByOwner(user);
            return ResponseEntity.ok(productManagementList);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(e.getMessage());
        }
    }

    @PostMapping(value = "/add", consumes = "multipart/form-data")
    public ResponseEntity<?> addProduct(
            @ModelAttribute UploadProductDTO newProduct,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            if (newProduct != null && newProduct.getColorImages() != null)
                newProduct.getColorImages().forEach((color, file) -> {
                    if (file != null && !file.isEmpty())
                        System.out.println("收到款式颜色: " + color + ", 图片: " + file.getOriginalFilename());
                });

            User user = userService.checkAuthorization(authHeader);
            productService.addProduct(newProduct, user);

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(e.getMessage());
        }
    }

    @GetMapping("/edit/{productId}")
    public ResponseEntity<?> editProduct(
            @PathVariable Long productId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            userService.checkMerchantOrAdmin(authHeader);
            Optional<ProductEditResponseDTO> productForEditOpt = productService.getProductForEdit(productId);
            return ResponseEntity.ok(productForEditOpt);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(e.getMessage());
        }
    }

    @PutMapping("/edit/{productId}")
    public ResponseEntity<?> updateProduct(
            @PathVariable Long productId,
            @ModelAttribute UploadProductDTO updatedProductDTO,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User currentUser = userService.checkMerchantOrAdmin(authHeader);
            productService.editProduct(productId, updatedProductDTO, currentUser);
            return ResponseEntity.ok().body(Map.of("message", "商品更新成功"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "商品更新失败: " + e.getMessage()));
        }
    }

    @DeleteMapping("/delete/{productId}")
    public ResponseEntity<?> deleteProduct(
            @PathVariable Long productId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkMerchant(authHeader);
            productService.deleteProduct(productId, user);
            return ResponseEntity.ok().body("商品删除成功");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body((e.getMessage()));
        }
    }

    @PutMapping("/update/status")
    public ResponseEntity<?> updateProductStatus(
            @RequestBody Map<String, String> statusData,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User user = userService.checkMerchantOrAdmin(authHeader);
            Long productId = Long.valueOf(statusData.get("productId"));
            String newStatus = statusData.get("status");
            productService.updateProductStatus(productId, newStatus.trim(), user);
            return ResponseEntity.ok(Map.of("message", "商品 " + productId + " 状态已更新为 " + newStatus));
        } catch (RuntimeException e) {
            return ResponseEntity.status(403).body("更新商品状态失败: " + e.getMessage());
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchProducts(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String categoryName,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateAddedStart,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateAddedEnd,
            @RequestParam(value = "page", defaultValue = "1") int pageNum,
            @RequestParam(value = "size", defaultValue = "10") int pageSize) {
        try {
            userService.checkAuthorization(authHeader);
            ProductSearchCriteria criteria = new ProductSearchCriteria(
                    productId, name, categoryName, status, minPrice, maxPrice,
                    Optional.ofNullable(dateAddedStart), Optional.ofNullable(dateAddedEnd)
            );
            PageInfo<Product> productPageInfo = productService.searchProductsAdmin(criteria, pageNum, pageSize);
            return ResponseEntity.ok(productPageInfo);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("搜索商品失败: " + e.getMessage());
        }
    }

    @GetMapping("/search/merchant")
    public ResponseEntity<?> searchMyProducts(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String categoryName,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateAddedStart,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateAddedEnd,
            @RequestParam(value = "page", defaultValue = "1") int pageNum,
            @RequestParam(value = "size", defaultValue = "10") int pageSize) {
        try {
            User merchant = userService.checkMerchant(authHeader);
            return ResponseEntity.ok(emptyList());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("搜索商品失败: " + e.getMessage());
        }
    }
}