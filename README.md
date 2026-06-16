# session-sync

统一的会话同步工具，支持 **Codex Desktop** 和 **Claude Desktop**，跨 Windows 和 macOS 平台。

**一条命令解决会话丢失问题！** 🚀

---

## ⚡ 快速开始（3 个核心命令）

### Codex Desktop - 最小化命令（2 个）

```bash
# 1️⃣ 检查当前状态（诊断命令）
session-sync codex status

# 2️⃣ 同步会话（修复命令）
session-sync codex sync [--provider ID]

# 💡 新增：按工作目录过滤（可选）
session-sync codex status --workdir /path/to/project
session-sync codex sync --workdir /path/to/project
```

### Claude Desktop - 1 个命令

```bash
# 同步 Official 和 Claude-3p 会话
session-sync claude sync
# 💡 新增：自动按工作目录分组显示会话
```

---

## 🎯 工作原理

### Codex Provider Sync

**问题**: Codex 切换 AI provider（如从 OpenAI 切换到 Anthropic）后，旧会话突然不可见

**原因**: Codex 在多个位置存储了 provider 的 metadata：
- `~/.codex/sessions/` - rollout 文件中的 provider 标记
- `~/.codex/state_5.sqlite` - SQLite 数据库中的 provider 记录
- `.codex-global-state.json` - 项目路径缓存中的可见性标记

这些位置的 metadata 不一致时，会话就会隐藏。

**解决方案**:

#### `session-sync codex status` - 诊断工具
```bash
$ session-sync codex status
```

**作用**: 扫描上述所有位置，对比当前 provider 和 metadata 的一致性

**输出信息**:
- ✅ 当前激活的 provider（来自 `config.toml`）
- ✅ rollout 文件中的 provider 标记
- ✅ SQLite 数据库中的 provider 记录
- ✅ 项目缓存中的可见性状态
- ✅ 发现的不一致问题

**何时使用**: 
- 切换 provider 后，会话突然消失
- 想确认当前 Codex 的同步状态
- 诊断为什么某些会话不可见

---

#### `session-sync codex sync [--provider ID]` - 修复工具
```bash
$ session-sync codex sync
$ session-sync codex sync --provider openai
```

**作用**: 强制同步所有 metadata 位置，确保与当前 provider 一致

**执行步骤**:
1. 扫描 `~/.codex/sessions/` 下的所有会话文件
2. 读取每个会话的元数据（标题、创建时间等）
3. **自动备份**当前状态到 `~/.codex/backups_state/provider-sync/<timestamp>/`
4. 更新 rollout 文件中的 provider 标记
5. 同步 SQLite 数据库中的 provider 记录
6. 更新项目缓存中的可见性状态
7. 验证同步完成

**参数**:
- 不指定 `--provider` 时，同步到当前激活的 provider
- 指定 `--provider openai` 时，同步并切换到该 provider

**何时使用**:
- 刚切换 provider，需要让旧会话重新可见
- 想同步到某个特定 provider
- 从备份中恢复后，需要重新同步

**备份和恢复**:
```bash
# 如果同步出错，自动备份已保存，可以恢复
session-sync codex restore ~/.codex/backups_state/provider-sync/<timestamp>
```

---

### Claude Desktop Session Sync

**问题**: 
- 在 Claude Desktop Official（Windows Store 版本）中看不到 Claude-3p 的会话
- 或反过来，两个应用的会话不同步

