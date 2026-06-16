import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { isWindows, isMacOS, isLinux } from './path-resolver.js';

/**
 * 创建 Junction (Windows) 或 Symlink (Mac/Linux)
 */
export async function createSessionLink(from, to) {
  if (isWindows()) {
    return createWindowsJunction(from, to);
  } else if (isMacOS() || isLinux()) {
    return createUnixSymlink(from, to);
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}

/**
 * 使用 PowerShell 创建 Windows Junction
 */
function createWindowsJunction(from, to) {
  return new Promise((resolve, reject) => {
    const cmd = `New-Item -ItemType Junction -Path '${from}' -Target '${to}' -Force`;
    const ps = spawn('powershell', ['-Command', cmd], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });

    let stdout = '';
    let stderr = '';

    ps.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ps.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ps.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, from, to });
      } else {
        reject(new Error(`Failed to create junction: ${stderr || stdout}`));
      }
    });

    ps.on('error', reject);
  });
}

/**
 * 创建 Unix Symlink (macOS/Linux)
 */
function createUnixSymlink(from, to) {
  return new Promise((resolve, reject) => {
    try {
      fs.symlinkSync(to, from, 'dir');
      resolve({ success: true, from, to });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 检查路径是否为 Junction/Symlink
 */
export function isSymlink(targetPath) {
  try {
    const stats = fs.lstatSync(targetPath);
    return stats.isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * 检查路径是否为 Windows Junction
 */
export async function isWindowsJunction(targetPath) {
  if (!isWindows()) {
    return false;
  }

  try {
    const cmd = `(Get-Item '${targetPath}').LinkType`;
    const result = execSync(`powershell -Command "${cmd}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return result.trim() === 'Junction';
  } catch {
    return false;
  }
}

/**
 * 删除 Junction/Symlink
 */
export function removeLink(targetPath) {
  try {
    const stats = fs.lstatSync(targetPath);
    if (stats.isSymbolicLink() || stats.isDirectory()) {
      if (isWindows()) {
        execSync(`rmdir /s /q "${targetPath}"`, { stdio: 'ignore' });
      } else {
        fs.rmSync(targetPath, { force: true, recursive: true });
      }
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * 改变文件权限 (macOS/Linux)
 */
export async function chmod(targetPath, mode) {
  if (isWindows()) {
    return false;
  }

  return new Promise((resolve, reject) => {
    fs.chmod(targetPath, mode, (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}

/**
 * 执行系统命令
 */
export function runCommand(cmd, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const ps = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isWindows(),
      ...options,
    });

    let stdout = '';
    let stderr = '';

    if (ps.stdout) {
      ps.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (ps.stderr) {
      ps.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    ps.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`Command failed: ${stderr || stdout}`));
      }
    });

    ps.on('error', reject);
  });
}
