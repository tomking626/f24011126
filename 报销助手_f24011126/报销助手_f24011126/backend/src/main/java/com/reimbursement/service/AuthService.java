package com.reimbursement.service;

import com.reimbursement.dto.LoginDTO;
import com.reimbursement.dto.LoginVO;
import com.reimbursement.entity.SysUser;

public interface AuthService {
    LoginVO login(LoginDTO loginDTO);
    SysUser getCurrentUser();
}
