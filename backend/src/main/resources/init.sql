CREATE
DATABASE IF NOT EXISTS `commerce`;

USE
`commerce`;

CREATE TABLE IF NOT EXISTS users
(
    id          INT PRIMARY KEY AUTO_INCREMENT,
    username    VARCHAR(255) NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL,
    password    VARCHAR(255) NOT NULL,
    nickname    VARCHAR(255),
    bio         TEXT,
    avatar      VARCHAR(255)
);