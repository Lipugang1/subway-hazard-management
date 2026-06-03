# 城市轨道交通隐患排查治理系统 - 项目记忆

## 技术栈
- Next.js 16 (App Router) + React 19 + TypeScript 5
- shadcn/ui + Radix UI + Tailwind CSS 4
- 本地 JSON 文件存储 (data/) + 扣子云端对象存储备份
- pnpm 作为包管理器，必须使用 `node-linker=hoisted`（.npmrc 已配置）
- ⚠️ **开发模式必须使用 Webpack**（`npx next dev --webpack`），Turbopack 在 Windows 上子进程崩溃 (0xc0000142)

## 关键踩坑经验
- **Turbopack Windows 崩溃**: Turbopack 子进程在 Windows 上崩溃 (0xc0000142 DLL初始化失败)，必须用 `--webpack` 参数启动开发服务器
- **pnpm + Windows**: pnpm 默认的符号链接隔离模式导致模块解析问题。解决方案: `.npmrc` 中设置 `node-linker=hoisted`
- **循环依赖**: `auth.ts` ↔ `local-db.ts` 通过抽取独立的 `crypto.ts` 模块解决
- **HMAC 签名 token**: 替代了不安全的 Base64 编码 token，密钥从环境变量 `TOKEN_SECRET` 读取

## 数据目录
- 持久化路径: `data/`（项目根目录下，非 /tmp）
- 数据文件: users.json, hazards.json, risk-items.json

## 默认测试账号
- admin / admin123 (系统管理员)
- inspector1 / admin123 (排查员，物资仓储部)
- reviewer1 / admin123 (审核员，安全工作部)

## 认证机制
- 登录后设置 httpOnly cookie `auth_token`（HMAC 签名 token）
- API 认证统一使用 `getAuthenticatedUserId(request)` (from `@/lib/auth-utils`)
- 前端统一使用 `authFetch()` (from `@/lib/api-client`)，自动附加 x-user-id header

## 已修复的 Bug 列表
1. 数据持久化路径 /tmp → data/（防止重启丢失）
2. Base64 token → HMAC 签名 token（安全性升级）
3. 13 个 API 路由认证方式统一
4. AI 分析正则表达式 Bug（字符类 → 分组匹配）
5. 风险数据库"新增"按钮无功能
6. 多文件上传状态管理 Bug（forEach → for...of）
7. 循环依赖 auth.ts ↔ local-db.ts
8. helpers.ts 重复 cn() 函数定义
9. RiskItem 类型与默认数据字段不一致
10. analytics 页面未使用 authFetch（代码一致性）
11. Turbopack Windows 崩溃 → 改用 Webpack 模式开发
