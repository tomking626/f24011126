package com.reimbursement.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.reimbursement.entity.BusinessFact;

public interface BusinessFactService {
    Page<BusinessFact> pageList(int pageNum, int pageSize, Integer status);
    Page<BusinessFact> pageListByOwner(int pageNum, int pageSize, Long ownerId, Integer status);
    BusinessFact getById(Long id);
    BusinessFact create(BusinessFact fact);
    BusinessFact update(BusinessFact fact);
    void delete(Long id);
    void submit(Long id);
    void cancel(Long id);
}
