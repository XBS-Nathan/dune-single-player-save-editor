import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gameRunning, makeSaveFixture, noGame } from "./helpers.mjs";
import { editSave, isGameRunning, readSave } from "../../single-player/session.mjs";
import { player } from "../../single-player/items.mjs";
import { getSolari, setSolari } from "../../single-player/currency.mjs";

const now = () => new Date("2026-09-19T21:00:00.000Z");

test("isGameRunning looks for DuneSandbox processes", () => {
  assert.equal(isGameRunning(noGame), false);
  assert.equal(isGameRunning(gameRunning), true);
  assert.equal(isGameRunning(() => ["dunesandbox.exe"]), true);
});

test("readSave reads without changing the file", (t) => {
  const f = makeSaveFixture();
  t.after(f.cleanup);
  const before = readFileSync(f.savePath);
  assert.equal(readSave(f.savePath, (db) => player(db).name), "Test Char");
  assert.deepEqual(readFileSync(f.savePath), before);
});

test("editSave backs up, then writes the change", (t) => {
  const f = makeSaveFixture({ solari: 1000 });
  t.after(f.cleanup);
  const original = readFileSync(f.savePath);
  const r = editSave(f.savePath, (db) => setSolari(db, 42), { listProcesses: noGame, backupRoot: f.backupRoot, now });
  assert.deepEqual(r.result, { before: 1000, after: 42 });
  assert.equal(r.dryRun, false);
  assert.equal(r.backup.name, "2026-09-19T21-00-00-000Z");
  assert.deepEqual(readFileSync(join(r.backup.path, "game.db")), original);
  assert.equal(readSave(f.savePath, getSolari), 42);
  assert.equal(existsSync(`${f.savePath}.tmp`), false);
});

test("editSave refuses while the game runs, unless forced", (t) => {
  const f = makeSaveFixture({ solari: 1000 });
  t.after(f.cleanup);
  const original = readFileSync(f.savePath);
  assert.throws(
    () => editSave(f.savePath, (db) => setSolari(db, 1), { listProcesses: gameRunning, backupRoot: f.backupRoot, now }),
    /Close the game/
  );
  assert.deepEqual(readFileSync(f.savePath), original);
  assert.equal(existsSync(f.backupRoot), false);
  editSave(f.savePath, (db) => setSolari(db, 1), { force: true, listProcesses: gameRunning, backupRoot: f.backupRoot, now });
  assert.equal(readSave(f.savePath, getSolari), 1);
});

test("dry run changes nothing and makes no backup", (t) => {
  const f = makeSaveFixture({ solari: 1000 });
  t.after(f.cleanup);
  const original = readFileSync(f.savePath);
  const r = editSave(f.savePath, (db) => setSolari(db, 7), { dryRun: true, listProcesses: noGame, backupRoot: f.backupRoot, now });
  assert.deepEqual(r, { result: { before: 1000, after: 7 }, dryRun: true, backup: null });
  assert.deepEqual(readFileSync(f.savePath), original);
  assert.equal(existsSync(f.backupRoot), false);
});

test("a failing edit leaves the save and backups untouched", (t) => {
  const f = makeSaveFixture({ solari: 1000 });
  t.after(f.cleanup);
  const original = readFileSync(f.savePath);
  assert.throws(() => editSave(f.savePath, (db) => { setSolari(db, 5); throw new Error("boom"); },
    { listProcesses: noGame, backupRoot: f.backupRoot, now }), /boom/);
  assert.deepEqual(readFileSync(f.savePath), original);
  assert.equal(existsSync(f.backupRoot), false);
});

test("editSave refuses to write if the save changed on disk while editing", (t) => {
  const f = makeSaveFixture({ solari: 1000 });
  t.after(f.cleanup);
  assert.throws(() => editSave(f.savePath, (db) => {
    setSolari(db, 5);
    writeFileSync(f.savePath, "changed-by-the-game"); // simulate the game rewriting the save mid-edit
  }, { listProcesses: noGame, backupRoot: f.backupRoot, now }),
    /The save changed on disk while editing \(is the game running\?\); nothing was written/);
  assert.equal(readFileSync(f.savePath, "utf8"), "changed-by-the-game");
  assert.equal(existsSync(f.backupRoot), false);
});
