import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { makeSaveFixture } from "./helpers.mjs";
import { backupName, backupSaveFolder, listBackups, restoreBackup } from "../../single-player/backup.mjs";

const T1 = new Date("2026-09-19T20:00:00.000Z");
const T2 = new Date("2026-09-19T20:05:00.000Z");

test("backup names are timestamps that sort in time order", () => {
  assert.equal(backupName(T1), "2026-09-19T20-00-00-000Z");
});

test("backupSaveFolder copies the whole save folder", (t) => {
  const f = makeSaveFixture();
  t.after(f.cleanup);
  const b = backupSaveFolder(f.savePath, f.backupRoot, T1);
  assert.equal(b.name, "2026-09-19T20-00-00-000Z");
  assert.deepEqual(readFileSync(join(b.path, "game.db")), readFileSync(f.savePath));
  assert.equal(readFileSync(join(b.path, "autosave", "0.bak"), "utf8"), "autosave-bytes");
});

test("backupSaveFolder never overwrites an existing backup", (t) => {
  const f = makeSaveFixture();
  t.after(f.cleanup);
  backupSaveFolder(f.savePath, f.backupRoot, T1);
  assert.throws(() => backupSaveFolder(f.savePath, f.backupRoot, T1), /already exists/);
});

test("listBackups is empty before any backup, then sorted", (t) => {
  const f = makeSaveFixture();
  t.after(f.cleanup);
  assert.deepEqual(listBackups(f.backupRoot), []);
  backupSaveFolder(f.savePath, f.backupRoot, T2);
  backupSaveFolder(f.savePath, f.backupRoot, T1);
  assert.deepEqual(listBackups(f.backupRoot), ["2026-09-19T20-00-00-000Z", "2026-09-19T20-05-00-000Z"]);
});

test("listBackups ignores a leftover .partial directory from a failed backup", (t) => {
  const f = makeSaveFixture();
  t.after(f.cleanup);
  backupSaveFolder(f.savePath, f.backupRoot, T1);
  mkdirSync(join(f.backupRoot, `${backupName(T2)}.partial`), { recursive: true });
  assert.deepEqual(listBackups(f.backupRoot), [backupName(T1)]);
});

test("backupSaveFolder removes a leftover .partial directory before copying into it again", (t) => {
  const f = makeSaveFixture();
  t.after(f.cleanup);
  const partialPath = join(f.backupRoot, `${backupName(T1)}.partial`);
  mkdirSync(partialPath, { recursive: true });
  writeFileSync(join(partialPath, "stale.txt"), "leftover from a crashed backup");
  const b = backupSaveFolder(f.savePath, f.backupRoot, T1);
  assert.equal(existsSync(partialPath), false);
  assert.equal(existsSync(join(b.path, "stale.txt")), false);
  assert.deepEqual(readFileSync(join(b.path, "game.db")), readFileSync(f.savePath));
});

test("restoreBackup puts the old bytes back and keeps a safety backup", (t) => {
  const f = makeSaveFixture();
  t.after(f.cleanup);
  const original = readFileSync(f.savePath);
  const b = backupSaveFolder(f.savePath, f.backupRoot, T1);
  writeFileSync(f.savePath, "changed");
  const r = restoreBackup(f.savePath, f.backupRoot, b.name, T2);
  assert.deepEqual(readFileSync(f.savePath), original);
  assert.equal(r.restored, b.name);
  assert.equal(readFileSync(join(r.safetyBackup.path, "game.db"), "utf8"), "changed");
  assert.deepEqual(r.leftInPlace, []);
});

test("restore reports files that were added after the backup in leftInPlace", (t) => {
  const f = makeSaveFixture();
  t.after(f.cleanup);
  const b = backupSaveFolder(f.savePath, f.backupRoot, T1);
  const autosaveDir = join(dirname(f.savePath), "autosave");
  mkdirSync(autosaveDir, { recursive: true });
  writeFileSync(join(autosaveDir, "9.bak"), "new-autosave");
  const r = restoreBackup(f.savePath, f.backupRoot, b.name, T2);
  assert.deepEqual(r.leftInPlace, ["autosave/9.bak"]);
  assert.equal(existsSync(join(autosaveDir, "9.bak")), true);
});

test("after restore, game.db is restored atomically and tmp file is cleaned up", (t) => {
  const f = makeSaveFixture();
  t.after(f.cleanup);
  const original = readFileSync(f.savePath);
  const b = backupSaveFolder(f.savePath, f.backupRoot, T1);
  writeFileSync(f.savePath, "changed");
  restoreBackup(f.savePath, f.backupRoot, b.name, T2);
  assert.deepEqual(readFileSync(f.savePath), original);
  assert.equal(existsSync(`${f.savePath}.tmp`), false);
  assert.deepEqual(readFileSync(join(b.path, "game.db")), original);
});

test("restoreBackup rejects unknown names and path tricks", (t) => {
  const f = makeSaveFixture();
  t.after(f.cleanup);
  assert.throws(() => restoreBackup(f.savePath, f.backupRoot, "nope"), /No backup called/);
  assert.throws(() => restoreBackup(f.savePath, f.backupRoot, "../save"), /No backup called/);
});

test("restoreBackup validates the backup's game.db before touching the live folder", (t) => {
  const f = makeSaveFixture();
  t.after(f.cleanup);
  const b = backupSaveFolder(f.savePath, f.backupRoot, T1);
  writeFileSync(join(b.path, "game.db"), "not a real save");
  const original = readFileSync(f.savePath);
  assert.throws(
    () => restoreBackup(f.savePath, f.backupRoot, b.name, T2),
    new RegExp(`Backup "${b.name}" has no valid game\\.db; nothing was restored`)
  );
  assert.deepEqual(readFileSync(f.savePath), original);
  assert.deepEqual(listBackups(f.backupRoot), [b.name]);
});

test("restoreBackup rejects a backup missing game.db entirely, without touching the live folder", (t) => {
  const f = makeSaveFixture();
  t.after(f.cleanup);
  const b = backupSaveFolder(f.savePath, f.backupRoot, T1);
  rmSync(join(b.path, "game.db"));
  const original = readFileSync(f.savePath);
  assert.throws(() => restoreBackup(f.savePath, f.backupRoot, b.name, T2), /has no valid game\.db; nothing was restored/);
  assert.deepEqual(readFileSync(f.savePath), original);
  assert.deepEqual(listBackups(f.backupRoot), [b.name]);
});
