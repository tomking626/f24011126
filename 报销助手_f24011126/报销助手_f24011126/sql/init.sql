-- =============================================
-- 报销助手_f24011126 数据库初始化脚本
-- =============================================

CREATE DATABASE IF NOT EXISTS reimbursement_assistant
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE reimbursement_assistant;

-- =============================================
-- 1. 用户表
-- =============================================
DROP TABLE IF EXISTS sys_user;
CREATE TABLE sys_user (
  id           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  username     VARCHAR(50)  NOT NULL COMMENT '登录账号',
  password     VARCHAR(100) NOT NULL COMMENT '密码(BCrypt加密)',
  real_name    VARCHAR(50)  NOT NULL COMMENT '真实姓名',
  phone        VARCHAR(20)           COMMENT '手机号',
  email        VARCHAR(100)          COMMENT '邮箱',
  dept_name    VARCHAR(100)          COMMENT '所属部门',
  status       TINYINT      NOT NULL DEFAULT 1 COMMENT '状态 0-禁用 1-启用',
  create_time  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_username (username)
) ENGINE=InnoDB COMMENT='用户表';

-- =============================================
-- 2. 角色表
-- =============================================
DROP TABLE IF EXISTS sys_role;
CREATE TABLE sys_role (
  id          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  role_code   VARCHAR(50)  NOT NULL COMMENT '角色编码',
  role_name   VARCHAR(50)  NOT NULL COMMENT '角色名称',
  description VARCHAR(200)          COMMENT '角色描述',
  create_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_role_code (role_code)
) ENGINE=InnoDB COMMENT='角色表';

-- =============================================
-- 3. 用户角色关联表
-- =============================================
DROP TABLE IF EXISTS sys_user_role;
CREATE TABLE sys_user_role (
  id          BIGINT   NOT NULL AUTO_INCREMENT,
  user_id     BIGINT   NOT NULL COMMENT '用户ID',
  role_id     BIGINT   NOT NULL COMMENT '角色ID',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_id (user_id),
  KEY idx_role_id (role_id)
) ENGINE=InnoDB COMMENT='用户角色关联表';

-- =============================================
-- 4. 报销制度表（专员维护）
-- =============================================
DROP TABLE IF EXISTS policy;
CREATE TABLE policy (
  id            BIGINT        NOT NULL AUTO_INCREMENT COMMENT '制度ID',
  title         VARCHAR(200)  NOT NULL COMMENT '制度标题',
  category      VARCHAR(50)   NOT NULL COMMENT '制度类别: travel-差旅 expense-招待 equipment-设备 other-其他',
  content       TEXT          NOT NULL COMMENT '制度内容',
  amount_limit  DECIMAL(12,2)          COMMENT '金额上限',
  effective_date DATE         NOT NULL COMMENT '生效日期',
  expire_date   DATE                   COMMENT '失效日期',
  status        TINYINT       NOT NULL DEFAULT 1 COMMENT '状态 0-已失效 1-有效',
  create_by     BIGINT                COMMENT '创建人ID',
  create_time   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_category (category),
  KEY idx_status (status)
) ENGINE=InnoDB COMMENT='报销制度表';

-- =============================================
-- 5. 业务事实表（业务员维护）
-- =============================================
DROP TABLE IF EXISTS business_fact;
CREATE TABLE business_fact (
  id           BIGINT        NOT NULL AUTO_INCREMENT COMMENT '业务事实ID',
  fact_code    VARCHAR(50)   NOT NULL COMMENT '业务单号',
  fact_type    VARCHAR(50)   NOT NULL COMMENT '业务类型: client_visit-客户拜访 meeting-会议 project-项目 other-其他',
  title        VARCHAR(200)  NOT NULL COMMENT '业务标题',
  description  TEXT                   COMMENT '业务描述',
  amount       DECIMAL(12,2) NOT NULL COMMENT '业务金额',
  fact_date    DATE          NOT NULL COMMENT '发生日期',
  owner_id     BIGINT        NOT NULL COMMENT '业务员ID',
  policy_id    BIGINT                 COMMENT '关联制度ID',
  status       TINYINT       NOT NULL DEFAULT 0 COMMENT '状态 0-草稿 1-已提交 2-已关联单据 3-已取消',
  create_time  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_fact_code (fact_code),
  KEY idx_owner_id (owner_id),
  KEY idx_policy_id (policy_id),
  KEY idx_status (status)
) ENGINE=InnoDB COMMENT='业务事实表';

