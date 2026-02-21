# AIIRC Studio 重塑计划
> 对标：Manus · Devin · AI.com · Linear · Cursor

## 一、整体架构布局（设计规范 v2 对齐）

```
┌──────────────────────────────────────────────────────────────────┐
│ TITLE BAR  h:32px  "⚡ AIIRC Studio v1.0.0"    [─][□][✕]       │
├────────┬──────────────────────────────────┬──────────────────────┤
│SIDEBAR │       MAIN CONTENT              │   RIGHT PANEL        │
│ w:56px │       flex-1                    │   w:260px            │
│        │                                 │                      │
│ [Chat] │  根据侧栏选择渲染：             │  · 系统状态          │
│ [PCs]  │  - 对话页（默认）               │  · 电脑状态          │
│ [Expl] │  - 电脑控制台                   │  · API 用量          │
│        │  - 探索模式（自主运行）         │  · Agent 集群网格    │
│  ---   │                                 │  · 升级入口（克制）  │
│ [Set]  │                                 │                      │
│ [User] │                                 │                      │
├────────┴──────────────────────────────────┴──────────────────────┤
│ STATUS BAR  h:28px  [附件][网络][保存]    [探索OFF] [⚡12,450]  │
└──────────────────────────────────────────────────────────────────┘
```

## 二、实施阶段

### Phase 1: 设计系统 + Shell 骨架（P0 今天）
- [ ] 全局 CSS 变量替换（对齐设计规范 v2 的颜色系统）
- [ ] App Shell 布局：侧边栏 + 主内容 + 右侧面板 + 底部状态栏
- [ ] 侧边栏：3 个主入口（对话/电脑/探索）+ 2 个辅助（设置/用户）
- [ ] 品牌：标题栏显示 "AIIRC Studio"

### Phase 2: 右侧状态面板（P0）
- [ ] 系统状态区：云端连接状态 + 当前模型
- [ ] 电脑状态区：本机/实体/虚拟电脑在线状态
- [ ] API 用量区：可折叠，显示 tokens 消耗和模型分布
- [ ] Agent 集群网格：20 个格子的状态可视化
- [ ] 升级入口：底部克制设计

### Phase 3: 对话页增强（P1）
- [ ] 工具调用卡片：展示 AI 调用了哪些 AIIRC 工具
- [ ] 空状态引导：3 个快捷指令卡片
- [ ] 自主模式（探索）开关：输入框旁
- [ ] 模型选择器：顶部快速切换

### Phase 4: 探索模式页（P1）
- [ ] 探索运行中状态条
- [ ] 探索日志面板
- [ ] 暂停/停止/继续控制

### Phase 5: 底部状态栏（P2）
- [ ] 左侧工具按钮
- [ ] 右侧 API 用量快捷显示

## 三、API 接入映射

| 前端功能 | 后端 API | 服务 |
|---------|---------|------|
| AI 对话 | POST /v1/chat/completions (SSE) | ai-router:3022 |
| 模型列表 | GET /v1/models | ai-router:3022 |
| API 用量 | GET /v1/usage | ai-router:3022 |
| Agent 状态 | GET /health (×20) | desktop-agent:3011-3030 |
| 电脑截屏 | POST /execute {tool:'desktop.screenshot'} | desktop-agent |
| 桌面流 | WS /stream | desktop-stream:3032 |
| 任务列表 | GET /tasks | task-service:3001 |
| 自主模式 | POST /goal-loop/start | runtime-service:3003 |
| 系统健康 | GET /health | api-gateway:3000 |

## 四、删除确认（已完成）

已从 Cherry Studio 中彻底删除的功能：
- ❌ AI 绘画 (paintings)
- ❌ 翻译 (translate)  
- ❌ 知识库 (knowledge)
- ❌ 小程序 (minapps)
- ❌ 笔记 (notes)
- ❌ OpenClaw 抓取
- ❌ 代码工具 (code)
- ❌ Launchpad
- ❌ 助手商店 (store)
- ❌ 文件管理 (files)
- ❌ 设置：常规/数据/记忆/MCP/快捷键/快捷助手/API服务器/文档处理/网页搜索/选中助手/翻译
