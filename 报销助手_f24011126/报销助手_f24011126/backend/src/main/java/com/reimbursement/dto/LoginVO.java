package com.reimbursement.dto;

import lombok.Data;

import java.util.List;

@Data
public class LoginVO {
    private String token;
    private Long userId;
    private String username;
    private String realName;
    private String deptName;
    private List<String> roles;
}
