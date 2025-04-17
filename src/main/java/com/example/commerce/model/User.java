package com.example.commerce.model;

import lombok.Data;

import java.util.Objects;

@Data
public class User {
    private Long id;
    private String username;
    private String email;
    private String password;
    private String nickname;
    private String bio;
    private String avatar;

    public User(String username, String nickname, String email, String password) {
        this.username = username;
        this.email = email;
        this.password = password;

        if (Objects.equals(nickname, ""))
            this.nickname = username;
        else
            this.nickname = nickname;

        System.out.println("this.nickname: " + this.nickname);
    }

    public User() {
    }
}
