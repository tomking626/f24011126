package com.reimbursement.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.reimbursement.common.BusinessException;
import com.reimbursement.entity.BusinessFact;
import com.reimbursement.entity.Document;
import com.reimbursement.mapper.BusinessFactMapper;
import com.reimbursement.mapper.DocumentMapper;
import com.reimbursement.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class DocumentServiceImpl implements DocumentService {

    private final DocumentMapper documentMapper;
    private final BusinessFactMapper businessFactMapper;

    @Override
    public Page<Document> pageList(int pageNum, int pageSize, Integer status) {
        Page<Document> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<Document> wrapper = new LambdaQueryWrapper<>();
        if (status != null) {
            wrapper.eq(Document::getStatus, status);
        }
        wrapper.orderByDesc(Document::getSubmitTime);
        return documentMapper.selectPage(page, wrapper);
    }

    @Override
    public Page<Document> pageListByUser(int pageNum, int pageSize, Long userId, Integer status) {
        Page<Document> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<Document> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Document::getUserId, userId);
        if (status != null) {
            wrapper.eq(Document::getStatus, status);
        }
        wrapper.orderByDesc(Document::getSubmitTime);
        return documentMapper.selectPage(page, wrapper);
    }

    @Override
    public Document getById(Long id) {
        Document doc = documentMapper.selectById(id);
        if (doc == null) {
            throw new BusinessException("单据不存在");
        }
        return doc;
    }

    @Override
    @Transactional
    public Document create(Document document) {
        document.setDocNo(generateDocNo());
        document.setStatus(0);
        document.setSubmitTime(LocalDateTime.now());
        documentMapper.insert(document);

        if (document.getBusinessFactId() != null) {
            BusinessFact fact = businessFactMapper.selectById(document.getBusinessFactId());
            if (fact != null && fact.getStatus() < 2) {
                fact.setStatus(2);
                businessFactMapper.updateById(fact);
            }
        }
        return document;
    }

    @Override
    public Document update(Document document) {
        Document existing = documentMapper.selectById(document.getId());
        if (existing == null) {
            throw new BusinessException("单据不存在");
        }
        if (existing.getStatus() > 0) {
            throw new BusinessException("非草稿状态不可修改");
        }
        documentMapper.updateById(document);
        return documentMapper.selectById(document.getId());
    }

    @Override
    public void submit(Long id) {
        Document doc = documentMapper.selectById(id);
        if (doc == null) {
            throw new BusinessException("单据不存在");
        }
        if (doc.getStatus() != 0 && doc.getStatus() != 3) {
            throw new BusinessException("当前状态不可提交");
        }
        doc.setStatus(1);
        doc.setSubmitTime(LocalDateTime.now());
        documentMapper.updateById(doc);
    }

    @Override
    public void review(Long id, Integer status, String remark) {
        Document doc = documentMapper.selectById(id);
        if (doc == null) {
            throw new BusinessException("单据不存在");
        }
        if (doc.getStatus() != 1) {
            throw new BusinessException("当前状态不可审核");
        }
        doc.setStatus(status);
        doc.setReviewTime(LocalDateTime.now());
        doc.setReviewRemark(remark);
        documentMapper.updateById(doc);
    }

    private String generateDocNo() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomPart = String.format("%03d", (int)(Math.random() * 1000));
        return "D" + datePart + randomPart;
    }
}
