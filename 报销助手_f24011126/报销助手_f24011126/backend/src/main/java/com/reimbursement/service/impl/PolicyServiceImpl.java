package com.reimbursement.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.reimbursement.common.BusinessException;
import com.reimbursement.entity.Policy;
import com.reimbursement.mapper.PolicyMapper;
import com.reimbursement.service.PolicyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PolicyServiceImpl implements PolicyService {

    private final PolicyMapper policyMapper;

    @Override
    public Page<Policy> pageList(int pageNum, int pageSize, String category, Integer status) {
        Page<Policy> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<Policy> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(category)) {
            wrapper.eq(Policy::getCategory, category);
        }
        if (status != null) {
            wrapper.eq(Policy::getStatus, status);
        }
        wrapper.orderByDesc(Policy::getCreateTime);
        return policyMapper.selectPage(page, wrapper);
    }

    @Override
    public List<Policy> listActive() {
        return policyMapper.selectList(
                new LambdaQueryWrapper<Policy>()
                        .eq(Policy::getStatus, 1)
                        .orderByDesc(Policy::getEffectiveDate)
        );
    }

    @Override
    public Policy getById(Long id) {
        Policy policy = policyMapper.selectById(id);
        if (policy == null) {
            throw new BusinessException("制度不存在");
        }
        return policy;
    }

    @Override
    public Policy create(Policy policy) {
        policyMapper.insert(policy);
        return policy;
    }

    @Override
    public Policy update(Policy policy) {
        Policy existing = policyMapper.selectById(policy.getId());
        if (existing == null) {
            throw new BusinessException("制度不存在");
        }
        policyMapper.updateById(policy);
        return policyMapper.selectById(policy.getId());
    }

    @Override
    public void delete(Long id) {
        Policy existing = policyMapper.selectById(id);
        if (existing == null) {
            throw new BusinessException("制度不存在");
        }
        policyMapper.deleteById(id);
    }

    @Override
    public void toggleStatus(Long id, Integer status) {
        Policy policy = policyMapper.selectById(id);
        if (policy == null) {
            throw new BusinessException("制度不存在");
        }
        policy.setStatus(status);
        policyMapper.updateById(policy);
    }
}
