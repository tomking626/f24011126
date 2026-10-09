package com.reimbursement.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("document")
public class Document {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String docNo;
    private Long userId;
    private Long businessFactId;
    private Long policyId;
    private String title;
    private String reason;
    private BigDecimal amount;
    private String attachmentUrls;
    private Integer status;
    private Long reviewerId;
    private LocalDateTime reviewTime;
    private String reviewRemark;
    private LocalDateTime submitTime;
    private LocalDateTime updateTime;
}
