package com.reimbursement.controller;

import com.reimbursement.common.Result;
import com.reimbursement.dto.LoginDTO;
import com.reimbursement.dto.LoginVO;
import com.reimbursement.entity.SysUser;
import com.reimbursement.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public Result<LoginVO> login(@Valid @RequestBody LoginDTO loginDTO) {
        return Result.success(authService.login(loginDTO));
    }

    @GetMapping("/me")
    public Result<SysUser> me() {
        return Result.success(authService.getCurrentUser());
    }
}
