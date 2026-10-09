package com.reimbursement.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("business_fact")
public class BusinessFact {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String factCode;
    private String factType;
    private String title;
    private String description;
    private BigDecimal amount;
    private LocalDate factDate;
    private Long ownerId;
    private Long policyId;
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
