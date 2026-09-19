// Backups copy the save's whole folder (game.db, autosaves, SOLO/, ...).
import { cpSync, existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";

export function backupName(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function backupSaveFolder(savePath, backupRoot, date = new Date()) {
  const name = backupName(date);
  const path = join(backupRoot, name);
  if (existsSync(path)) throw new Error(`Backup ${name} already exists`);
  cpSync(dirname(savePath), path, { recursive: true, errorOnExist: true, force: false });
  return { name, path };
}

export function listBackups(backupRoot) {
  if (!existsSync(backupRoot)) return [];
  return readdirSync(backupRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

// Helper: find files in liveDir that don't exist in backupDir
function computeLeftInPlace(liveDir, backupDir) {
  const leftInPlace = [];

  function walk(relDir) {
    const livePath = join(liveDir, relDir);
    const backupPath = join(backupDir, relDir);

    if (!existsSync(livePath)) return;

    const entries = readdirSync(livePath, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = relDir ? join(relDir, entry.name) : entry.name;
      const backupEntryPath = join(backupDir, relPath);

      if (entry.isDirectory()) {
        walk(relPath);
      } else if (!existsSync(backupEntryPath)) {
        leftInPlace.push(relPath.split(sep).join("/"));
      }
    }
  }

  walk("");
  return leftInPlace.sort();
}

export function restoreBackup(savePath, backupRoot, name, date = new Date()) {
  if (basename(name) !== name || !listBackups(backupRoot).includes(name)) throw new Error(`No backup called "${name}"`);

  const liveDir = dirname(savePath);
  const backupPath = join(backupRoot, name);

  // Compute leftInPlace BEFORE taking the safety backup
  const leftInPlace = computeLeftInPlace(liveDir, backupPath);

  // Take safety backup of current state
  const safetyBackup = backupSaveFolder(savePath, backupRoot, date);

  // Copy all entries EXCEPT game.db
  const entries = readdirSync(backupPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "game.db") continue;
    cpSync(join(backupPath, entry.name), join(liveDir, entry.name), { recursive: true, force: true });
  }

  // Restore game.db atomically via temp file + rename
  const tmpPath = `${savePath}.tmp`;
  writeFileSync(tmpPath, readFileSync(join(backupPath, "game.db")));
  renameSync(tmpPath, savePath);

  return { restored: name, safetyBackup, leftInPlace };
}
