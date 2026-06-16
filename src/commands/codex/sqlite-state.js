import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { DB_FILE_BASENAME } from "./constants.js";

const DEFAULT_BUSY_TIMEOUT_MS = 5000;

function uniquePaths(paths) {
  return [...new Set(paths)];
}

export function stateDbPath(codexHome) {
  const candidates = stateDbPaths(codexHome, { existingOnly: false });
  return candidates.find((candidate) => fsSync.existsSync(candidate)) ?? candidates[0];
}

export function stateDbPaths(codexHome, options = {}) {
  const { existingOnly = true } = options;
  const candidates = uniquePaths([
    path.join(codexHome, "sqlite", DB_FILE_BASENAME),
    path.join(codexHome, DB_FILE_BASENAME)
  ]);
  return existingOnly
    ? candidates.filter((candidate) => fsSync.existsSync(candidate))
    : candidates;
}

function openDatabase(dbPath) {
  return new DatabaseSync(dbPath);
}

function tableHasColumn(db, tableName, columnName) {
  return db
    .prepare(`PRAGMA table_info(${JSON.stringify(tableName)})`)
    .all()
    .some((column) => column.name === columnName);
}

function normalizeBusyTimeoutMs(busyTimeoutMs) {
  return Number.isInteger(busyTimeoutMs) && busyTimeoutMs >= 0
    ? busyTimeoutMs
    : DEFAULT_BUSY_TIMEOUT_MS;
}

function setBusyTimeout(db, busyTimeoutMs) {
  db.exec(`PRAGMA busy_timeout = ${normalizeBusyTimeoutMs(busyTimeoutMs)}`);
}

function isSqliteBusyError(error) {
  const message = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return message.includes("database is locked") || message.includes("sqlite_busy") || message.includes("busy");
}

function isSqliteMalformedError(error) {
  const message = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return message.includes("database disk image is malformed")
    || message.includes("sqlite_corrupt")
    || message.includes("malformed")
    || message.includes("not a database");
}

export function wrapSqliteBusyError(error, action) {
  if (!isSqliteBusyError(error)) {
    return error;
  }
  return new Error(
    `Unable to ${action} because state_5.sqlite is currently in use. Close Codex and the Codex app, then retry. Original error: ${error.message}`
  );
}

export function wrapSqliteMalformedError(error, action) {
  if (!isSqliteMalformedError(error)) {
    return error;
  }
  return new Error(
    `Unable to ${action} because state_5.sqlite is malformed or unreadable. Close Codex, back up or repair the database, then retry. Original error: ${error.message}`
  );
}

export async function readSqliteProviderCounts(codexHome) {
  const dbPath = stateDbPath(codexHome);
  try {
    await fs.access(dbPath);
  } catch {
    return null;
  }

  let db;
  try {
    db = openDatabase(dbPath);
    const rows = db.prepare(`
      SELECT
        CASE
          WHEN model_provider IS NULL OR model_provider = '' THEN '(missing)'
          ELSE model_provider
        END AS model_provider,
        archived,
        COUNT(*) AS count
      FROM threads
      GROUP BY model_provider, archived
      ORDER BY archived, model_provider
    `).all();
    const result = {
      sessions: {},
      archived_sessions: {}
    };
    for (const row of rows) {
      const bucket = row.archived ? result.archived_sessions : result.sessions;
      bucket[row.model_provider] = row.count;
    }
    return result;
  } catch (error) {
    if (isSqliteMalformedError(error)) {
      return {
        sessions: {},
        archived_sessions: {},
        unreadable: true,
        error: "state_5.sqlite is malformed or unreadable"
      };
    }
    if (isSqliteBusyError(error)) {
      return {
        sessions: {},
        archived_sessions: {},
        unreadable: true,
        error: "state_5.sqlite is currently in use"
      };
    }
    throw error;
  } finally {
    db?.close();
  }
}

export async function readSqliteRepairStats(codexHome, options = {}) {
  const dbPath = stateDbPath(codexHome);
  try {
    await fs.access(dbPath);
  } catch {
    return null;
  }

  let db;
  try {
    db = openDatabase(dbPath);
    let userEventRowsNeedingRepair = 0;
    if (tableHasColumn(db, "threads", "has_user_event") && options.userEventThreadIds?.size) {
      const stmt = db.prepare("SELECT has_user_event FROM threads WHERE id = ?");
      for (const threadId of options.userEventThreadIds) {
        const row = stmt.get(threadId);
        if (row && Number(row.has_user_event) !== 1) {
          userEventRowsNeedingRepair += 1;
        }
      }
    }

    let cwdRowsNeedingRepair = 0;
    if (tableHasColumn(db, "threads", "cwd") && options.threadCwdById?.size) {
      const stmt = db.prepare("SELECT cwd FROM threads WHERE id = ?");
      for (const [threadId, cwd] of options.threadCwdById) {
        if (typeof threadId !== "string" || !threadId || typeof cwd !== "string" || !cwd.trim()) {
          continue;
        }
        const row = stmt.get(threadId);
        if (row && row.cwd !== cwd) {
          cwdRowsNeedingRepair += 1;
        }
      }
    }

    return {
      userEventRowsNeedingRepair,
      cwdRowsNeedingRepair
    };
  } catch (error) {
    throw wrapSqliteMalformedError(
      wrapSqliteBusyError(error, "read SQLite repair diagnostics"),
      "read SQLite repair diagnostics"
    );
  } finally {
    db?.close();
  }
}

