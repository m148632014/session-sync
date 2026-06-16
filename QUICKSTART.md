# 快速开始

## 安装

### 全局安装

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

## 常用命令

### Claude Desktop 会话同步（新功能！）

在 Claude Desktop Official 和 Claude-3p 之间建立会话共享：

```bash
# 同步会话
session-sync claude sync

# 这会：
# 1. 检测两个应用的会话目录
# 2. 列出现有会话
# 3. 备份 Claude-3p 会话到 Official
# 4. 删除 Claude-3p workspace 目录
# 5. 创建 Windows Junction 或 macOS Symlink
# 6. 验证同步完成
```

**完成后，请重启两个 Claude 应用刷新侧边栏。**

### Codex Provider 切换

在不同的 AI provider 之间切换时保持会话可见：

```bash
# 查看当前状态
session-sync codex status

# 切换到 OpenAI
session-sync codex switch openai

# 同步到当前 provider
session-sync codex sync

# 恢复备份（如果出错）
session-sync codex restore ~/.codex/backups_state/provider-sync/<timestamp>
```

## 工作流示例

### 场景 1: 使用 Claude-3p，想在 Official 中看到会话

```bash
# 1. 同步会话
session-sync claude sync

# 2. 重启 Claude Desktop (Windows Store 版)
# 3. 现在可以看到来自 Claude-3p 的所有会话
# 4. 两个应用会自动共享会话（通过 Junction/Symlink）
```

### 场景 2: Codex 切换了 provider，看不到旧会话

```bash
# 1. 检查当前状态
session-sync codex status

# 2. 切换回原来的 provider（如果已切换）
# 或同步到新 provider
session-sync codex sync --provider openai

# 3. 等待同步完成
# 4. 重启 Codex Desktop
```

### 场景 3: 同步失败，需要恢复

```bash
# 1. 列出可用备份
ls ~/.codex/backups_state/provider-sync/

# 2. 恢复备份
session-sync codex restore ~/.codex/backups_state/provider-sync/2024-01-15T10-30-45-000Z

# 3. 验证恢复成功
session-sync codex status
```

## 平台特定说明

### Windows

- 需要 PowerShell（通常已安装）
- Claude Desktop 使用 Windows Store 版本
- Junction 链接在资源管理器中显示为文件夹

### macOS

- 使用 Symlink（符号链接）而不是 Junction
- Claude Desktop 通常在 `~/Library/Application Support/Claude`
- 需要确保有足够的权限

## 故障排除

### 问题：找不到应用目录

**Claude Desktop:**
- Windows: 确认已安装 Windows Store 版本，不是网页版
- macOS: 检查 `~/Library/Application Support/Claude` 是否存在

**Claude-3p:**
- 检查 `%LOCALAPPDATA%/Claude-3p` (Windows) 是否存在
- 确认至少使用过一次第三方 provider

**Codex:**
- 检查 `~/.codex` 目录是否存在
- 确认 Codex Desktop 至少运行过一次

### 问题：同步失败

```bash
# 启用调试模式查看详细信息
DEBUG=1 session-sync claude sync

# 检查权限
ls -la ~/.claude/
ls -la ~/.codex/

# 重试（通常会成功）
session-sync claude sync
```

### 问题：会话没有出现

**对于 Claude Desktop:**
- 同步后需要重启应用
- 检查侧边栏是否刷新了
- 尝试重启电脑

**对于 Codex:**
- 关闭 Codex Desktop，清除缓存后重启
- 运行 `session-sync codex prune-backups` 清理备份空间

## 环境变量

### DEBUG

启用调试输出：

```bash
DEBUG=1 session-sync claude sync
```

### CODEX_HOME

指定 Codex 主目录（如果不是 `~/.codex`）：

```bash
CODEX_HOME=/custom/path session-sync codex status
```

## 卸载

### 从全局移除

```bash
npm uninstall -g session-sync
```

### 在本地项目中

```bash
npm uninstall session-sync
```

## 获取帮助

```bash
# 显示所有命令
session-sync --help

# 显示版本
session-sync --version

# 查看开发文档
cat DEVELOPMENT.md
```

## 下一步

- 阅读 [DEVELOPMENT.md](DEVELOPMENT.md) 了解架构详情
- 查看 [README.md](README.md) 了解完整功能列表
- 为项目贡献新功能！
