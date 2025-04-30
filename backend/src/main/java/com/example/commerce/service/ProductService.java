package com.example.commerce.service;

import com.example.commerce.dto.ProductDTO;
import com.example.commerce.dto.ProductDetailDTO;
import com.example.commerce.dto.ProductEditResponseDTO;
import com.example.commerce.dto.UploadProductDTO;
import com.example.commerce.model.Product;
import com.example.commerce.model.User;
import com.github.pagehelper.PageInfo;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface ProductService {
    Optional<ProductDetailDTO> getProductDetail(Long productId);

    PageInfo<ProductDTO> listProducts(int pageNum, int pageSize, String category, String keyword, Double minPrice, Double maxPrice);

    List<ProductDTO> getRandomProducts(int size);

    void addProduct(UploadProductDTO newProduct, User user) throws Exception;

    List<Product> getProductByOwner(User user);

    Optional<ProductEditResponseDTO> getProductForEdit(Long productId);

    void editProduct(Long productId, UploadProductDTO updatedProductDTO, User user) throws Exception;

    void deleteProduct(Long productId, User user);

    PageInfo<Product> getAllProductsAdmin(int pageNum, int pageSize, String statusFilter);

    void updateProductStatus(Long productId, String status);

    Optional<ProductEditResponseDTO> getProductDetailsAdmin(Long productId);

    void softDeleteProduct(Long productId);
}