package com.example.commerce.dao;

import com.example.commerce.model.User;
import org.apache.ibatis.annotations.*;

@Mapper
public interface UserDAO {
    @Select("SELECT * FROM users WHERE username = #{username}")
    User findByName(@Param("username") String username);

    @Select("SELECT email FROM users WHERE email = #{email}")
    User findByEmail(@Param("email") String email);

    @Select("SELECT username, nickname, email, password FROM users WHERE email = #{email} AND password = #{password}")
    User findByEmailAndPassword(@Param("email") String email, @Param("password") String password);

    @Select("SELECT EXISTS (SELECT 1 FROM users WHERE email = #{email} AND username != #{username} LIMIT 1)")
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
}