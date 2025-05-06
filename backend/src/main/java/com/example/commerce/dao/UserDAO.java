package com.example.commerce.dao;

import com.example.commerce.dto.UserSearchDTO;
import com.example.commerce.model.User;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface UserDAO {
    @Select("SELECT * FROM users WHERE username = #{username}")
    User findByName(@Param("username") String username);

    @Select("SELECT email FROM users WHERE email = #{email}")
    User findByEmail(@Param("email") String email);

    @Select("SELECT username, role, nickname, email, password, avatar FROM users WHERE email = #{email} AND password = #{password}")
    User findByEmailAndPassword(@Param("email") String email, @Param("password") String password);

    @Select("SELECT EXISTS (SELECT 1 FROM users WHERE email = #{email} AND username != #{username})")
    boolean existsByEmailAndExcludeUsername(@Param("email") String email, @Param("username") String username);

    @Update("UPDATE users SET nickname = #{nickname}, email = #{email} WHERE username = #{username}")
    void updateUser(@Param("username") String username, @Param("nickname") String nickname, @Param("email") String email);

    @Update("UPDATE users SET avatar = #{avatar} WHERE username = #{username}")
    void updateAvatar(@Param("username") String username, @Param("avatar") String avatar);

    @Update("UPDATE users SET password = #{newPassword} WHERE username = #{username}")
    void updatePassword(@Param("username") String username, @Param("newPassword") String newPassword);

    @Insert("INSERT INTO users (username, nickname, email, password) VALUES (#{username}, #{nickname}, #{email}, #{password})")
    void insertUser(User user);

    @Delete("DELETE FROM users WHERE username = #{username}")
    void deleteByUsername(@Param("username") String username);

    @SelectProvider(type = UserSqlProvider.class, method = "findAllUsersFiltered")
    List<User> findAllUsers(@Param("statusFilter") String statusFilter);

    @Update("UPDATE users SET status = #{status} WHERE id = #{userId}")
    void updateUserStatus(@Param("id") Long userId, @Param("status") String status);

    @Update("UPDATE product_variants SET image = #{path} WHERE id = #{productVariantId}")
    void uploadProductImageById(Long productVariantId, String path);

    @Select("SELECT id, username, email, nickname, avatar, role, status FROM users WHERE id = #{id}")
    User findById(@Param("id") Long id);

    @Select("SELECT COUNT(*) FROM users")
    Long countTotalUsers();

    @Update("UPDATE users SET role = #{role} WHERE id = #{id}")
    void updateUserRole(@Param("id") Long id, @Param("role") String role);

    @Select("SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURDATE()")
    Long countNewUsersToday();

    /**
     * 根据动态条件搜索用户列表
     * @param criteria 搜索条件
     * @return 用户列表 (不含密码)
     */
    @SelectProvider(type = UserSqlProvider.class, method = "findUsersByCriteria")
    // 确保这里的@Results映射了所有需要的字段，特别是如果User模型和数据库列名不完全一致时
    // 通常 User 模型字段名和数据库列名通过驼峰<->下划线自动映射，或者在MyBatis配置中全局设置
    // 如果没有特殊情况，可以不加@Results，依赖默认映射
    List<User> findUsersByCriteria(@Param("criteria") UserSearchDTO criteria);
}