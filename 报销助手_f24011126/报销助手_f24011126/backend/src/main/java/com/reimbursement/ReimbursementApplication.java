package com.reimbursement;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.reimbursement.mapper")
public class ReimbursementApplication {

    public static void main(String[] args) {
        SpringApplication.run(ReimbursementApplication.class, args);
    }
}
