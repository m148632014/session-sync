#!/usr/bin/env node

import logger from './utils/logger.js';
import { syncClaudeDesktopSessions } from './commands/claude/index.js';

function printHelp() {
  console.log(`
session-sync - 统一会话同步工具

用法:
  session-sync <tool> <command> [options]

工具 (tool):
  codex          - Codex Desktop 会话同步
  claude         - Claude Desktop 会话同步

命令 (command):

  Codex 工具:
    codex status [--codex-home PATH] [--workdir PATH]
    codex sync [--provider ID] [--codex-home PATH] [--workdir PATH]
    codex switch <provider-id> [--codex-home PATH] [--workdir PATH]
    codex restore <backup-dir> [--codex-home PATH]
    codex prune-backups [--keep N] [--codex-home PATH]

  Claude 工具:
    claude sync              - 同步 Official 和 Claude-3p 会话

全局命令:
  --help, -h               - 显示此帮助信息
  --version, -v            - 显示版本号

常用选项:
  --codex-home PATH        - 指定 Codex 主目录（默认 ~/.codex）
  --workdir PATH           - 只处理指定工作目录的会话（Codex only）
  --provider ID            - 指定 provider（codex sync/switch）
  --keep N                 - 保留最近 N 个备份（codex prune-backups）

示例:
  session-sync codex status
  session-sync codex status --workdir /Users/you/my-project
  session-sync codex sync
  session-sync codex sync --workdir /Users/you/my-project
  session-sync codex sync --provider openai --workdir /Users/you/my-project
  session-sync claude sync
`);
}

function parseArgs(argv) {
  const positionals = [];
  const flags = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--') && !value.startsWith('-')) {
      positionals.push(value);
      continue;
    }

    if (value === '-h' || value === '--help') {
      flags.help = true;
      continue;
    }

    if (value === '-v' || value === '--version') {
      flags.version = true;
      continue;
    }

    const [flagName, inlineValue] = value.split('=', 2);
    const normalizedName = flagName.slice(flagName.startsWith('--') ? 2 : 1);

    if (inlineValue !== undefined) {
      flags[normalizedName] = inlineValue;
      continue;
    }

    const nextValue = argv[index + 1];
    if (nextValue && !nextValue.startsWith('-')) {
      flags[normalizedName] = nextValue;
      index += 1;
    } else {
      flags[normalizedName] = true;
    }
  }

  return { positionals, flags };
}

async function main() {
  const { positionals, flags } = parseArgs(process.argv.slice(2));

  if (flags.help || (!positionals[0] && !flags.version)) {
    printHelp();
    return;
  }

  if (flags.version) {
    const pkg = JSON.parse(
      await import('node:fs').then((m) =>
        m.promises.readFile(
          new URL('../package.json', import.meta.url),
          'utf-8'
        )
      )
    );
    console.log(`session-sync v${pkg.version}`);
    return;
  }

  const tool = positionals[0];
  const command = positionals[1];

  if (tool === 'claude') {
    if (command === 'sync') {
      try {
        const result = await syncClaudeDesktopSessions();
        if (result.status === 'already_synced') {
          process.exit(0);
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
      return;
    }

    logger.error(`Unknown Claude command: ${command}`);
    printHelp();
    process.exitCode = 1;
    return;
  }

  if (tool === 'codex') {
    // 动态加载 Codex 的 service 模块
    try {
      const { getStatus, renderStatus, runSync, runSwitch, runRestore, runPruneBackups } = await import('./commands/codex/service.js');

      if (command === 'status') {
        const status = await getStatus({
          codexHome: flags['codex-home'],
          workdir: flags.workdir  // 按工作目录过滤
        });
        console.log(renderStatus(status));
        return;
      }

      if (command === 'sync') {
        const result = await runSync({
          codexHome: flags['codex-home'],
          provider: flags.provider,
          workdir: flags.workdir,  // 按工作目录过滤
          keepCount: parseInt(flags.keep || '5', 10),
          onProgress: (event) => {
            if (event?.message) {
              console.log(event.message);
            }
          },
        });
        console.log(`\n✓ Codex 会话已同步`);
        console.log(`  Provider: ${result.targetProvider}`);
        console.log(`  更新的会话: ${result.changedSessionFiles}`);
        return;
      }

      if (command === 'switch') {
        const provider = positionals[2] || flags.provider;
        const result = await runSwitch({
          codexHome: flags['codex-home'],
          provider,
          keepCount: parseInt(flags.keep || '5', 10),
          onProgress: (event) => {
            if (event?.message) {
              console.log(event.message);
            }
          },
        });
        console.log(`\n✓ Codex Provider 已切换到 ${result.targetProvider}`);
        return;
      }

      if (command === 'restore') {
        const backupDir = positionals[2] || flags.backup;
        const result = await runRestore({
          codexHome: flags['codex-home'],
          backupDir,
          restoreConfig: !flags['no-config'],
          restoreDatabase: !flags['no-db'],
          restoreSessions: !flags['no-sessions'],
        });
        console.log(`\n✓ 备份已恢复: ${backupDir}`);
        console.log(`  Provider: ${result.targetProvider}`);
        return;
      }

      if (command === 'prune-backups') {
        const result = await runPruneBackups({
          codexHome: flags['codex-home'],
          keepCount: parseInt(flags.keep || '5', 10),
        });
        console.log(`\n✓ 备份已清理`);
        console.log(`  删除: ${result.deletedCount}`);
        console.log(`  保留: ${result.remainingCount}`);
        return;
      }

      logger.error(`Unknown Codex command: ${command}`);
      printHelp();
      process.exitCode = 1;
    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
    return;
  }

  logger.error(`Unknown tool: ${tool}`);
  printHelp();
  process.exitCode = 1;
}

main().catch((error) => {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
