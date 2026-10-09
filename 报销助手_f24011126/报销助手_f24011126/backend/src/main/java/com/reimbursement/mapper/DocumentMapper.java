package com.reimbursement.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.reimbursement.entity.Document;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface DocumentMapper extends BaseMapper<Document> {
}
