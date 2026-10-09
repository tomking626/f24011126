# 报销助手_f24011126

> 企业报销管理系统 - 支持多角色 RBAC 权限控制

## 📋 项目简介

报销助手是一个基于 Spring Boot + Vue 3 的企业级报销管理系统，实现了以下核心功能：

| 角色 | 权限范围 |
|------|---------|
| **员工 (STAFF)** | 查询有效制度、查询本人报销单据状态、发起报销 |
| **专员 (COMMISSIONER)** | 维护报销制度、审核报销单据 |
| **业务员 (SALES)** | 维护业务事实记录 |
| **管理员 (ADMIN)** | 拥有全部权限 |

## 🏗️ 技术栈

### 后端
- Java 17 + Spring Boot 3.2
- Spring Security + JWT (RBAC 权限控制)
- MyBatis-Plus 3.5 (ORM)
- MySQL 8.0 (数据库)

### 前端
- Vue 3 + Vite 5
- Element Plus 2.5 (UI 组件库)
- Pinia (状态管理)
- Vue Router 4 (路由)
- Axios (HTTP 客户端)

## 📁 项目结构

```
报销助手_f24011126/
├── sql/
│   └── init.sql                 # 数据库初始化脚本
├── backend/                     # Spring Boot 后端
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/reimbursement/
│       │   ├── ReimbursementApplication.java
│       │   ├── common/         # 通用类 (Result, 异常处理)
│       │   ├── config/         # 配置类 (MyBatis-Plus)
│       │   ├── controller/     # REST API 控制器
│       │   ├── dto/            # 数据传输对象
│       │   ├── entity/         # 数据库实体
│       │   ├── mapper/         # MyBatis Mapper
│       │   ├── security/       # 安全模块 (JWT, Filter)
│       │   └── service/        # 业务服务层
│       └── resources/
│           └── application.yml
└── frontend/                    # Vue 3 前端
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── api/                # API 接口封装
        ├── router/             # 路由配置
        ├── store/              # Pinia 状态管理
        ├── utils/              # 工具函数
        ├── views/              # 页面组件
        ├── App.vue
        └── main.js
```

## 🚀 快速开始

### 1. 环境要求
- JDK 17+
- Node.js 18+
- MySQL 8.0+
- Maven 3.8+

### 2. 初始化数据库

```bash
# 登录 MySQL 后执行
mysql -u root -p < sql/init.sql
```

### 3. 启动后端

```bash
cd backend
mvn spring-boot:run
```

后端服务启动在 `http://localhost:8080/api`

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端服务启动在 `http://localhost:5173`

## 🔑 测试账号

| 账号 | 密码 | 角色 |
|------|------|------|
| admin | 123456 | 管理员 |
| zhangsan | 123456 | 员工 |
| lisi | 123456 | 专员 |
| wangwu | 123456 | 业务员 |

## 🔌 API 接口

### 认证模块 `/api/auth`
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /auth/login | 登录获取 Token | 公开 |
| GET | /auth/me | 获取当前用户信息 | 登录 |

### 制度模块 `/api/policies`
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /policies/list | 查询有效制度列表 | 登录 |
| GET | /policies/page | 分页查询全部制度 | COMMISSIONER/ADMIN |
| GET | /policies/{id} | 查询制度详情 | 登录 |
| POST | /policies | 新增制度 | COMMISSIONER/ADMIN |
| PUT | /policies | 更新制度 | COMMISSIONER/ADMIN |
| DELETE | /policies/{id} | 删除制度 | ADMIN |
| PUT | /policies/{id}/status | 切换制度状态 | COMMISSIONER/ADMIN |

### 业务事实模块 `/api/business-facts`
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /business-facts/page | 分页查询全部业务 | SALES/ADMIN |
| GET | /business-facts/mine | 查询我的业务事实 | SALES/ADMIN |
| GET | /business-facts/{id} | 查询详情 | SALES/ADMIN |
| POST | /business-facts | 新增业务事实 | SALES/ADMIN |
| PUT | /business-facts | 更新业务事实 | SALES/ADMIN |
| DELETE | /business-facts/{id} | 删除业务事实 | SALES/ADMIN |
| PUT | /business-facts/{id}/submit | 提交 | SALES/ADMIN |
| PUT | /business-facts/{id}/cancel | 取消 | SALES/ADMIN |

### 单据模块 `/api/documents`
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /documents/my | 查询我的单据 | 登录 |
| GET | /documents/page | 分页查询全部单据 | COMMISSIONER/ADMIN |
| GET | /documents/{id} | 查询单据详情 | 登录 |
| POST | /documents | 新建报销单 | 登录 |
| PUT | /documents | 更新报销单 | 登录 |
| PUT | /documents/{id}/submit | 提交报销单 | 登录 |
| PUT | /documents/{id}/review | 审核报销单 | COMMISSIONER/ADMIN |

## 🗄️ 数据库设计

### ER 关系图

```
sys_user ──(多对多)── sys_role
     │                     │
     ├── business_fact (owner_id)
     │
     └── document (user_id)

policy ──(关联)── business_fact
policy ──(关联)── document
business_fact ──(关联)── document
```

### 核心表

| 表名 | 说明 |
|------|------|
| sys_user | 用户表 |
| sys_role | 角色表 (STAFF/COMMISSIONER/SALES/ADMIN) |
| sys_user_role | 用户-角色关联 |
| policy | 报销制度表 |
| business_fact | 业务事实表 |
| document | 报销单据表 |

## 🔐 权限控制说明

### 角色-权限矩阵

```
功能模块       │ STAFF │ COMMISSIONER │ SALES │ ADMIN
───────────────┼───────┼──────────────┼───────┼──────
查询制度       │  ✓    │      ✓       │   ✓   │  ✓
维护制度       │   ✗   │      ✓       │   ✗   │  ✓
查询我的单据   │  ✓    │      ✓       │   ✓   │  ✓
查询全部单据   │   ✗   │      ✓       │   ✗   │  ✓
审核单据       │   ✗   │      ✓       │   ✗   │  ✓
维护业务事实   │   ✗   │      ✗       │   ✓   │  ✓
```

### 实现方式

- 后端：`@PreAuthorize("hasRole('COMMISSIONER')")`
- 前端：路由守卫 + 元素级 `v-if` 指令
- JWT Claims 携带角色列表，无状态鉴权

## 📝 许可证

MIT License
