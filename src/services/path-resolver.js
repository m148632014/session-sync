import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getOS() {
  return process.platform;
}

export function isMacOS() {
  return process.platform === 'darwin';
}

export function isWindows() {
  return process.platform === 'win32';
}

export function isLinux() {
  return process.platform === 'linux';
}

/**
 * 获取 Claude Desktop 会话目录 (Official Windows Store 版本)
 */
export function getClaudeOfficalHome() {
  if (!isWindows()) {
    return null;
  }

  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    return null;
  }

  const packagesDir = path.join(localAppData, 'Packages');
  try {
    const entries = fs.readdirSync(packagesDir);
    for (const entry of entries) {
      if (!entry.startsWith('Claude_')) {
        continue;
      }

      const candidate = path.join(
        packagesDir,
        entry,
        'LocalCache',
        'Roaming',
        'Claude'
      );

      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * 获取 Claude Desktop 会话目录 (macOS)
 */
export function getClaudeMacOSHome() {
  if (!isMacOS()) {
    return null;
  }

  const candidate = path.join(
    os.homedir(),
    'Library',
    'Application Support',
    'Claude'
  );

  return fs.existsSync(candidate) ? candidate : null;
}

/**
 * 获取 Claude-3p (CC Switch) 会话目录
 */
export function getClaude3pHome() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    return null;
  }

  const candidate = path.join(localAppData, 'Claude-3p');
  return fs.existsSync(candidate) ? candidate : null;
}

/**
 * 获取 Claude Desktop 的 claude-code-sessions 目录
 */
export function getClaudeCodeSessionsDir() {
  let claudeHome;

  if (isWindows()) {
    claudeHome = getClaudeOfficalHome();
  } else if (isMacOS()) {
    claudeHome = getClaudeMacOSHome();
  }

  if (!claudeHome) {
    return null;
  }

  const sessionsDir = path.join(claudeHome, 'claude-code-sessions');
  return fs.existsSync(sessionsDir) ? sessionsDir : null;
}

/**
 * 获取 Claude-3p 的 claude-code-sessions 目录
 */
export function getClaude3pSessionsDir() {
  const home = getClaude3pHome();
  if (!home) {
    return null;
  }

  const sessionsDir = path.join(home, 'claude-code-sessions');
  return fs.existsSync(sessionsDir) ? sessionsDir : null;
}

/**
 * 获取 Codex 主目录
 */
export function getCodexHome() {
  const envPath = process.env.CODEX_HOME;
  if (envPath) {
    return envPath;
  }

  const homeDir = os.homedir();
  const candidate = path.join(homeDir, '.codex');

  return fs.existsSync(candidate) ? candidate : null;
}

/**
 * 查找 workspace 路径 (accountUuid/workspaceId)
 */
export function findWorkspacePath(sessionsRoot) {
  if (!sessionsRoot || !fs.existsSync(sessionsRoot)) {
    return null;
  }

  try {
    const accounts = fs
      .readdirSync(sessionsRoot)
      .filter(
        (f) =>
          fs.statSync(path.join(sessionsRoot, f)).isDirectory()
      );

    if (accounts.length === 0) {
      return null;
    }

    const accountPath = path.join(sessionsRoot, accounts[0]);
    const workspaces = fs
      .readdirSync(accountPath)
      .filter(
        (f) =>
          fs.statSync(path.join(accountPath, f)).isDirectory()
      );

    if (workspaces.length === 0) {
      return null;
    }

    return path.join(accountPath, workspaces[0]);
  } catch {
    return null;
  }
}

/**
 * 展开路径中的 ~ 符号
 */
export function expandPath(pathStr) {
  if (!pathStr) {
    return pathStr;
  }

  if (pathStr.startsWith('~')) {
    return path.join(os.homedir(), pathStr.slice(1));
  }

  return pathStr;
}
