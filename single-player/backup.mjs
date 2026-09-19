// Backups copy the save's whole folder (game.db, autosaves, SOLO/, ...).
import { cpSync, existsSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";

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

export function restoreBackup(savePath, backupRoot, name, date = new Date()) {
  if (basename(name) !== name || !listBackups(backupRoot).includes(name)) throw new Error(`No backup called "${name}"`);
  const safetyBackup = backupSaveFolder(savePath, backupRoot, date);
  cpSync(join(backupRoot, name), dirname(savePath), { recursive: true, force: true });
  return { restored: name, safetyBackup };
}
