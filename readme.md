# 简易电商网站

电商网站 demo，使用 Spring Boot + Next.js 构建。

## 运行

### 1. 配置数据库

1.  在 `\backend\src\main\resources\application.properties` 填写数据库连接信息。

    ```properties
    spring.datasource.url=jdbc:mysql://localhost:3306/your_database_name?useSSL=false&serverTimezone=UTC
    spring.datasource.username=your_username
    spring.datasource.password=your_password
    ```

2.  运行 `\backend\src\main\resources\init.sql` 创建数据库表结构和初始化数据。

### 2. 启动后端

**在 IDE 启动**

运行 `com.example.commerce.EcommerceApplication`

**或者使用 Maven**

1. 在 `\backend` 运行

    ```bash
    mvn spring-boot:run
    ```

后端应用将在本地 8080 端口启动。

### 3. 配置和启动前端

1.  安装依赖

    ```bash
    cd frontend
    npm install -g pnpm
    pnpm install
    ```

    或者其它包管理器


2.  启动前端开发服务器：

    ```bash
    npx next dev
    ```

前端应用将在本地 3000 端口启动。