export async function assertSqliteWritable(codexHome, options = {}) {
  const dbPaths = stateDbPaths(codexHome);
  if (dbPaths.length === 0) {
    return { databasePresent: false };
  }

  for (const dbPath of dbPaths) {
    let db;
    try {
      db = openDatabase(dbPath);
      setBusyTimeout(db, options.busyTimeoutMs);
      db.exec("BEGIN IMMEDIATE");
      db.exec("ROLLBACK");
    } catch (error) {
      throw wrapSqliteMalformedError(
        wrapSqliteBusyError(error, `update session provider metadata in ${dbPath}`),
        "update session provider metadata"
      );
    } finally {
      db?.close();
    }
  }

  return { databasePresent: true, databasePaths: dbPaths };
}

export async function updateSqliteProvider(codexHome, targetProvider, afterUpdateOrOptions, maybeOptions) {
  const afterUpdate = typeof afterUpdateOrOptions === "function" ? afterUpdateOrOptions : null;
  const options = typeof afterUpdateOrOptions === "function"
    ? (maybeOptions ?? {})
    : (afterUpdateOrOptions ?? {});

  const dbPaths = stateDbPaths(codexHome);
  if (dbPaths.length === 0) {
    if (afterUpdate) {
      await afterUpdate({
        updatedRows: 0,
        providerRowsUpdated: 0,
        userEventRowsUpdated: 0,
        cwdRowsUpdated: 0,
        databasePresent: false
      });
    }
    return {
      updatedRows: 0,
      providerRowsUpdated: 0,
      userEventRowsUpdated: 0,
      cwdRowsUpdated: 0,
      databasePresent: false
    };
  }

  const totals = {
    updatedRows: 0,
    providerRowsUpdated: 0,
    userEventRowsUpdated: 0,
    cwdRowsUpdated: 0,
    databasePresent: true,
    databasePaths: dbPaths
  };
  let afterUpdateCalled = false;

  for (const dbPath of dbPaths) {
    let db;
    let transactionOpen = false;
    try {
      db = openDatabase(dbPath);
      setBusyTimeout(db, options.busyTimeoutMs);
      db.exec("BEGIN IMMEDIATE");
      transactionOpen = true;
      const stmt = db.prepare(`
        UPDATE threads
        SET model_provider = ?
        WHERE COALESCE(model_provider, '') <> ?
      `);
      const result = stmt.run(targetProvider, targetProvider);
      let userEventUpdatedRows = 0;
      if (tableHasColumn(db, "threads", "has_user_event") && options.userEventThreadIds?.size) {
        const userEventStmt = db.prepare(`
          UPDATE threads
          SET has_user_event = 1
          WHERE id = ? AND COALESCE(has_user_event, 0) <> 1
        `);
        for (const threadId of options.userEventThreadIds) {
          userEventUpdatedRows += userEventStmt.run(threadId).changes ?? 0;
        }
      }
      let cwdUpdatedRows = 0;
      if (tableHasColumn(db, "threads", "cwd") && options.threadCwdById?.size) {
        const cwdStmt = db.prepare(`
          UPDATE threads
          SET cwd = ?
          WHERE id = ? AND COALESCE(cwd, '') <> ?
        `);
        for (const [threadId, cwd] of options.threadCwdById) {
          if (typeof threadId !== "string" || !threadId || typeof cwd !== "string" || !cwd.trim()) {
            continue;
          }
          cwdUpdatedRows += cwdStmt.run(cwd, threadId, cwd).changes ?? 0;
        }
      }

      const providerRowsUpdated = result.changes ?? 0;
      const updatedRows = providerRowsUpdated + userEventUpdatedRows + cwdUpdatedRows;
      totals.updatedRows += updatedRows;
      totals.providerRowsUpdated += providerRowsUpdated;
      totals.userEventRowsUpdated += userEventUpdatedRows;
      totals.cwdRowsUpdated += cwdUpdatedRows;

      if (afterUpdate && !afterUpdateCalled) {
        afterUpdateCalled = true;
        await afterUpdate({
          updatedRows,
          providerRowsUpdated,
          userEventRowsUpdated: userEventUpdatedRows,
          cwdRowsUpdated: cwdUpdatedRows,
          databasePresent: true,
          databasePath: dbPath,
          databasePaths: dbPaths
        });
      }

      db.exec("COMMIT");
      transactionOpen = false;
    } catch (error) {
      if (transactionOpen) {
        try {
          db.exec("ROLLBACK");
        } catch {
          // Ignore rollback failures and surface the original error.
        }
      }
      throw wrapSqliteMalformedError(
        wrapSqliteBusyError(error, `update session provider metadata in ${dbPath}`),
        "update session provider metadata"
      );
    } finally {
      db?.close();
    }
  }

  return totals;
}
export async function readSqliteSessionTitles(codexHome) {
  const dbPaths = stateDbPaths(codexHome);
  if (dbPaths.length === 0) return null;
  const dbPath = dbPaths[0];
  try {
    await fs.access(dbPath);
  } catch {
    return null;
  }
  let db;
  try {
    db = new DatabaseSync(dbPath, { readOnly: true });
    const rows = db.prepare(`
      SELECT id, title, model_provider, cwd, archived, source, thread_source, updated_at_ms
      FROM threads
      WHERE COALESCE(title, '') <> ''
      ORDER BY updated_at_ms DESC
    `).all();
    return rows;
  } catch {
    return null;
  } finally {
    db?.close();
  }
}
