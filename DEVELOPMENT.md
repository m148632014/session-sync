# 开发指南

## 项目概览

`session-sync` 是一个统一的会话同步工具，支持多个桌面应用的会话管理：

1. **Codex Desktop** - provider 切换后的会话可见性同步
2. **Claude Desktop** - Official 和 Claude-3p 之间的会话共享

## 架构设计

### 分层结构

```
CLI 层 (src/cli.js)
    ↓
命令层 (src/commands/)
    ├── codex/     ← 现有的 Codex 逻辑
    └── claude/    ← 新增的 Claude 逻辑
    ↓
服务层 (src/services/)
    ├── path-resolver.js      ← 跨平台路径解析
    ├── platform-util.js      ← 平台特定操作（Junction/Symlink）
    ├── session-files.js      ← 会话文件 I/O
    └── backup-restore.js     ← 备份和恢复逻辑
    ↓
操作系统 API
    ├── Windows: PowerShell, API, Junction
    ├── macOS: AppleScript, bash, symlink
    └── Linux: bash, symlink
```

### 关键设计原则

1. **平台抽象** - `platform-util.js` 隐藏 Windows/macOS 差异
2. **服务隔离** - 每个服务单一职责
3. **配置驱动** - 通过环境变量和参数配置
4. **错误恢复** - 自动备份确保可恢复

## 添加新命令

### 1. 添加新工具

例如添加 "Desktop" 工具支持多个应用的统一管理：

```bash
mkdir -p src/commands/desktop
```

### 2. 实现命令逻辑

创建 `src/commands/desktop/sync.js`：

```javascript
import logger from '../../utils/logger.js';
import { getCodexHome, getClaudeHome } from '../../services/path-resolver.js';

export async function syncDesktopSessions() {
  logger.title('Desktop 会话统一同步');
  
  const codexHome = getCodexHome();
  const claudeHome = getClaudeHome();
  
  logger.info(`Codex: ${codexHome}`);
  logger.info(`Claude: ${claudeHome}`);
  
  // 实现具体逻辑
}

export const command = 'sync';
export const description = '同步所有桌面应用的会话';
```

### 3. 在 CLI 中注册

编辑 `src/cli.js`：

```javascript
if (tool === 'desktop') {
  const { syncDesktopSessions } = await import('./commands/desktop/sync.js');
  
  if (command === 'sync') {
    const result = await syncDesktopSessions();
    // 处理结果
  }
}
```

## 服务层 API 参考

### path-resolver.js

```javascript
// 检测操作系统
isMacOS()              // boolean
isWindows()            // boolean
isLinux()              // boolean

// Claude 路径
getClaudeOfficalHome() // Windows Store 版本
getClaudeMacOSHome()   // macOS 版本
getClaudeCodeSessionsDir()
getClaude3pHome()
getClaude3pSessionsDir()

// Codex 路径
getCodexHome()
findWorkspacePath(sessionsRoot)

// 通用工具
expandPath(pathStr)    // 展开 ~
```

### platform-util.js

```javascript
// 链接操作
createSessionLink(from, to)    // 创建 Junction/Symlink
isSymlink(targetPath)          // 检查是否为符号链接
isWindowsJunction(targetPath)  // 检查是否为 Windows Junction
removeLink(targetPath)         // 删除链接

// 文件权限
chmod(targetPath, mode)        // 修改权限（Mac/Linux）

// 命令执行
runCommand(cmd, args, options) // 执行系统命令
```

### session-files.js

```javascript
// 会话 I/O
readSessionFile(sessionPath)       // 读取单个会话
writeSessionFile(sessionPath, data)// 写入会话
listSessionFiles(workspaceDir)     // 列出所有会话
copySessionFile(src, dest)         // 复制会话
deleteSessionFile(sessionPath)     // 删除会话
sessionFileExists(sessionPath)     // 检查存在性
getSessionFileModTime(sessionPath) // 获取修改时间
```

### backup-restore.js

```javascript
// 备份管理
createBackupDir(baseDir, prefix)   // 创建备份目录
backupPath(sourcePath, destDir)    // 备份文件/目录
restorePath(sourcePath, destDir)   // 恢复文件/目录
listBackups(baseDir)               // 列出备份
deleteBackup(backupPath)           // 删除备份
getDirSize(dirPath)                // 计算目录大小
pruneBackups(baseDir, keepCount)   // 清理过期备份
```

## 日志 API

```javascript
import logger from './utils/logger.js';

logger.info(message)      // ℹ 信息
logger.success(message)   // ✓ 成功
logger.warn(message)      // ⚠ 警告
logger.error(message)     // ✕ 错误
logger.debug(message)     // [DEBUG] 调试（需要 DEBUG=1）
logger.title(message)     // 标题
logger.section(message)   // 分节
logger.list(items)        // 列表
```

## 跨平台开发注意事项

### Windows 特定

- 使用 PowerShell 执行 Junction 创建
- 使用 `%LOCALAPPDATA%` 查找应用数据
- 路径使用反斜杠（Node.js 会自动处理）
- 命令行工具需要正确的编码处理

### macOS 特定

- 使用 `~/Library/Application Support` 查找应用数据
- 支持符号链接（symlink）
- 可能需要权限提示
- 区分大小写的文件系统

### 通用最佳实践

1. **使用 `path` 模块** 处理所有路径
2. **使用 `fs.promises`** 而不是回调
3. **正确处理路径分隔符** - Node.js 会自动转换
4. **检查 `process.platform`** 而不是用户代理

## 测试

### 单元测试

```bash
npm test
```

### 手动测试

```bash
# 列出帮助
node src/cli.js --help

# 测试 Claude sync（在 Desktop 上）
node src/cli.js claude sync

# 测试 Codex 命令
node src/cli.js codex status
```

## 发布流程

### 本地安装

```bash
npm install -g .
session-sync --help
```

### 卸载

```bash
npm uninstall -g session-sync
```

## 常见问题

### Q: 如何调试平台特定问题？

A: 设置环境变量启用调试：

```bash
DEBUG=1 node src/cli.js claude sync
```

### Q: 如何添加对新应用的支持？

A: 遵循以下步骤：

1. 在 `src/commands/` 中创建新目录
2. 在 `path-resolver.js` 中添加路径检测函数
3. 实现命令逻辑
4. 在 `src/cli.js` 中添加路由

### Q: 备份存储在哪里？

A: 每个工具有自己的备份位置：

- Codex: `~/.codex/backups_state/provider-sync/`
- Claude: `~/.claude/backups/session-sync-*` (待实现)

## 性能优化

### 大量会话处理

- 使用流式处理而不是一次性加载所有文件
- 实现进度报告机制
- 考虑并发限制（SQLite 并发写入）

### 跨平台优化

- Windows: 使用 PowerShell Core 而不是 cmd.exe
- macOS: 缓存 `launchctl getenv` 结果
- Linux: 预检查依赖项（sqlite3 CLI 工具）

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

## 许可证

MIT
