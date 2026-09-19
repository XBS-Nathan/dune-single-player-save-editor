// Opens the single-player save for reading or for one transactional edit.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { backupSaveFolder } from "./backup.mjs";
import { pack, unpack } from "./savefile.mjs";

export function listWindowsProcesses() {
  let output;
  try {
    output = execFileSync("tasklist.exe", ["/FO", "CSV", "/NH"], { encoding: "utf8" });
  } catch {
    throw new Error("Could not check whether the game is running (tasklist.exe failed). Make sure it is closed and rerun with --force.");
  }
  return output.split(/\r?\n/).map((line) => line.match(/^"([^"]*)"/)?.[1]).filter(Boolean);
}

export function isGameRunning(listProcesses = listWindowsProcesses) {
  return listProcesses().some((name) => /^DuneSandbox/i.test(name));
}

export function assertGameClosed({ force = false, listProcesses } = {}) {
  if (force) return;
  if (isGameRunning(listProcesses)) {
    throw new Error("Dune: Awakening is running and rewrites the save every 20 seconds. Close the game first, or pass --force.");
  }
}

function withUnpackedCopy(savePath, fn) {
  const dir = mkdtempSync(join(tmpdir(), "single-player-save-"));
  try {
    const dbPath = join(dir, "game.sqlite");
    writeFileSync(dbPath, unpack(readFileSync(savePath)));
    return fn(dbPath);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function readSave(savePath, fn) {
  return withUnpackedCopy(savePath, (dbPath) => {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    try { return fn(db); } finally { db.close(); }
  });
}

export function editSave(savePath, fn, { force = false, dryRun = false, listProcesses, backupRoot, now = () => new Date() } = {}) {
  if (!backupRoot) throw new Error("editSave needs a backupRoot");
  assertGameClosed({ force, listProcesses });
  return withUnpackedCopy(savePath, (dbPath) => {
    const db = new DatabaseSync(dbPath);
    let result;
    try {
      db.exec("BEGIN");
      try {
        result = fn(db);
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      if (dryRun) {
        db.exec("ROLLBACK");
        return { result, dryRun: true, backup: null };
      }
      db.exec("COMMIT");
      const check = Object.values(db.prepare("pragma integrity_check").get())[0];
      if (check !== "ok") throw new Error(`The edited save failed SQLite's integrity check: ${check}`);
    } finally {
      db.close();
    }
    const backup = backupSaveFolder(savePath, backupRoot, now());
    const tmpPath = `${savePath}.tmp`;
    writeFileSync(tmpPath, pack(readFileSync(dbPath)));
    renameSync(tmpPath, savePath);
    return { result, dryRun: false, backup };
  });
}
