package com.reimbursement.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.reimbursement.entity.Policy;

import java.util.List;

public interface PolicyService {
    Page<Policy> pageList(int pageNum, int pageSize, String category, Integer status);
    List<Policy> listActive();
    Policy getById(Long id);
    Policy create(Policy policy);
    Policy update(Policy policy);
    void delete(Long id);
    void toggleStatus(Long id, Integer status);
}
