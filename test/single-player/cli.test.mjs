import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gameRunning, makeSaveFixture, noGame } from "./helpers.mjs";
import { main, parseArgs } from "../../single-player/cli.mjs";
import { readSave } from "../../single-player/session.mjs";
import { getSolari } from "../../single-player/currency.mjs";
import { listItems } from "../../single-player/items.mjs";

let tick = 0;
const now = () => new Date(Date.UTC(2026, 8, 19, 22, 0, 0, tick++));

async function run(f, argv, deps = {}) {
  const lines = [];
  const errors = [];
  const code = await main(argv, {
    out: (l) => lines.push(l), err: (l) => errors.push(l),
    listProcesses: noGame, backupRoot: f?.backupRoot, now, ...deps
  });
  return { code, out: lines.join("\n"), err: errors.join("\n") };
}

function fixture(t, options) {
  const f = makeSaveFixture(options);
  t.after(f.cleanup);
  return f;
}

test("parseArgs separates flags from the command", () => {
  const { opts, command, args } = parseArgs(["--save", "x.db", "solari", "add", "-500", "--dry-run"]);
  assert.equal(opts.save, "x.db");
  assert.equal(opts.dryRun, true);
  assert.equal(command, "solari");
  assert.deepEqual(args, ["add", "-500"]);
  assert.throws(() => parseArgs(["--bogus"]), /Unknown option/);
  assert.throws(() => parseArgs(["--stack", "lots"]), /--stack must be a whole number/);
});

test("no command prints usage and fails", async () => {
  const r = await run(null, []);
  assert.equal(r.code, 1);
  assert.match(r.out, /Usage/);
});

test("find works without a save", async () => {
  const r = await run(null, ["find", "copper"]);
  assert.equal(r.code, 0);
  assert.match(r.out, /AzuriteOre\s+Copper Ore/);
});

