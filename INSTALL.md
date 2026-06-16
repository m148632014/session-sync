# 安装指南

## 安装方式

### 方式 1️⃣: 从 GitHub 直接安装（推荐）

这是最简单的方式，适合所有用户：

```bash
npm install -g git+https://github.com/m148632014/session-sync.git
```

**优点**:
- ✅ 无需克隆仓库
- ✅ 自动获取最新版本
- ✅ 只需一条命令
- ✅ 支持所有平台

**要求**:
- 需要 Node.js 18+
- 需要 npm
- 需要 Git（npm 会自动调用）

### 方式 2️⃣: 克隆后本地安装

适合开发者或需要修改代码的场景：

```bash
git clone https://github.com/m148632014/session-sync.git
cd session-sync
npm install              # 本地安装依赖（可选，本项目无依赖）
npm install -g .        # 全局安装
```

### 方式 3️⃣: 仅本地使用（开发模式）

```bash
git clone https://github.com/m148632014/session-sync.git
cd session-sync
node src/cli.js --help  # 直接运行
```

## 验证安装

安装完成后，验证是否成功：

```bash
session-sync --version
# 输出: session-sync v1.0.0

session-sync --help
# 显示帮助信息
```

## 常见问题

### Q: 提示 "git not found"

**A**: 需要安装 Git。查看 Git 是否安装：

```bash
git --version
```

如果没有，从 https://git-scm.com 下载安装。

### Q: 提示 "npm not found"

**A**: 需要安装 Node.js（包含 npm）。从 https://nodejs.org 下载 LTS 版本。

### Q: 提示 "Node version too old"

**A**: 需要 Node.js 18 或更新版本。升级 Node.js：

```bash
node --version  # 查看当前版本
# 如果 < 18.0.0，请升级
```

### Q: 在 macOS/Linux 上需要 sudo 吗？

**A**: 如果用 npm 全局安装时出错，可以：

1. **推荐**: 使用 nvm 管理 Node.js，避免权限问题
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   npm install -g git+https://github.com/m148632014/session-sync.git
   ```

2. **或者**: 使用 sudo（不推荐）
   ```bash
   sudo npm install -g git+https://github.com/m148632014/session-sync.git
   ```

### Q: 如何更新到最新版本？

**A**: 如果用 GitHub 方式安装，只需重新运行安装命令：

```bash
npm install -g git+https://github.com/m148632014/session-sync.git
```

npm 会自动更新到最新版本。

### Q: 如何卸载？

**A**: 卸载很简单：

```bash
npm uninstall -g session-sync
```

## 安装位置

### Windows
```
%APPDATA%\npm\session-sync
```

### macOS/Linux
```
/usr/local/bin/session-sync
```

或使用 nvm：
```
~/.nvm/versions/node/v18.x.x/bin/session-sync
```

## 快速测试

安装完成后，可以立即测试：

```bash
# 查看帮助
session-sync --help

# 查看版本
session-sync --version

# 测试 Codex 命令
session-sync codex status

# 测试 Claude 命令
session-sync claude sync
```

## 系统要求

| 要求 | 版本 |
|------|------|
| Node.js | 18.0.0 或更新 |
| npm | 8.0.0 或更新（通常随 Node.js 安装） |
| Git | 2.30 或更新（用于 `git+https://` 安装方式） |
| OS | Windows、macOS、Linux |

## 依赖

session-sync 没有外部 npm 依赖，只使用 Node.js 内置模块：
- `node:fs` - 文件系统
- `node:path` - 路径操作
- `node:os` - 操作系统信息
- `node:child_process` - 进程执行

这意味着：
- ✅ 安装很快
- ✅ 磁盘占用小
- ✅ 无需解决依赖冲突
- ✅ 兼容性最好

## 故障排除

### 安装卡住或超时

如果安装时间过长或超时，可以尝试：

1. **更换 npm 源**：
   ```bash
   npm config set registry https://registry.npmmirror.com
   npm install -g git+https://github.com/m148632014/session-sync.git
   ```

2. **增加超时时间**：
   ```bash
   npm install -g git+https://github.com/m148632014/session-sync.git --fetch-timeout=120000
   ```

### 权限被拒绝

在 Linux/macOS 上，如果遇到权限错误：

```bash
# 检查 npm 全局目录权限
npm config get prefix

# 修复权限
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# 添加到 ~/.bashrc 或 ~/.zshrc
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## 获取帮助

安装有问题？

1. 检查 [README.md](README.md) 的故障排除部分
2. 检查 [GitHub Issues](https://github.com/m148632014/session-sync/issues)
3. 查看 [DEVELOPMENT.md](DEVELOPMENT.md) 的开发指南

---

**就绪了吗？** 现在可以运行：

```bash
session-sync claude sync
session-sync codex status
```

祝你使用愉快！
