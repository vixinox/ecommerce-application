package com.example.commerce.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserSearchDTO {
    private Long userId;
    private String username;
    private String email;
    private String nickname;
    private String role;
    private String status;
    private java.time.LocalDate registrationDateStart;
    private java.time.LocalDate registrationDateEnd;

} 