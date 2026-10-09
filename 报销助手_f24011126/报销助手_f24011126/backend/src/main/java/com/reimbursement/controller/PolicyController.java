package com.reimbursement.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.reimbursement.common.Result;
import com.reimbursement.entity.Policy;
import com.reimbursement.security.LoginUser;
import com.reimbursement.service.AuthService;
import com.reimbursement.service.PolicyService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/policies")
@RequiredArgsConstructor
public class PolicyController {

    private final PolicyService policyService;
    private final AuthService authService;

    @GetMapping("/list")
    public Result<List<Policy>> listActive() {
        return Result.success(policyService.listActive());
    }

    @GetMapping("/page")
    @PreAuthorize("hasAnyRole('COMMISSIONER', 'ADMIN')")
    public Result<Page<Policy>> pageList(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Integer status) {
        return Result.success(policyService.pageList(pageNum, pageSize, category, status));
    }

    @GetMapping("/{id}")
    public Result<Policy> getById(@PathVariable Long id) {
        return Result.success(policyService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('COMMISSIONER', 'ADMIN')")
    public Result<Policy> create(@RequestBody Policy policy) {
        SysUser current = authService.getCurrentUser();
        policy.setCreateBy(current.getId());
        return Result.success(policyService.create(policy));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('COMMISSIONER', 'ADMIN')")
    public Result<Policy> update(@RequestBody Policy policy) {
        return Result.success(policyService.update(policy));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Result<Void> delete(@PathVariable Long id) {
        policyService.delete(id);
        return Result.success();
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('COMMISSIONER', 'ADMIN')")
    public Result<Void> toggleStatus(@PathVariable Long id, @RequestParam Integer status) {
        policyService.toggleStatus(id, status);
        return Result.success();
    }
}
