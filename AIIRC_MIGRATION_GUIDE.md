# Cherry Studio → AIIRC Studio 改造指南

## 📐 架构概览

```
cherry-studio/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts             # 入口，创建窗口
│   │   └── services/            # 主进程服务（数据库、代理、更新等）
│   ├── preload/                 # Electron preload 脚本
│   └── renderer/src/            # React 渲染进程（UI 全在这里）
│       ├── App.tsx              # 根组件（Provider 嵌套）
│       ├── Router.tsx           # 路由 + 布局切换
│       ├── components/          # 共享组件
│       │   ├── app/
│       │   │   ├── Sidebar.tsx  # ⭐ 左侧导航栏（核心布局组件）
│       │   │   └── Navbar.tsx   # 顶部导航栏（可选布局）
│       │   ├── Tab/             # 标签页系统
│       │   └── ...
│       ├── pages/               # 页面组件
│       │   ├── home/            # ⭐ 核心聊天页（203 个文件！）
│       │   │   ├── HomePage.tsx # 聊天主页
│       │   │   ├── Chat.tsx     # 对话逻辑
│       │   │   ├── Navbar.tsx   # 聊天内导航
│       │   │   ├── Inputbar/    # 输入框
│       │   │   ├── Messages/    # 消息展示
│       │   │   ├── Markdown/    # MD 渲染
│       │   │   └── Tabs/        # 对话标签
│       │   ├── settings/        # 设置页（158 个文件）
│       │   ├── knowledge/       # 知识库
│       │   ├── paintings/       # AI 绘画
│       │   ├── translate/       # 翻译
│       │   ├── files/           # 文件管理
│       │   ├── notes/           # 笔记
│       │   ├── minapps/         # 小应用
│       │   ├── code/            # 代码工具
│       │   ├── openclaw/        # OpenClaw
│       │   ├── store/           # 助手商店
│       │   └── launchpad/       # 启动台
│       ├── store/               # Redux 状态管理
│       ├── services/            # 前端服务
│       ├── hooks/               # React Hooks（82 个文件）
│       └── config/              # 配置
```

## 🎯 布局结构（Router.tsx 是关键）

Cherry Studio 有两种布局模式，由 `navbarPosition` 控制：

### 模式 1：左侧导航（navbarPosition = 'left'）
```
┌──────────────────────────────────────────┐
│ [Sidebar] │      [Page Content]          │
│  (图标栏) │  [Navbar] [Chat]             │
│  ·对话    │  (助手列表)(对话区)            │
│  ·翻译    │                              │
│  ·绘画    │                              │
│  ·知识库  │                              │
│  ·...     │                              │
│  ·设置    │                              │
│  ·用户    │                              │
└──────────────────────────────────────────┘
```

### 模式 2：顶部标签（navbarPosition = 'top'）
```
┌──────────────────────────────────────────┐
│ [Tab 1] [Tab 2] [Tab 3] ...    [+新标签] │
├──────────────────────────────────────────┤
│           [Page Content]                 │
│     [Navbar]  [Chat/Page]                │
└──────────────────────────────────────────┘
```

## 🛠 改造策略：分阶段、低风险

### Phase 0：品牌改名（1小时内，零风险）
**改这些文件就够了：**
- `package.json` — name, description, author
- `electron-builder.yml` — appId, productName
- `src/renderer/src/config/env.ts` — 应用名称、Logo
- `src/renderer/src/i18n/locales/zh-CN.json` — 翻译文本
- 图标文件（替换 `resources/` 下的 icon）

### Phase 1：精简功能（按页面删，安全可逆）
**保留的页面（核心功能）：**
- ✅ `/` — 聊天（核心）
- ✅ `/settings/*` — 设置
- ✅ `/knowledge` — 知识库
- ✅ `/store` — 助手商店

**可删除的页面（与 AIIRC 无关）：**
- ❌ `/paintings/*` — AI 绘画
- ❌ `/translate` — 翻译
- ❌ `/notes` — 笔记
- ❌ `/code` — 代码工具
- ❌ `/openclaw` — OpenClaw
- ❌ `/files` — 文件管理（如不需要）

**删除步骤（每个页面）：**
1. 从 `Router.tsx` 删除对应 `<Route>`
2. 从 `Sidebar.tsx` 删除对应菜单项
3. 页面文件夹暂时保留（可以之后清理）

### Phase 2：对接 AIIRC 后端
- 在设置里预配置 AIIRC AI Router（http://localhost:3022/v1）作为默认 Provider
- 修改 `src/renderer/src/config/provider.ts` 添加 AIIRC Provider

### Phase 3：添加 AIIRC 特色功能
- 在 Sidebar 里添加新菜单项（如"电脑监控"）
- 创建新页面 `pages/monitor/` 
- 接入 AIIRC 的 MCP Server / Task Service

### Phase 4：视觉风格调整
- 修改 `src/renderer/src/context/ThemeProvider.tsx` 中的颜色变量
- 替换品牌色为 AIIRC 的靛蓝紫 #6366F1
- 调整组件圆角、间距等细节

## ⚡ 快速开始命令

```bash
# 进入项目
cd d:\AIIRC\cherry-studio

# 开发模式启动
pnpm dev

# 构建
pnpm build

# 打包 Windows
pnpm build:win:x64
```

## 📌 核心改造入口文件

| 目标 | 文件 |
|------|------|
| 布局结构 | `src/renderer/src/Router.tsx` |
| 左侧导航栏 | `src/renderer/src/components/app/Sidebar.tsx` |
| 顶部标签栏 | `src/renderer/src/components/app/Navbar.tsx` |
| 聊天主页 | `src/renderer/src/pages/home/HomePage.tsx` |
| 设置页 | `src/renderer/src/pages/settings/SettingsPage.tsx` |
| 主题颜色 | `src/renderer/src/context/ThemeProvider.tsx` |
| 品牌配置 | `src/renderer/src/config/env.ts` |
| 应用图标 | `resources/icon.png` |
| 打包配置 | `electron-builder.yml` |
