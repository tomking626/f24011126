package com.reimbursement.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.reimbursement.common.Result;
import com.reimbursement.entity.BusinessFact;
import com.reimbursement.security.LoginUser;
import com.reimbursement.service.AuthService;
import com.reimbursement.service.BusinessFactService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/business-facts")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SALES', 'ADMIN')")
public class BusinessFactController {

    private final BusinessFactService businessFactService;
    private final AuthService authService;

    @GetMapping("/page")
    public Result<Page<BusinessFact>> pageList(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) Integer status) {
        return Result.success(businessFactService.pageList(pageNum, pageSize, status));
    }

    @GetMapping("/mine")
    public Result<Page<BusinessFact>> mine(
            @AuthenticationPrincipal LoginUser loginUser,
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) Integer status) {
        return Result.success(businessFactService.pageListByOwner(
                pageNum, pageSize, loginUser.getUserId(), status));
    }

    @GetMapping("/{id}")
    public Result<BusinessFact> getById(@PathVariable Long id) {
        return Result.success(businessFactService.getById(id));
    }

    @PostMapping
    public Result<BusinessFact> create(@RequestBody BusinessFact fact,
                                        @AuthenticationPrincipal LoginUser loginUser) {
        fact.setOwnerId(loginUser.getUserId());
        return Result.success(businessFactService.create(fact));
    }

    @PutMapping
    public Result<BusinessFact> update(@RequestBody BusinessFact fact) {
        return Result.success(businessFactService.update(fact));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        businessFactService.delete(id);
        return Result.success();
    }

    @PutMapping("/{id}/submit")
    public Result<Void> submit(@PathVariable Long id) {
        businessFactService.submit(id);
        return Result.success();
    }

    @PutMapping("/{id}/cancel")
    public Result<Void> cancel(@PathVariable Long id) {
        businessFactService.cancel(id);
        return Result.success();
    }
}
