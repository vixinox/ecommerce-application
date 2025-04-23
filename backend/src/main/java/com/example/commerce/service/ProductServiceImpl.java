package com.example.commerce.service;

import com.example.commerce.dao.ProductDAO;
import com.example.commerce.dto.CartItemDTO;
import com.example.commerce.dto.ProductDTO;
import com.example.commerce.dto.ProductDetailDTO;
import com.example.commerce.model.CartItem;
import com.example.commerce.model.Product;
import com.example.commerce.model.ProductVariant;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ProductServiceImpl implements ProductService {

    private final ProductDAO productDAO;
    private final ObjectMapper objectMapper;

    @Autowired
    public ProductServiceImpl(ProductDAO productDAO, ObjectMapper objectMapper) {
        this.productDAO = productDAO;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<ProductDetailDTO> getProductDetail(Long productId) {
        Product product = productDAO.getProductById(productId);
        if (product == null) return Optional.empty();

        List<ProductVariant> variants = productDAO.findVariantsByProductId(productId);

        List<String> images = parseJsonList(product.getImagesJson(), new TypeReference<>() {
        });
        List<String> features = parseJsonList(product.getFeaturesJson(), new TypeReference<>() {
        });
        List<ProductDetailDTO.ProductSpecifications> specifications = parseJsonList(product.getSpecificationsJson(), new TypeReference<>() {
        });

        ProductDetailDTO dto = new ProductDetailDTO(product.getId(), product.getName(), product.getDescription(), product.getCategory(), product.getPrice(), images, features, specifications);

        if (variants != null && !variants.isEmpty()) {
            List<ProductVariant> variantDTOs = variants.stream().map(variant -> {
                ProductVariant v = new ProductVariant();
                v.setId(variant.getId());
                v.setColor(variant.getColor());
                v.setSize(variant.getSize());
                v.setPrice(variant.getPrice() != null ? variant.getPrice() : product.getPrice());
                v.setImage(variant.getImage());
                v.setStockQuantity(Objects.requireNonNullElse(variant.getStockQuantity(), 0));
                v.setInStock(v.getStockQuantity() > 0);
                return v;
            }).collect(Collectors.toList());

            dto.setVariants(variantDTOs);
        }

        return Optional.of(dto);
    }


    /**
     * 获取商品列表，支持分页、分类过滤和关键词搜索。
     * 返回类型改为 PageInfo<ProductDTO>，包含分页信息和当前页数据 Converting to DTO in Service.
     */
    @Override
    public PageInfo<ProductDTO> listProducts(int pageNum, int pageSize, String category, String keyword) {
        PageHelper.startPage(pageNum, pageSize);

        List<Product> productEntities = productDAO.findProducts(category, keyword);

        PageInfo<Product> pageInfo = new PageInfo<>(productEntities);

        List<ProductDTO> productDTOs = pageInfo.getList().stream().map(this::convertToProductDTO).collect(Collectors.toList());

        PageInfo<ProductDTO> resultPageInfo = new PageInfo<>();
        resultPageInfo.setPageNum(pageInfo.getPageNum());
        resultPageInfo.setPageSize(pageInfo.getPageSize());
        resultPageInfo.setTotal(pageInfo.getTotal());
        resultPageInfo.setPages(pageInfo.getPages());
        resultPageInfo.setList(productDTOs);

        return resultPageInfo;
    }

    @Override
    public List<ProductDTO> getRandomProducts(int size) {
        if (size <= 0) return Collections.emptyList();
        int maxSize = Math.min(size, 20);

        List<Product> randomProducts = productDAO.findRandomProducts(maxSize);

        return randomProducts.stream().map(this::convertToProductDTO).collect(Collectors.toList());
    }

    @Override
    public List<CartItemDTO> getCartItem(Long userId) {
        List<CartItem> cartItems = productDAO.getCartItemByUserId(userId);
        List<CartItemDTO> cartItemDTOs = new ArrayList<>();

        if (cartItems == null || cartItems.isEmpty()) return cartItemDTOs;

        for (CartItem cartItem : cartItems) {
            Long productVariantId = cartItem.getProductVariantId();
            if (productVariantId == null) {
                System.err.println("Warning: Cart item ID " + cartItem.getId() + " for user " + userId + " has no product variant ID.");
                continue;
            }
            ProductVariant productVariant = productDAO.getVariantById(productVariantId);
            if (productVariant == null) {
                System.err.println("Warning: Product variant ID " + productVariantId + " linked from cart item ID " + cartItem.getId() + " not found.");
                continue;
            }

            Long productId = productVariant.getProductId();
            if (productId == null) {
                System.err.println("Warning: Product variant ID " + productVariant.getId() + " has no product ID.");
                continue;
            }

            Product product = productDAO.getProductById(productId);

            if (product == null) {
                System.err.println("Warning: Product ID " + productId + " linked from variant ID " + productVariant.getId() + " not found.");
                continue;
            }

            CartItemDTO cartItemDTO = new CartItemDTO(cartItem.getId(), product.getName(), product.getCategory(), productVariant, cartItem.getQuantity().longValue());
            cartItemDTOs.add(cartItemDTO);
        }
        return cartItemDTOs;
    }

    @Override
    public void addToCart(Long userId, Long productVariantId, Long quantity) {
        ProductVariant variant = productDAO.getVariantById(productVariantId);
        if (variant == null)
            throw new IllegalArgumentException("无效的商品款式" + productVariantId);
        if (quantity > variant.getStockQuantity())
            throw new IllegalArgumentException("库存不足，剩余库存：" + variant.getStockQuantity());

        CartItem cartItem = productDAO.findCartItemByVariantId(userId, productVariantId);

        if (cartItem == null) {
            productDAO.addCardItem(userId, productVariantId, quantity);
        } else {
            if (quantity + cartItem.getQuantity() > variant.getStockQuantity())
                throw new IllegalArgumentException("库存不足，剩余库存：" + variant.getStockQuantity());
            productDAO.updateCardItem(cartItem.getId(), cartItem.getQuantity() + quantity);
        }
    }

    @Override
    public void updateCart(Long userId, Long cartId, Long variantId, Long quantity) {
        ProductVariant variant = productDAO.getVariantById(variantId);
        CartItem cartItem = productDAO.findCartItemByCartId(cartId);

        if (variant == null)
            throw new IllegalArgumentException("无效的商品款式");
        if (quantity > variant.getStockQuantity())
            throw new IllegalArgumentException("库存不足，剩余库存：" + variant.getStockQuantity());
        if (!Objects.equals(cartItem.getUserId(), userId))
            throw new IllegalArgumentException("非法操作");

        productDAO.updateCardItem(cartItem.getId(), quantity);
    }

    @Override
    public void removeFromCart(Long userId, Long cartId) {
        CartItem cartItem = productDAO.findCartItemByCartId(cartId);
        if (cartItem == null) throw new IllegalArgumentException("无效的购物车项");
        if (!Objects.equals(cartItem.getUserId(), userId)) throw new IllegalArgumentException("非法操作");

        productDAO.removeCardItem(userId, cartId);
    }

    @Override
    public void clearCart(Long userId) {
        productDAO.clearCart(userId);
    }

    /**
     * 辅助方法：将 Product Entity 转换为用于列表展示的 ProductDTO
     */
    private ProductDTO convertToProductDTO(Product product) {
        ProductDTO dto = new ProductDTO();
        dto.setId(product.getId());
        dto.setName(product.getName());
        dto.setCategory(product.getCategory());
        dto.setPrice(product.getPrice());

        return dto;
    }

    private <T> List<T> parseJsonList(String jsonString, TypeReference<List<T>> typeRef) {
        if (jsonString == null || jsonString.trim().isEmpty()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(jsonString, typeRef);
        } catch (JsonProcessingException e) {
            System.err.println("解析JSON发送错误: " + jsonString);
            e.printStackTrace();
            return Collections.emptyList();
        }
    }
}