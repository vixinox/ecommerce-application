# 简易电商网站项目

## 项目简介

电商网站demo，使用 Spring Boot + Next.js 构建。

## 准备工作

确保已安装以下软件：

*   JDK 22
*   Maven
*   MySQL
*   Node.js
*   Bun

## 启动步骤

### 1. 配置后端

1.  找到后端配置文件 `\backend\src\main\resources\application.properties`。

2.  根据你的 MySQL 数据库配置，修改以下属性：

    ```properties
    spring.datasource.url=jdbc:mysql://localhost:3306/your_database_name?useSSL=false&serverTimezone=UTC
    spring.datasource.username=your_username
    spring.datasource.password=your_password
    spring.jpa.hibernate.ddl-auto=update
    ```

3.  运行 `\backend\src\main\resources\init.sql` 创建数据库表结构和初始化数据。

### 2. 启动后端

1.  打进入 `\backend` 目录。
    ```bash
    cd backend
    ```

2.  使用 Maven 构建和运行后端应用：

    ```bash
    mvn spring-boot:run
    ```

    后端应用将在本地 8080 端口启动。

```
或者使用 IDEA 等 IDE 直接运行 `com.example.commerce.EcommerceApplication` 类。
```

### 3. 配置和启动前端

1.  进入 `\frontend` 目录。
    ```bash
    cd frontend
    ```

2.  安装前端项目依赖：

    ```bash
    bun install
    ```

3.  启动前端开发服务器：

    ```bash
    next dev
    ```

    前端应用将在本地 3000 端口启动。
### 4. 访问网站

打开浏览器，访问 `http://localhost:3000`
