# 城市轨道交通隐患排查治理系统 - 开发规范

## 项目概述

本系统是一个基于 Next.js 16 + React 19 + TypeScript 的城市轨道交通运营风险隐患排查与治理管理平台。

### 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **存储**: 本地 JSON 文件 + 扣子云端对象存储备份
- **AI 集成**: 豆包视觉模型（需配置 DOUBAO_API_KEY）

## 目录结构

```
├── src/
│   ├── app/                    # 页面路由与布局
│   │   ├── api/                # API 路由
│   │   │   ├── auth/            # 认证相关 API
│   │   │   ├── hazards/         # 隐患记录 API
│   │   │   ├── risk-database/   # 风险数据库 API（保留但简化）
│   │   │   ├── admin/           # 管理功能 API
│   │   │   └── ai/              # AI 分析 API
│   │   ├── login/               # 登录页面
│   │   ├── dashboard/           # 仪表盘
│   │   ├── hazards/             # 隐患管理
│   │   ├── risk-database/       # 风险数据库（保留但简化）
│   │   └── admin/               # 管理后台
│   ├── components/ui/           # Shadcn UI 组件库
│   ├── hooks/                   # 自定义 Hooks
│   ├── lib/                     # 工具库
│   │   ├── utils.ts            # 通用工具函数
│   │   ├── local-db.ts         # 本地 JSON 数据库 + 云端备份
│   │   ├── auth.ts             # 认证工具函数
│   │   └── helpers.ts          # 辅助函数
│   └── types/                   # TypeScript 类型定义
├── public/                      # 静态资源
├── data/                        # 数据存储目录（持久化）
├── scripts/                    # 脚本
│   └── init-database.sql      # 数据库初始化脚本（保留参考）
└── .env.example               # 环境变量示例
```

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发环境
pnpm dev

# 生产构建
pnpm build

# 生产环境启动
pnpm start
```

## 数据存储

系统使用本地 JSON 文件 + 扣子云端对象存储备份：
- 数据目录：`/workspace/projects/data/`
- `users.json` - 用户数据
- `hazards.json` - 隐患记录
- `risk-items.json` - 风险数据库
- **云端备份**：数据自动备份到扣子对象存储，实例重启后可恢复

## 默认用户

系统预置了以下测试账号（密码统一为 `admin123`）：

| 用户名 | 角色 | 部门 | 岗位 |
|--------|------|------|------|
| admin | 系统管理员 | 综合管理部 | 系统管理岗 |
| inspector1 | 排查员 | 物资仓储部 | 仓管员 |
| reviewer1 | 审核员 | 安全工作部 | 安全工作岗 |

## 核心功能模块

### 1. 用户与账号管理

- 用户角色：排查员、审核员、系统管理员
- 账号绑定：排查中心、部门、班组、岗位
- 自动带入：用户登录后，排查信息自动填充
- **部门数据隔离**：非管理员用户只能查看和管理自己部门的隐患

### 2. 智能隐患上报

- 图片上传：支持多图上传
- AI 分析：调用视觉模型识别隐患（需配置 DOUBAO_API_KEY）
- 自动生成标准格式的隐患描述

### 3. 隐患审核流程

- 状态流转：草稿 → 已上报 → 审核通过/驳回 → 治理中 → 待复查 → 已关闭
- 权限控制：
  - **管理员**：可对所有隐患进行删除、修改操作，可编辑所有字段，可查看所有部门隐患
  - **普通用户**：只能对自己上报的隐患进行修改和删除，**只能查看本部门隐患**
  - **上报人**：在治理时限内可填写治理结果、具体治理情况和指定复查人
  - **草稿状态**：上报人可编辑所有隐患描述等核心字段
- 记录追溯：完整操作日志

### 4. 数据查询导出

- 多维度筛选：时间、部门、**班组**、**人员**、地点、等级、状态
- **部门筛选**：
  - 管理员：可按部门筛选，查看所有部门隐患
  - 普通用户：自动显示本部门隐患，不可查看其他部门
- Excel 导出：符合标准格式

## API 接口

### 认证相关

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户信息

### 隐患管理

- `GET /api/hazards` - 获取隐患列表（支持分页和筛选）
- `POST /api/hazards` - 创建隐患记录
- `GET /api/hazards/[id]` - 获取隐患详情
- `PUT /api/hazards/[id]` - 更新隐患
- `DELETE /api/hazards/[id]` - 删除隐患
- `POST /api/hazards/export` - 导出隐患数据

### AI 分析

- `POST /api/ai/analyze` - 分析图片并生成隐患描述

#### 请求参数
```json
{
  "image_base64": "图片base64数据"
}
```

#### 响应字段说明
| 字段 | 说明 |
|------|------|
| hazard_description | 隐患描述（按标准格式生成） |
| inspection_location | 识别出的隐患位置 |
| hazard_level | 隐患等级（general_i/I级，general_ii/II级） |

#### 隐患描述格式
AI生成的隐患描述格式为：
【排查发现日期】+【具体地理位置】+【具体隐患概况】

示例：
- X月X日排查发现，安顺车辆段物资总库杂品库内，发现普通白炽灯安装于杂品库，不符合防爆要求，存在火灾隐患。

### 管理功能

- `GET /api/admin/users` - 获取用户列表
- `POST /api/admin/users` - 创建用户

## 环境变量

```bash
# 扣子云端存储（自动配置，无需手动设置）
COZE_BUCKET_ENDPOINT_URL=https://integration.coze.cn/coze-coding-s3proxy/v1
COZE_BUCKET_NAME=bucket_xxxxx

# AI分析（可选，用于图片隐患识别）
DOUBAO_API_KEY=你的API密钥
```

## 数据持久化

系统使用本地 JSON 文件存储在 `data/` 目录：
- 数据会**自动备份**到扣子云端对象存储
- 实例重启后可从云端**自动恢复**数据
- 无需额外配置，开箱即用

## 数据库初始化

系统初始化时会自动创建默认数据：
- 3 个默认用户账号
- 5 个示例风险项

如需手动重置，可通过管理后台的「初始化数据」功能。

## 代码规范

1. 使用 TypeScript strict 模式
2. 组件使用 shadcn/ui 组件库
3. 遵循 Tailwind CSS 4 样式规范
4. API 响应统一使用 `{ success, data, error }` 格式
5. 所有需要认证的接口都需要检查 x-user-id header
