import fs from 'node:fs';
import path from 'node:path';

/**
 * 创建备份目录
 */
export function createBackupDir(baseDir, prefix = 'session-sync') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(baseDir, `${prefix}-${timestamp}`);

  try {
    fs.mkdirSync(backupDir, { recursive: true });
    return backupDir;
  } catch (error) {
    throw new Error(`Failed to create backup directory: ${backupDir}\n${error.message}`);
  }
}

/**
 * 备份文件或目录
 */
export function backupPath(sourcePath, destDir) {
  try {
    const fileName = path.basename(sourcePath);
    const destPath = path.join(destDir, fileName);

    if (fs.existsSync(sourcePath)) {
      const stats = fs.statSync(sourcePath);

      if (stats.isDirectory()) {
        copyDir(sourcePath, destPath);
      } else if (stats.isFile()) {
        fs.copyFileSync(sourcePath, destPath);
      }

      return destPath;
    }
  } catch (error) {
    throw new Error(`Failed to backup: ${sourcePath} -> ${destDir}\n${error.message}`);
  }

  return null;
}

/**
 * 递归复制目录
 */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * 恢复文件或目录
 */
export function restorePath(sourcePath, destDir) {
  try {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source path does not exist: ${sourcePath}`);
    }

    const stats = fs.statSync(sourcePath);

    if (stats.isDirectory()) {
      copyDir(sourcePath, destDir);
    } else if (stats.isFile()) {
      fs.mkdirSync(path.dirname(destDir), { recursive: true });
      fs.copyFileSync(sourcePath, destDir);
    }

    return destDir;
  } catch (error) {
    throw new Error(`Failed to restore: ${sourcePath} -> ${destDir}\n${error.message}`);
  }
}

/**
 * 列出备份目录
 */
export function listBackups(baseDir) {
  const backups = [];

  if (!fs.existsSync(baseDir)) {
    return backups;
  }

  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        backups.push({
          name: entry.name,
          path: path.join(baseDir, entry.name),
          timestamp: entry.name,
        });
      }
    }

    return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (error) {
    throw new Error(`Failed to list backups: ${baseDir}\n${error.message}`);
  }
}

/**
 * 删除备份
 */
export function deleteBackup(backupPath) {
  try {
    if (fs.existsSync(backupPath)) {
      fs.rmSync(backupPath, { recursive: true, force: true });
      return true;
    }
  } catch (error) {
    throw new Error(`Failed to delete backup: ${backupPath}\n${error.message}`);
  }

  return false;
}

/**
 * 计算目录大小
 */
export function getDirSize(dirPath) {
  let size = 0;

  if (!fs.existsSync(dirPath)) {
    return size;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      size += getDirSize(fullPath);
    } else if (entry.isFile()) {
      const stats = fs.statSync(fullPath);
      size += stats.size;
    }
  }

  return size;
}

/**
 * 清理过期备份，只保留最近 N 个
 */
export function pruneBackups(baseDir, keepCount) {
  try {
    const backups = listBackups(baseDir);

    if (backups.length <= keepCount) {
      return { deleted: 0, remaining: backups.length, freedBytes: 0 };
    }

    let freedBytes = 0;
    const toDelete = backups.slice(keepCount);

    for (const backup of toDelete) {
      const size = getDirSize(backup.path);
      deleteBackup(backup.path);
      freedBytes += size;
    }

    return {
      deleted: toDelete.length,
      remaining: keepCount,
      freedBytes,
    };
  } catch (error) {
    throw new Error(`Failed to prune backups: ${baseDir}\n${error.message}`);
  }
}
