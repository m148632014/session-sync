import fs from 'node:fs';
import path from 'node:path';
import logger from '../../utils/logger.js';
import {
  getClaudeCodeSessionsDir,
  getClaude3pSessionsDir,
  findWorkspacePath,
  isWindows,
} from '../../services/path-resolver.js';
import { createSessionLink, isWindowsJunction } from '../../services/platform-util.js';
import { listSessionFiles, copySessionFile } from '../../services/session-files.js';
import { createBackupDir, backupPath } from '../../services/backup-restore.js';

/**
 * 同步 Claude Desktop Official 和 Claude-3p 之间的会话
 * - 将 Claude-3p 会话备份到 Official
 * - 创建 Junction/Symlink 建立会话共享
 */
/**
 * 按工作目录分组会话
 */
function groupSessionsByWorkdir(sessions) {
  const groups = {};

  for (const session of sessions) {
    const workdir = session.workdir || session.cwd || '(无工作目录)';
    if (!groups[workdir]) {
      groups[workdir] = [];
    }
    groups[workdir].push(session);
  }

  // 按工作目录排序（无工作目录放在最后）
  return Object.entries(groups).sort((a, b) => {
    if (a[0] === '(无工作目录)') return 1;
    if (b[0] === '(无工作目录)') return -1;
    return a[0].localeCompare(b[0]);
  });
}

/**
 * 格式化会话列表，按工作目录分组显示
 */
function formatSessionsByWorkdir(sessions, maxPerGroup = 5) {
  const groups = groupSessionsByWorkdir(sessions);
  const lines = [];

  for (const [workdir, groupSessions] of groups) {
    lines.push(`\n    📁 ${workdir}`);

    const displayed = groupSessions.slice(0, maxPerGroup);
    for (const s of displayed) {
      const title = s.title || '(无标题)';
      const model = s.model || '';
      const truncTitle = title.length > 35 ? title.substring(0, 32) + '...' : title;
      lines.push(`       • "${truncTitle}" (${model})`);
    }

    if (groupSessions.length > maxPerGroup) {
      lines.push(`       ... 及其他 ${groupSessions.length - maxPerGroup} 个会话`);
    }
  }

  return lines.join('\n');
}

export async function syncClaudeDesktopSessions() {
  logger.title('Claude Desktop 会话同步');

  // 1. 检测两个应用的会话目录
  logger.section('1️⃣  检测会话目录');
  const officialRoot = getClaudeCodeSessionsDir();
  const claude3pRoot = getClaude3pSessionsDir();

  if (!officialRoot) {
    logger.error('未找到 Claude Desktop Official 会话目录');
    logger.info('请确认已安装 Windows Store 版 Claude Desktop 并至少使用过一次');
    throw new Error('Official Claude home not found');
  }

  if (!claude3pRoot) {
    logger.error('未找到 Claude-3p 会话目录');
    logger.info('请确认已安装 CC Switch 并至少使用过一次第三方供应商');
    throw new Error('Claude-3p home not found');
  }

  logger.success(`官方会话目录: ${officialRoot}`);
  logger.success(`3P 会话目录: ${claude3pRoot}`);

  // 2. 查找两侧的 workspace 路径
  logger.section('2️⃣  定位 Workspace 路径');
  const officialWs = findWorkspacePath(officialRoot);
  const claude3pWs = findWorkspacePath(claude3pRoot);

  if (!officialWs) {
    throw new Error('Official workspace not found');
  }

  if (!claude3pWs) {
    throw new Error('Claude-3p workspace not found');
  }

  logger.success(`Official Workspace: ${officialWs}`);
  logger.success(`Claude-3p Workspace: ${claude3pWs}`);

  // 3. 列出两侧现有会话（按工作目录分组）
  logger.section('3️⃣  列举现有会话（按工作目录分组）');
  const officialSessions = listSessionFiles(officialWs);
  const claude3pSessions = listSessionFiles(claude3pWs);

  logger.info(`Official 会话数: ${officialSessions.length}`);
  if (officialSessions.length > 0) {
    console.log(formatSessionsByWorkdir(officialSessions));
  } else {
    logger.info('  (空)');
  }

  logger.info(`Claude-3p 会话数: ${claude3pSessions.length}`);
  if (claude3pSessions.length > 0) {
    console.log(formatSessionsByWorkdir(claude3pSessions));
  } else {
    logger.info('  (空)');
  }

  // 4. 检查是否已经是 junction
  logger.section('4️⃣  检查 Junction/Symlink 状态');
  const isJunction = await isWindowsJunction(claude3pWs);

  if (isJunction) {
    logger.warn('已存在 Junction 链接，无需重复操作');
    return { status: 'already_synced' };
  }

  // 5. 备份 Claude-3p 会话到 Official
  logger.section('5️⃣  备份 Claude-3p 会话');
  let copied = 0;

  for (const session of claude3pSessions) {
    const sessionId = session.sessionId || '';
    const targetFile = path.join(officialWs, `${sessionId}.json`);

    if (fs.existsSync(targetFile)) {
      logger.debug(`会话已存在，跳过: ${session.title || sessionId}`);
      continue;
    }

    const srcFile = path.join(claude3pWs, `${sessionId}.json`);
    if (fs.existsSync(srcFile)) {
      try {
        copySessionFile(srcFile, targetFile);
        logger.success(`复制会话: "${session.title || sessionId}"`);
        copied++;
      } catch (error) {
        logger.error(`复制失败: ${session.title || sessionId}`);
        logger.debug(error.message);
      }
    }
  }

  logger.info(`共复制 ${copied} 个新会话到 Official`);

  // 6. 备份确认
  logger.section('6️⃣  备份验证');
  const officialAfter = listSessionFiles(officialWs);
  logger.success(`Official 现在有 ${officialAfter.length} 个会话`);

  // 7. 删除 Claude-3p workspace 目录
  logger.section('7️⃣  删除 Claude-3p Workspace 目录');
  try {
    fs.rmSync(claude3pWs, { recursive: true, force: true });
    logger.success(`已删除: ${claude3pWs}`);
  } catch (error) {
    logger.error(`删除失败: ${error.message}`);
    throw error;
  }

  // 8. 创建 Junction/Symlink
  logger.section('8️⃣  创建会话链接');
  try {
    await createSessionLink(claude3pWs, officialWs);
    logger.success('Junction/Symlink 创建成功');
  } catch (error) {
    logger.error(`链接创建失败: ${error.message}`);
    throw error;
  }

  // 9. 最终验证
  logger.section('9️⃣  最终验证');
  const finalSessions = listSessionFiles(claude3pWs);
  logger.success(`通过链接可见会话数: ${finalSessions.length}`);

  logger.title('✅ 会话同步配置完成！');
  logger.info('请重启 Claude Desktop 刷新侧边栏');

  return {
    status: 'success',
    official: {
      path: officialWs,
      sessions: officialAfter.length,
    },
    claude3p: {
      path: claude3pWs,
      sessions: finalSessions.length,
    },
    copied,
  };
}

export const command = 'sync';
export const description = '同步 Claude Desktop Official 和 Claude-3p 会话';