**原因**: 
- Claude Desktop Official 和 Claude-3p (CC Switch) 是两个独立的应用
- 它们各自维护自己的会话目录：
  - Official: `%LOCALAPPDATA%\Packages\Claude_*\LocalCache\Roaming\Claude\claude-code-sessions\`
  - Claude-3p: `%LOCALAPPDATA%\Claude-3p\claude-code-sessions\`
- 两个目录的会话完全隔离

**解决方案**:

#### `session-sync claude sync` - 一键共享会话
```bash
$ session-sync claude sync
```

**作用**: 在两个应用间建立会话共享，使用 Windows Junction (Windows) 或 Symlink (macOS)

**执行步骤**:
1. 检测 Claude Desktop Official 的会话目录
2. 检测 Claude-3p 的会话目录
3. 列出两边的所有会话
4. **自动备份** Claude-3p 的所有会话到 Official 中
5. 删除 Claude-3p 的 workspace 目录
6. 创建 **Windows Junction 链接**（Windows）或 **Symlink 链接**（macOS）
   - 原理: Claude-3p 的会话目录变成一个指向 Official 目录的快捷方式
   - 结果: 两个应用共享同一份会话文件
7. 最终验证：显示现在能看到的会话总数

**工作原理图**:

```
执行前（隔离）:
┌─────────────────────────┐        ┌──────────────────────────┐
│ Claude Desktop Official │        │   Claude-3p (CC Switch)  │
│  sessions/ ─────────┐   │        │  sessions/ ─────────┐    │
│                     └─> │ 会话A  │                     └─>  │ 会话B
│                        │ 会话C  │                         │ 会话D
└─────────────────────────┘        └──────────────────────────┘

执行后（共享）:
┌─────────────────────────────────────────────────────────────┐
│ Claude Desktop Official                                     │
│  sessions/ ─────────────────────────────┐                   │
│    │                                     └─> 会话A, B, C, D │
│    │                                                        │
│    └─(Junction)──────────────────────────────────────────┐ │
│                                                           │ │
│                 Claude-3p (CC Switch)                     │ │
│                  sessions/ (Junction 快捷方式)────────────┘ │
└─────────────────────────────────────────────────────────────┘
结果: 两个应用看到相同的会话列表
```

**何时使用**:
- 安装了 Claude Desktop Official 和 Claude-3p
- 想在两个应用间共享会话
- 需要统一管理多个模型的会话

**平台差异**:
- **Windows**: 使用 Junction（目录快捷方式）
  - 用户可见，资源管理器中显示为特殊文件夹
  - 两个应用自动同步会话
- **macOS**: 使用 Symlink（符号链接）
  - 对用户透明，通过符号链接指向原目录
  - 两个应用自动同步会话

**完成后**:
- 重启两个 Claude 应用
- 两个应用的侧边栏会同时刷新
- 所有会话在两个应用中都可见

---

## 🆕 工作目录过滤（项目级别管理）

### Claude Desktop：按工作目录分组显示

`session-sync claude sync` 现在自动按工作目录分组列表会话：

```
3️⃣  列举现有会话（按工作目录分组）
ℹ Official 会话数: 5

    📁 /Users/you/projects/my-app
       • "API server refactor" (claude-3-sonnet)
       • "Database schema" (claude-3-opus)

    📁 /Users/you/projects/website
       • "React components" (claude-3-sonnet)

    📁 (无工作目录)
       • "Random notes" (claude-3-haiku)
       ... 及其他 1 个会话
```

**优势**：
- 清楚看到各个项目的会话分布
- 快速定位特定项目的会话
- 了解会话是否已关联工作目录

### Codex Desktop：按工作目录过滤

使用 `--workdir` 参数按项目过滤会话：

```bash
# 只检查 /Users/you/projects/my-app 的会话状态
session-sync codex status --workdir /Users/you/projects/my-app

# 只同步 /Users/you/projects/my-app 的会话
session-sync codex sync --workdir /Users/you/projects/my-app

