CREATE DATABASE IF NOT EXISTS `commerce` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `commerce`;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS product_specifications;
DROP TABLE IF EXISTS product_features;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS wishlist_items;

CREATE TABLE IF NOT EXISTS users
(
    id          INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    username    VARCHAR(255) NOT NULL UNIQUE COMMENT '用户名',
    email       VARCHAR(255) NOT NULL UNIQUE COMMENT '邮箱',
    password    VARCHAR(255) NOT NULL COMMENT '密码哈希',
    nickname    VARCHAR(255) COMMENT '昵称',
    avatar      VARCHAR(255) COMMENT '头像URL',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) COMMENT='用户信息表';

CREATE TABLE IF NOT EXISTS products
(
    id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '商品ID',
    name            VARCHAR(255) NOT NULL COMMENT '商品名称',
    description     TEXT COMMENT '商品描述',
    category        VARCHAR(100) COMMENT '商品分类',
    price           DECIMAL(10, 2) NOT NULL COMMENT '商品基础价格',

    images_json         JSON COMMENT '商品图片列表 JSON',
    features_json       JSON COMMENT '商品特性列表 JSON',
    specifications_json JSON COMMENT '商品规格列表 JSON',

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_products_category (category)
) COMMENT='商品基础信息表 (合并图片、规格、特性数据)';

CREATE TABLE IF NOT EXISTS product_variants
(
    id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '变体ID',
    product_id      BIGINT NOT NULL COMMENT '商品ID',
    color           VARCHAR(50) COMMENT '颜色变体值',
    size            VARCHAR(50) COMMENT '尺寸变体值',
    price           DECIMAL(10, 2) COMMENT '该变体价格 (可选)',
    image           VARCHAR(255) COMMENT '该变体图片URL (可选)',
    stock_quantity  INT NOT NULL DEFAULT 0 COMMENT '变体库存数量',
    in_stock        BOOLEAN AS (stock_quantity > 0) STORED COMMENT '是否有货状态 (生成列)',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    CONSTRAINT uk_product_variant UNIQUE (product_id, color, size),
    CONSTRAINT fk_product_variant_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_variants_product_id (product_id)
) COMMENT='商品变体(SKU)信息表';

CREATE TABLE IF NOT EXISTS cart_items
(
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '购物车项ID',
    user_id             INT NOT NULL COMMENT '用户ID',
    product_variant_id  BIGINT NOT NULL COMMENT '商品变体ID',
    quantity            INT NOT NULL DEFAULT 1 COMMENT '购买数量',
    added_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '添加时间',
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    CONSTRAINT uk_cart_item UNIQUE (user_id, product_variant_id),
    CONSTRAINT fk_cart_item_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_item_product_variant FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    INDEX idx_cart_items_user_id (user_id),
    INDEX idx_cart_items_product_variant_id (product_variant_id)
) COMMENT='用户购物车项表';

CREATE TABLE IF NOT EXISTS wishlist_items
(
    id          BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '收藏夹项ID',
    user_id     INT NOT NULL COMMENT '用户ID',
    product_id  BIGINT NOT NULL COMMENT '商品ID',
    added_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '添加时间',
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    CONSTRAINT uk_wishlist_item UNIQUE (user_id, product_id),
    CONSTRAINT fk_wishlist_item_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_wishlist_item_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_wishlist_items_user_id (user_id),
    INDEX idx_wishlist_items_product_id (product_id)
) COMMENT='用户收藏夹项表';

SET FOREIGN_KEY_CHECKS = 1;