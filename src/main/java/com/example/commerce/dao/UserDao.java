package com.example.commerce.dao;

import com.example.commerce.model.User;
import org.apache.ibatis.annotations.*;

@Mapper
public interface UserDao {
    @Select("SELECT * FROM users WHERE username = #{username}")
    User findByName(@Param("username") String username);

    @Select("SELECT * FROM users WHERE username = #{username} AND password = #{password}")
    User findByNameAndPassword(@Param("username") String username, @Param("password") String password);

    @Insert("INSERT INTO users (username, nickname, email, password) VALUES (#{username}, #{nickname}, #{email}, #{password})")
    void insertUser(User user);
    
    @Update("UPDATE users SET nickname = #{nickname}, bio = #{bio}, email = #{email} WHERE username = #{username}")
    void updateUser(String username, String nickname, String email, String bio);

    @Delete("DELETE FROM users WHERE username = #{username}")
    void deleteByUsername(@Param("username") String username);

    @Update("UPDATE users SET avatar = #{avatar} WHERE username = #{username}")
    void updateAvatar(String username, String avatar);

    @Update("UPDATE users SET password = #{newPassword} WHERE username = #{username}")
    void updatePassword(String username, String newPassword);
}