test("other commands need --save", async () => {
  const r = await run(null, ["info"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /--save/);
});

test("info shows the character, Solari and backpack use", async (t) => {
  const f = fixture(t, { solari: 39431, slots: 35, items: [{ id: 10, position: 0, templateId: "Stone", stackSize: 5 }] });
  const r = await run(f, ["--save", f.savePath, "info"]);
  assert.equal(r.code, 0);
  assert.match(r.out, /Character: Test Char/);
  assert.match(r.out, /Solari credit: 39431/);
  assert.match(r.out, /Backpack: 1\/35 slots used/);
});

test("items lists rows with display names", async (t) => {
  const f = fixture(t, { items: [{ id: 10, position: 0, templateId: "AzuriteOre", stackSize: 5 }] });
  const r = await run(f, ["--save", f.savePath, "items"]);
  assert.equal(r.code, 0);
  assert.match(r.out, /10 .*x5 .*AzuriteOre \(Copper Ore\)/);
});

test("give adds items by name and reports the backup", async (t) => {
  const f = fixture(t, { slots: 5 });
  const r = await run(f, ["--save", f.savePath, "give", "Copper Ore", "700"]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /Added 700 Copper Ore \(AzuriteOre\) in 2 stack\(s\)/);
  assert.match(r.out, /Backup: /);
  const rows = readSave(f.savePath, (db) => listItems(db));
  assert.deepEqual(rows.map((i) => i.stackSize), [500, 200]);
});

test("give reports a partial result when the backpack is short of slots", async (t) => {
  const f = fixture(t, { slots: 1 });
  const r = await run(f, ["--save", f.savePath, "give", "AzuriteOre", "700"]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /Added 500 of the requested 700/);
});

test("give --dry-run says what would happen instead of what happened", async (t) => {
  const f = fixture(t, { slots: 5 });
  const before = readFileSync(f.savePath);
  const r = await run(f, ["--save", f.savePath, "--dry-run", "give", "Copper Ore", "700"]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /Would add 700 Copper Ore \(AzuriteOre\) in 2 stack\(s\)/);
  assert.match(r.out, /Dry run: nothing was written/);
  assert.deepEqual(readFileSync(f.savePath), before);
});

test("give --dry-run reports a partial result with would-add wording", async (t) => {
  const f = fixture(t, { slots: 1 });
  const r = await run(f, ["--save", f.savePath, "--dry-run", "give", "AzuriteOre", "700"]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /Would add 500 of the requested 700/);
});

test("give uses --stack for items the catalogue has no stack size for", async (t) => {
  const f = fixture(t, { slots: 5 });
  const r = await run(f, ["--save", f.savePath, "give", "SolarisCoin", "250", "--stack", "100"]);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(readSave(f.savePath, (db) => listItems(db)).map((i) => i.stackSize), [100, 100, 50]);
});

test("give refuses gear", async (t) => {
  const f = fixture(t);
  const before = readFileSync(f.savePath);
  const r = await run(f, ["--save", f.savePath, "give", "T6_Augment_Acuracy1", "1"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /only resources and consumables/);
  assert.deepEqual(readFileSync(f.savePath), before);
});

test("solari add and set change the credit balance", async (t) => {
  const f = fixture(t, { solari: 1000 });
  let r = await run(f, ["--save", f.savePath, "solari", "add", "-50"]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /Solari credit: 1000 → 950/);
  r = await run(f, ["--save", f.savePath, "solari", "set", "5000"]);
  assert.match(r.out, /950 → 5000/);
  assert.equal(readSave(f.savePath, getSolari), 5000);
});

test("remove takes items out by row id", async (t) => {
  const f = fixture(t, { items: [{ id: 10, position: 0, templateId: "Stone", stackSize: 100 }] });
  const r = await run(f, ["--save", f.savePath, "remove", "10", "40"]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /Removed 40 Granite Stone; 60 left/);
});

test("--dry-run writes nothing", async (t) => {
  const f = fixture(t, { solari: 1000 });
  const before = readFileSync(f.savePath);
  const r = await run(f, ["--save", f.savePath, "--dry-run", "solari", "set", "1"]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /Dry run: nothing was written/);
  assert.deepEqual(readFileSync(f.savePath), before);
});

test("writes are refused while the game is running", async (t) => {
  const f = fixture(t, { solari: 1000 });
  const r = await run(f, ["--save", f.savePath, "solari", "set", "1"], { listProcesses: gameRunning });
  assert.equal(r.code, 1);
  assert.match(r.err, /Close the game first/);
});

test("backups lists them and restore brings one back", async (t) => {
  const f = fixture(t, { solari: 1000 });
  let r = await run(f, ["--save", f.savePath, "backups"]);
  assert.match(r.out, /No backups yet/);
  await run(f, ["--save", f.savePath, "solari", "set", "1"]);
  r = await run(f, ["--save", f.savePath, "backups"]);
  const name = r.out.trim().split("\n")[0];
  r = await run(f, ["--save", f.savePath, "restore", name]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, new RegExp(`Restored ${name}`));
  assert.equal(readSave(f.savePath, getSolari), 1000);
});

test("restore --dry-run validates the name like a real restore would", async (t) => {
  const f = fixture(t, { solari: 1000 });
  const r = await run(f, ["--save", f.savePath, "--dry-run", "restore", "nope"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /No backup called/);
});

test("restore --dry-run reports what it would do for a real backup", async (t) => {
  const f = fixture(t, { solari: 1000 });
  await run(f, ["--save", f.savePath, "solari", "set", "1"]);
  const name = (await run(f, ["--save", f.savePath, "backups"])).out.trim().split("\n")[0];
  const r = await run(f, ["--save", f.savePath, "--dry-run", "restore", name]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, new RegExp(`Dry run: would restore ${name}`));
  assert.equal(readSave(f.savePath, getSolari), 1);
});

test("restore handles leftInPlace files", async (t) => {
  const f = fixture(t, { solari: 1000 });
  // Make a backup by performing an edit
  await run(f, ["--save", f.savePath, "solari", "set", "1"]);
  const backupName = (await run(f, ["--save", f.savePath, "backups"])).out.trim().split("\n")[0];

  // Write a file that's not in the backup
  const newFile = join(f.saveDir, "autosave", "9.bak");
  writeFileSync(newFile, "new-bytes");

  // Restore the backup
  const r = await run(f, ["--save", f.savePath, "restore", backupName]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /Kept files that are not in that backup:/);
  assert.match(r.out, /  autosave\/9\.bak/);
});
