import fs from 'node:fs';
import path from 'node:path';

/**
 * 读取单个会话文件
 */
export function readSessionFile(sessionPath) {
  try {
    const content = fs.readFileSync(sessionPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read session file: ${sessionPath}\n${error.message}`);
  }
}

/**
 * 写入会话文件
 */
export function writeSessionFile(sessionPath, data) {
  try {
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(sessionPath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write session file: ${sessionPath}\n${error.message}`);
  }
}

/**
 * 列出目录下的所有会话文件
 */
export function listSessionFiles(workspaceDir) {
  const sessions = [];

  if (!fs.existsSync(workspaceDir)) {
    return sessions;
  }

  try {
    const files = fs.readdirSync(workspaceDir).sort();

    for (const file of files) {
      if (!file.endsWith('.json') || file === '.sync_tracker.json') {
        continue;
      }

      const filePath = path.join(workspaceDir, file);
      try {
        const data = readSessionFile(filePath);
        sessions.push({
          ...data,
          filePath,
          fileName: file,
        });
      } catch {
        // Skip invalid session files
        continue;
      }
    }
  } catch (error) {
    throw new Error(`Failed to list sessions in ${workspaceDir}\n${error.message}`);
  }

  return sessions;
}

/**
 * 复制会话文件
 */
export function copySessionFile(sourcePath, destPath) {
  try {
    const content = fs.readFileSync(sourcePath, 'utf-8');
    fs.writeFileSync(destPath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to copy session file: ${sourcePath} -> ${destPath}\n${error.message}`);
  }
}

/**
 * 删除会话文件
 */
export function deleteSessionFile(sessionPath) {
  try {
    fs.unlinkSync(sessionPath);
  } catch (error) {
    throw new Error(`Failed to delete session file: ${sessionPath}\n${error.message}`);
  }
}

/**
 * 检查会话文件是否存在
 */
export function sessionFileExists(sessionPath) {
  return fs.existsSync(sessionPath);
}

/**
 * 获取会话文件的修改时间
 */
export function getSessionFileModTime(sessionPath) {
  try {
    const stats = fs.statSync(sessionPath);
    return stats.mtime.getTime();
  } catch {
    return null;
  }
}