# 同步特定项目并指定 provider
session-sync codex sync --provider openai --workdir /Users/you/projects/my-app
```

**优势**：
- 避免误操作：只修改特定项目的会话
- 降低风险：其他项目的会话保持不变
- 精准控制：按项目选择性同步

**默认行为**（不指定 `--workdir`）：
- 诊断和同步所有项目的会话
- 向后兼容，旧命令继续工作

---

## 完整命令列表

### Codex 命令（按使用频率）

| 命令 | 场景 | 说明 |
|------|------|------|
| `session-sync codex status` | ⭐ 诊断 | 检查会话可见性状态（全局） |
| `session-sync codex status --workdir PATH` | 📁 项目诊断 | 只诊断指定项目的会话 |
| `session-sync codex sync` | ⭐ 修复 | 同步会话到当前 provider（全局） |
| `session-sync codex sync --workdir PATH` | 📁 项目修复 | 只同步指定项目的会话 |
| `session-sync codex sync --provider openai` | 切换并同步 | 指定 provider（全局） |
| `session-sync codex sync --provider openai --workdir PATH` | 🎯 精准控制 | 指定 provider + 指定项目 |
| `session-sync codex switch openai` | 高级 | 修改 config.toml 并同步 |
| `session-sync codex restore <path>` | 恢复 | 从备份恢复 |
| `session-sync codex prune-backups --keep 5` | 清理 | 删除旧备份，保留最近 5 个 |

### Claude 命令

| 命令 | 场景 | 说明 |
|------|------|------|
| `session-sync claude sync` | ⭐ 一键共享 | 在两个应用间建立会话共享 |

---

## 安装

### npm 全局安装

```bash
npm install -g git+https://github.com/m148632014/session-sync.git
```

### 本地开发

```bash
git clone https://github.com/m148632014/session-sync.git
cd session-sync
npm install
node src/cli.js --help
```

## 架构

```
session-sync/
├── src/
│   ├── cli.js                    # 统一 CLI 入口
│   ├── commands/
│   │   ├── codex/                # Codex Provider Sync 逻辑
│   │   │   ├── cli.js
│   │   │   ├── service.js
│   │   │   ├── session-files.js
│   │   │   ├── sqlite-state.js
│   │   │   └── ...
│   │   ├── claude/               # Claude Desktop Sync 逻辑
│   │   │   ├── sync.js
│   │   │   └── index.js
│   │   └── shared/
│   ├── services/                 # 平台无关的服务层
│   │   ├── path-resolver.js      # 跨平台路径解析
│   │   ├── platform-util.js      # Windows/macOS 特定操作
│   │   ├── session-files.js      # 会话文件 I/O
│   │   └── backup-restore.js     # 备份/恢复
│   └── utils/
│       └── logger.js             # 日志输出
└── package.json
```

## 平台支持

| 功能 | Windows | macOS | Linux |
|------|---------|-------|-------|
| Codex Provider Sync | ✅ | ✅ | ✅ |
| Claude Desktop Sync | ✅ | ✅ | - |

## 安全说明

所有操作都会自动创建备份：

### Codex 备份
```
~/.codex/backups_state/provider-sync/<timestamp>/
```
包含: config.toml, state_5.sqlite, 会话文件

**恢复**: `session-sync codex restore ~/.codex/backups_state/provider-sync/<timestamp>`

### Claude 备份
执行 `claude sync` 前，自动备份 Claude-3p 会话到 Claude Desktop Official

**恢复**: 手动从 Official 的目录恢复（因为已合并到 Official）

---

## 常见场景

### 场景 1: Codex 切换 Provider 后看不到旧会话

```bash
# 1. 诊断问题
session-sync codex status
# 输出会显示不一致的地方

# 2. 修复会话
session-sync codex sync
# 自动同步所有 metadata，会话重新出现

# 3. 重启 Codex Desktop
# 侧边栏自动刷新
```

### 场景 2: 我用 Claude-3p (CC Switch)，想在 Official 中看到会话

```bash
# 1. 一键同步
session-sync claude sync
# 自动：
# - 备份 Claude-3p 会话到 Official
# - 创建 Junction/Symlink 链接
# - 两个应用共享会话

