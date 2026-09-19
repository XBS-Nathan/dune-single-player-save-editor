// Backups copy the save's whole folder (game.db, autosaves, SOLO/, ...).
import { cpSync, existsSync, readFileSync, readdirSync, renameSync, rmSync } from "node:fs";
import { basename, dirname, join, sep } from "node:path";
import { writeFileAtomic } from "./atomic.mjs";
import { unpack } from "./savefile.mjs";

export function backupName(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function backupSaveFolder(savePath, backupRoot, date = new Date()) {
  const name = backupName(date);
  const path = join(backupRoot, name);
  if (existsSync(path)) throw new Error(`Backup ${name} already exists`);
  // Copy into a .partial dir and rename it into place once the copy is complete, so a backup that
  // is interrupted partway through never looks like a finished one; remove any leftover from a
  // previous failed attempt first.
  const partialPath = `${path}.partial`;
  rmSync(partialPath, { recursive: true, force: true });
  cpSync(dirname(savePath), partialPath, { recursive: true, errorOnExist: true, force: false });
  renameSync(partialPath, path);
  return { name, path };
}

export function listBackups(backupRoot) {
  if (!existsSync(backupRoot)) return [];
  return readdirSync(backupRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.endsWith(".partial"))
    .map((entry) => entry.name)
    .sort();
}

// Helper: find files in liveDir that don't exist in backupDir
function computeLeftInPlace(liveDir, backupDir) {
  const leftInPlace = [];

  function walk(relDir) {
    const livePath = join(liveDir, relDir);

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

  // Validate the backup's game.db BEFORE touching the live folder, so a bad backup changes nothing.
  try {
    unpack(readFileSync(join(backupPath, "game.db")));
  } catch {
    throw new Error(`Backup "${name}" has no valid game.db; nothing was restored`);
  }

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

  writeFileAtomic(savePath, readFileSync(join(backupPath, "game.db")));

  return { restored: name, safetyBackup, leftInPlace };
}
