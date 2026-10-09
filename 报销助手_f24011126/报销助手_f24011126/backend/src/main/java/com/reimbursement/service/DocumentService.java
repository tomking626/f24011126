package com.reimbursement.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.reimbursement.entity.Document;

public interface DocumentService {
    Page<Document> pageList(int pageNum, int pageSize, Integer status);
    Page<Document> pageListByUser(int pageNum, int pageSize, Long userId, Integer status);
    Document getById(Long id);
    Document create(Document document);
    Document update(Document document);
    void submit(Long id);
    void review(Long id, Integer status, String remark);
}
