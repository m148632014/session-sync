# session-sync

统一的会话同步工具，支持 **Codex Desktop** 和 **Claude Desktop**，跨 Windows 和 macOS 平台。

## 功能

### Codex Provider Sync
- ✅ 切换 provider 后让历史会话重新可见
- ✅ 自动同步 rollout 文件、SQLite 数据库、项目缓存
- ✅ 支持备份/恢复
- ✅ 自动清理过期备份

### Claude Desktop Session Sync
- ✅ 在 Claude Desktop Official 和 Claude-3p 之间建立会话共享
- ✅ 自动备份 Claude-3p 会话到 Official
- ✅ 使用 Windows Junction 或 macOS Symlink 实现会话链接
- ✅ 支持 Windows 和 macOS 两个平台

## 安装

### npm 全局安装

```bash
npm install -g session-sync
```

### 本地开发

```bash
git clone <repo-url>
cd session-sync
npm install
node src/cli.js --help
```

## 使用

### Codex 命令

```bash
# 检查当前状态
session-sync codex status

# 同步会话到当前 provider
session-sync codex sync

# 切换 provider 并同步
session-sync codex switch openai
session-sync codex switch anthropic

# 恢复备份
session-sync codex restore ~/.codex/backups_state/provider-sync/<timestamp>

# 清理过期备份（保留最近 5 个）
session-sync codex prune-backups --keep 5
```

### Claude Desktop 命令

```bash
# 同步 Official 和 Claude-3p 会话
session-sync claude sync
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
- Codex: `~/.codex/backups_state/provider-sync/<timestamp>/`
- Claude: `~/.claude/backups/session-sync-<timestamp>/`

## 开发

```bash
npm test
npm run lint
```

## License

MIT
