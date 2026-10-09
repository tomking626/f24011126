package com.reimbursement.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.reimbursement.common.BusinessException;
import com.reimbursement.entity.BusinessFact;
import com.reimbursement.mapper.BusinessFactMapper;
import com.reimbursement.service.BusinessFactService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class BusinessFactServiceImpl implements BusinessFactService {

    private final BusinessFactMapper businessFactMapper;

    @Override
    public Page<BusinessFact> pageList(int pageNum, int pageSize, Integer status) {
        Page<BusinessFact> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BusinessFact> wrapper = new LambdaQueryWrapper<>();
        if (status != null) {
            wrapper.eq(BusinessFact::getStatus, status);
        }
        wrapper.orderByDesc(BusinessFact::getCreateTime);
        return businessFactMapper.selectPage(page, wrapper);
    }

    @Override
    public Page<BusinessFact> pageListByOwner(int pageNum, int pageSize, Long ownerId, Integer status) {
        Page<BusinessFact> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BusinessFact> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(BusinessFact::getOwnerId, ownerId);
        if (status != null) {
            wrapper.eq(BusinessFact::getStatus, status);
        }
        wrapper.orderByDesc(BusinessFact::getCreateTime);
        return businessFactMapper.selectPage(page, wrapper);
    }

    @Override
    public BusinessFact getById(Long id) {
        BusinessFact fact = businessFactMapper.selectById(id);
        if (fact == null) {
            throw new BusinessException("业务事实不存在");
        }
        return fact;
    }

    @Override
    public BusinessFact create(BusinessFact fact) {
        fact.setFactCode(generateFactCode());
        fact.setStatus(0);
        businessFactMapper.insert(fact);
        return fact;
    }

    @Override
    public BusinessFact update(BusinessFact fact) {
        BusinessFact existing = businessFactMapper.selectById(fact.getId());
        if (existing == null) {
            throw new BusinessException("业务事实不存在");
        }
        if (existing.getStatus() >= 2) {
            throw new BusinessException("已关联单据的业务事实不可修改");
        }
        businessFactMapper.updateById(fact);
        return businessFactMapper.selectById(fact.getId());
    }

    @Override
    public void delete(Long id) {
        BusinessFact existing = businessFactMapper.selectById(id);
        if (existing == null) {
            throw new BusinessException("业务事实不存在");
        }
        if (existing.getStatus() >= 2) {
            throw new BusinessException("已关联单据的业务事实不可删除");
        }
        businessFactMapper.deleteById(id);
    }

    @Override
    public void submit(Long id) {
        BusinessFact fact = businessFactMapper.selectById(id);
        if (fact == null) {
            throw new BusinessException("业务事实不存在");
        }
        fact.setStatus(1);
        businessFactMapper.updateById(fact);
    }

    @Override
    public void cancel(Long id) {
        BusinessFact fact = businessFactMapper.selectById(id);
        if (fact == null) {
            throw new BusinessException("业务事实不存在");
        }
        if (fact.getStatus() >= 2) {
            throw new BusinessException("已关联单据的业务事实不可取消");
        }
        fact.setStatus(3);
        businessFactMapper.updateById(fact);
    }

    private String generateFactCode() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomPart = String.format("%03d", (int)(Math.random() * 1000));
        return "F" + datePart + randomPart;
    }
}
