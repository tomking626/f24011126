package com.reimbursement.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.reimbursement.common.Result;
import com.reimbursement.entity.Document;
import com.reimbursement.security.LoginUser;
import com.reimbursement.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @GetMapping("/my")
    public Result<Page<Document>> myDocuments(
            @AuthenticationPrincipal LoginUser loginUser,
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) Integer status) {
        return Result.success(documentService.pageListByUser(
                pageNum, pageSize, loginUser.getUserId(), status));
    }

    @GetMapping("/page")
    @PreAuthorize("hasAnyRole('COMMISSIONER', 'ADMIN')")
    public Result<Page<Document>> pageList(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) Integer status) {
        return Result.success(documentService.pageList(pageNum, pageSize, status));
    }

    @GetMapping("/{id}")
    public Result<Document> getById(@PathVariable Long id) {
        return Result.success(documentService.getById(id));
    }

    @PostMapping
    public Result<Document> create(@RequestBody Document document,
                                    @AuthenticationPrincipal LoginUser loginUser) {
        document.setUserId(loginUser.getUserId());
        return Result.success(documentService.create(document));
    }

    @PutMapping
    public Result<Document> update(@RequestBody Document document) {
        return Result.success(documentService.update(document));
    }

    @PutMapping("/{id}/submit")
    public Result<Void> submit(@PathVariable Long id) {
        documentService.submit(id);
        return Result.success();
    }

    @PutMapping("/{id}/review")
    @PreAuthorize("hasAnyRole('COMMISSIONER', 'ADMIN')")
    public Result<Void> review(@PathVariable Long id,
                                @RequestParam Integer status,
                                @RequestParam(required = false) String remark,
                                @AuthenticationPrincipal LoginUser loginUser) {
        documentService.review(id, status, remark);
        return Result.success();
    }
}