# 2. 重启两个 Claude 应用
# 现在两个应用都能看到所有会话
```

### 场景 3: 同步出错，需要恢复

```bash
# 1. 查看备份
ls ~/.codex/backups_state/provider-sync/

# 2. 恢复到某个时间点
session-sync codex restore ~/.codex/backups_state/provider-sync/2024-06-16T10-30-45-000Z

# 3. 重新运行 sync
session-sync codex sync
```

### 场景 4️⃣: 多项目工作，按项目管理会话

```bash
# 检查所有项目状态
$ session-sync codex status
# 显示所有项目的会话分布

# 发现项目 A 有同步问题，但项目 B 正常
# 只修复项目 A，避免影响项目 B
$ session-sync codex sync --workdir /Users/you/projects/project-a

# Claude Desktop 同步时，会看到按工作目录分组的会话
$ session-sync claude sync
# 输出：
#   📁 /Users/you/projects/project-a
#   📁 /Users/you/projects/project-b
```

### 场景 5️⃣: 不同项目使用不同 Provider

```bash
# 项目 A 使用 OpenAI
$ session-sync codex sync --provider openai --workdir /Users/you/projects/project-a

# 项目 B 使用 Anthropic
$ session-sync codex sync --provider anthropic --workdir /Users/you/projects/project-b

# 两个项目的会话分别使用各自的 provider，互不影响
```

---

## 性能和兼容性

### 为什么这么快？
- ✅ 无外部依赖（仅使用 Node.js 内置模块）
- ✅ 直接操作文件系统
- ✅ 高效的 SQLite 批量更新

### 支持的版本
- **Node.js**: 18.0.0+
- **npm**: 8.0.0+ 
- **Git**: 2.30+（仅用于 `git+https://` 安装）
- **Windows**: Windows 7+（需要 PowerShell）
- **macOS**: 10.13+（Sierra+）

### 不会破坏的东西
- ✅ 会话内容（消息历史、对话上下文）完全不变
- ✅ 已配置的 API Keys 和认证信息不动
- ✅ 只修改 provider metadata，不修改用户数据
- ✅ 所有操作都有备份

---

## 进阶用法

### Codex - 指定 Provider 同步

```bash
# 同步到 OpenAI（不修改 config.toml）
session-sync codex sync --provider openai

# 同步到 Anthropic（不修改 config.toml）
session-sync codex sync --provider anthropic
```

### Codex - 同时修改 config 和同步

```bash
# 修改 config.toml 的 provider，然后同步
session-sync codex switch openai
```

### Codex - 清理旧备份

```bash
# 只保留最近 3 个备份
session-sync codex prune-backups --keep 3

# 删除所有备份
session-sync codex prune-backups --keep 0
```

---

## 故障排除

### Codex 同步后会话还是不可见

1. 检查是否有文件锁定：
   ```bash
   session-sync codex status
   # 查看输出中是否有 "locked" 或 "permission denied"
   ```

2. 尝试关闭 Codex Desktop 重新运行：
   ```bash
   # 1. 关闭所有 Codex 进程
   # 2. 重新运行同步
   session-sync codex sync
   # 3. 重启 Codex Desktop
   ```

3. 检查磁盘空间是否足够：
   ```bash
   df ~/.codex/
   ```

### Claude 同步后会话未出现

1. 确认两个应用都关闭：
   ```bash
   # Windows: Ctrl+Shift+Esc 打开任务管理器，杀掉 Claude 进程
   # macOS: 强制退出 Claude
   ```

2. 重新运行同步：
   ```bash
   session-sync claude sync
   ```

3. 重启两个 Claude 应用

---

## 开发

```bash
# 本地开发
git clone https://github.com/m148632014/session-sync.git
cd session-sync
node src/cli.js --help

# 查看代码架构
cat DEVELOPMENT.md

# 贡献
1. Fork 项目
2. 创建功能分支
3. 提交 PR
```

## License

MIT