-- =============================================
-- 6. 报销单据表（员工查询本人）
-- =============================================
DROP TABLE IF EXISTS document;
CREATE TABLE document (
  id          BIGINT        NOT NULL AUTO_INCREMENT COMMENT '单据ID',
  doc_no      VARCHAR(50)   NOT NULL COMMENT '单据编号',
  user_id     BIGINT        NOT NULL COMMENT '申请人(员工)ID',
  business_fact_id BIGINT             COMMENT '关联业务事实ID',
  policy_id   BIGINT                 COMMENT '关联制度ID',
  title       VARCHAR(200)  NOT NULL COMMENT '报销标题',
  reason      TEXT                   COMMENT '报销事由',
  amount      DECIMAL(12,2) NOT NULL COMMENT '报销金额',
  attachment_urls TEXT                COMMENT '附件URL(多个用逗号分隔)',
  status      TINYINT       NOT NULL DEFAULT 0 COMMENT '状态 0-待审核 1-审核中 2-已通过 3-已驳回 4-已付款',
  reviewer_id BIGINT                 COMMENT '审核人ID',
  review_time DATETIME               COMMENT '审核时间',
  review_remark TEXT                  COMMENT '审核备注',
  submit_time DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  update_time DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_doc_no (doc_no),
  KEY idx_user_id (user_id),
  KEY idx_business_fact_id (business_fact_id),
  KEY idx_status (status)
) ENGINE=InnoDB COMMENT='报销单据表';

-- =============================================
-- 初始化数据
-- =============================================

-- 初始化角色
INSERT INTO sys_role (role_code, role_name, description) VALUES
('ROLE_ADMIN', '系统管理员', '拥有所有权限'),
('ROLE_STAFF', '员工', '可查询有效制度和本人单据状态'),
('ROLE_COMMISSIONER', '专员', '负责维护报销制度'),
('ROLE_SALES', '业务员', '负责维护业务事实');

-- 初始化用户
-- 密码都是 123456 的 BCrypt 加密结果: $2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2
INSERT INTO sys_user (username, password, real_name, phone, email, dept_name, status) VALUES
('admin',      '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '系统管理员', '13800000000', 'admin@test.com', '信息中心', 1),
('zhangsan',   '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '张三',       '13800000001', 'zhangsan@test.com', '销售部',   1),
('lisi',       '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '李四',       '13800000002', 'lisi@test.com',   '财务部',   1),
('wangwu',     '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', '王五',       '13800000003', 'wangwu@test.com', '业务部',   1);

-- 初始化用户角色关联
INSERT INTO sys_user_role (user_id, role_id) VALUES
(1, 1), -- admin -> ROLE_ADMIN
(2, 2), -- zhangsan -> ROLE_STAFF (员工)
(3, 3), -- lisi -> ROLE_COMMISSIONER (专员)
(4, 4); -- wangwu -> ROLE_SALES (业务员)

-- 初始化制度数据
INSERT INTO policy (title, category, content, amount_limit, effective_date, status, create_by) VALUES
('差旅费用报销标准', 'travel', '1. 机票：经济舱\n2. 住宿：不超过500元/晚\n3. 交通补贴：80元/天\n4. 餐饮补贴：100元/天', 10000.00, '2024-01-01', 1, 3),
('客户招待费用标准', 'expense', '1. 单次招待不超过2000元\n2. 需提前报备\n3. 招待对象3人以上', 2000.00, '2024-03-01', 1, 3),
('办公设备采购制度', 'equipment', '1. 5000元以下由部门审批\n2. 5000元以上需总经理审批\n3. 统一由行政部采购', 50000.00, '2024-02-01', 1, 3);

-- 初始化业务事实数据
INSERT INTO business_fact (fact_code, fact_type, title, description, amount, fact_date, owner_id, policy_id, status) VALUES
('F20261009001', 'client_visit', '拜访ABC公司', '拜访ABC公司讨论2027年合作事宜', 1200.00, '2026-10-09', 4, 1, 1),
('F20261008001', 'meeting', '区域销售会议', '华东区季度销售会议', 800.00, '2026-10-08', 4, 1, 1);

-- 初始化单据数据
INSERT INTO document (doc_no, user_id, business_fact_id, policy_id, title, reason, amount, status, submit_time) VALUES
('D20261009001', 2, 1, 1, '差旅报销-ABC公司拜访', '前往上海拜访ABC公司产生的差旅费用', 1200.00, 2, '2026-10-09 10:00:00'),
('D20261008001', 2, 2, 1, '差旅报销-销售会议', '前往杭州参加区域销售会议', 800.00, 1, '2026-10-08 14:30:00');
