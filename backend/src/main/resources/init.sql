SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS wishlist_items;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;


CREATE TABLE IF NOT EXISTS users
(
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    username   VARCHAR(255) NOT NULL UNIQUE,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    nickname   VARCHAR(255),
    avatar     VARCHAR(255),
    role       VARCHAR(50) DEFAULT 'USER',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products
(
    id             BIGINT PRIMARY KEY AUTO_INCREMENT,
    owner_id       BIGINT       NOT NULL,
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    category       VARCHAR(100),
    default_image  VARCHAR(255),
    min_price      DECIMAL(10, 2),
    total_stock    INT                   DEFAULT 0,
    features       JSON,
    specifications JSON,
    status         VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
    created_at     TIMESTAMP             DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP             DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_products_category (category),
    INDEX idx_products_owner_user_id (owner_id)
);

CREATE TABLE IF NOT EXISTS product_variants
(
    id             BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id     BIGINT NOT NULL,
    color          VARCHAR(50),
    size           VARCHAR(50),
    price          DECIMAL(10, 2),
    image          VARCHAR(255),
    stock_quantity INT    NOT NULL DEFAULT 0,
    in_stock       BOOLEAN AS (stock_quantity > 0) STORED,
    created_at     TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    reserved_quantity INT NOT NULL DEFAULT 0,
    CONSTRAINT uk_product_variant UNIQUE (product_id, color, size),
    CONSTRAINT fk_product_variant_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    INDEX idx_product_variants_product_id (product_id)
);

CREATE TABLE IF NOT EXISTS orders
(
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id      BIGINT         NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at   TIMESTAMP               DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP               DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    INDEX idx_orders_user_id (user_id),
    INDEX idx_orders_status (status)
);

CREATE TABLE IF NOT EXISTS order_items
(
    id                     BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id               BIGINT         NOT NULL,
    product_id             BIGINT,
    product_variant_id     BIGINT,
    quantity               INT            NOT NULL DEFAULT 1,
    purchased_price        DECIMAL(10, 2) NOT NULL,
    snapshot_product_name  VARCHAR(255)   NOT NULL,
    snapshot_variant_color VARCHAR(50),
    snapshot_variant_size  VARCHAR(50),
    snapshot_variant_image VARCHAR(255),
    created_at             TIMESTAMP               DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP               DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    INDEX idx_order_items_order_id (order_id),
    INDEX idx_order_items_product_id (product_id),
    INDEX idx_order_items_variant_id (product_variant_id)
);

CREATE TABLE IF NOT EXISTS cart_items
(
    id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id            BIGINT NOT NULL,
    product_variant_id BIGINT NOT NULL,
    quantity           INT    NOT NULL DEFAULT 1,
    added_at           TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_cart_item UNIQUE (user_id, product_variant_id),
    CONSTRAINT fk_cart_item_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_item_product_variant FOREIGN KEY (product_variant_id) REFERENCES product_variants (id) ON DELETE CASCADE,
    INDEX idx_cart_items_user_id (user_id),
    INDEX idx_cart_items_product_variant_id (product_variant_id)
);

CREATE TABLE IF NOT EXISTS wishlist_items
(
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id    BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    added_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_wishlist_item UNIQUE (user_id, product_id),
    CONSTRAINT fk_wishlist_item_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_wishlist_item_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    INDEX idx_wishlist_items_user_id (user_id),
    INDEX idx_wishlist_items_product_id (product_id)
);

SET FOREIGN_KEY_CHECKS = 1;

DELIMITER //

-- 触发器：在 product_variants 插入数据后
-- 重新计算对应商品的 default_image, min_price 和 total_stock
CREATE TRIGGER after_product_variant_insert
    AFTER INSERT
    ON product_variants
    FOR EACH ROW
BEGIN
    UPDATE products
    SET
        default_image = (SELECT image FROM product_variants WHERE product_id = NEW.product_id AND image IS NOT NULL ORDER BY id LIMIT 1),
        min_price     = IFNULL((SELECT MIN(price) FROM product_variants WHERE product_id = NEW.product_id), 0),
        total_stock   = IFNULL((SELECT SUM(stock_quantity) FROM product_variants WHERE product_id = NEW.product_id), 0)
    WHERE id = NEW.product_id;
END//

-- 触发器：在 product_variants 更新数据后
-- 重新计算对应商品的 default_image, min_price 和 total_stock
CREATE TRIGGER after_product_variant_update
    AFTER UPDATE
    ON product_variants
    FOR EACH ROW
BEGIN
    UPDATE products
    SET
        default_image = (SELECT image FROM product_variants WHERE product_id = NEW.product_id AND image IS NOT NULL ORDER BY id LIMIT 1),
        min_price     = IFNULL((SELECT MIN(price) FROM product_variants WHERE product_id = NEW.product_id), 0),
        total_stock   = IFNULL((SELECT SUM(stock_quantity) FROM product_variants WHERE product_id = NEW.product_id), 0)
    WHERE id = NEW.product_id;
END//

-- 触发器：在 product_variants 删除数据后
-- 重新计算对应商品的 default_image, min_price 和 total_stock
CREATE TRIGGER after_product_variant_delete
    AFTER DELETE
    ON product_variants
    FOR EACH ROW
BEGIN
    UPDATE products
    SET
        default_image = (SELECT image FROM product_variants WHERE product_id = OLD.product_id AND image IS NOT NULL ORDER BY id LIMIT 1),
        min_price     = IFNULL((SELECT MIN(price) FROM product_variants WHERE product_id = OLD.product_id), 0),
        total_stock   = IFNULL((SELECT SUM(stock_quantity) FROM product_variants WHERE product_id = OLD.product_id), 0)
    WHERE id = OLD.product_id;
END//

ALTER TABLE orders
    ADD COLUMN expires_at TIMESTAMP NULL DEFAULT NULL;

DELIMITER ;
