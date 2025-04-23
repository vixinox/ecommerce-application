package com.example.commerce.controller;

import com.example.commerce.dto.ProductDTO;
import com.example.commerce.dto.ProductDetailDTO;
import com.example.commerce.service.ProductService;

import com.github.pagehelper.PageInfo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    @Autowired
    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    /**
     * 获取商品列表
     * @param pageNum 页码 (默认为 1)
     * @param pageSize 每页数量 (默认为 10)
     * @param category 分类名称 (可选)
     * @param keyword 搜索关键词 (可选)
     * TODO: 增加排序功能(相关性, 价格, 字母等)
     * TODO: 增加价格范围搜索
     * @return ResponseEntity 包含商品列表的 PageInfo 对象和状态码
     */
    @GetMapping
    public ResponseEntity<PageInfo<ProductDTO>> getProductList(
            @RequestParam(value = "page", defaultValue = "1") int pageNum,
            @RequestParam(value = "size", defaultValue = "10") int pageSize,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "keyword", required = false) String keyword) {
        PageInfo<ProductDTO> productPageInfo = productService.listProducts(pageNum, pageSize, category, keyword);

        return ResponseEntity.ok(productPageInfo);
    }

    @GetMapping("/{productId}")
    public ResponseEntity<ProductDetailDTO> getProductDetail(@PathVariable Long productId) {
        Optional<ProductDetailDTO> productDetail = productService.getProductDetail(productId);

        return productDetail.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @GetMapping("/random")
    public ResponseEntity<List<ProductDTO>> getRandomProducts(
            @RequestParam(value = "size", defaultValue = "8") int size) {
        List<ProductDTO> randomProducts = productService.getRandomProducts(size);
        return ResponseEntity.ok(randomProducts);
    }
}